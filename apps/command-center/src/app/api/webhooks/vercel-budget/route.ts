/**
 * Vercel spend brake webhook.
 *
 * Configure in Vercel: Team Settings > Billing > Spend Management, webhook URL
 * https://<command-center>/api/webhooks/vercel-budget. Put the signing secret in
 * VERCEL_BUDGET_WEBHOOK_SECRET, and a team token that can read billing and edit
 * firewalls in VERCEL_SPEND_BRAKE_TOKEN. Leave the budget's own "pause production
 * deployments" off: it takes every site down. This brakes only the culprit project.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyVercelSignature } from '@/lib/webhooks/vercel-handler.mjs';
import {
  parseBudgetAlert,
  fetchCharges,
  rankProjects,
  decideBrake,
  applyBrake,
  brakeMessage,
} from '@/lib/webhooks/spend-brake.mjs';
import { sendNotification } from '@/lib/telegram/notifications';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-vercel-signature') || '';
  if (!verifyVercelSignature(body, signature, process.env.VERCEL_BUDGET_WEBHOOK_SECRET || '')) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const alert = parseBudgetAlert(payload);
  if (!alert) return NextResponse.json({ error: 'not a budget alert' }, { status: 400 });

  const token = process.env.VERCEL_SPEND_BRAKE_TOKEN || '';
  let decision: ReturnType<typeof decideBrake> = { brake: null, top: null, reason: 'VERCEL_SPEND_BRAKE_TOKEN not set' };
  let applied: string | undefined;
  if (token) {
    try {
      const ranked = rankProjects(await fetchCharges({ token, teamId: alert.teamId }));
      decision = decideBrake({ alert, ranked });
      if (decision.brake) applied = await applyBrake({ token, teamId: alert.teamId, projectId: decision.brake.id });
    } catch (err) {
      decision = { brake: null, top: null, reason: `could not read billing: ${(err as Error).message}` };
    }
  }

  const message = brakeMessage({ alert, decision, applied });
  const chatIds = (process.env.TELEGRAM_AUTHORIZED_USERS || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
  const sent = await Promise.allSettled(chatIds.map((id) => sendNotification(id, message)));
  const notified = sent.filter((s) => s.status === 'fulfilled').length;
  if (notified < chatIds.length) console.error('spend brake: telegram failed for some chats', sent);

  return NextResponse.json({ threshold: alert.thresholdPercent, brake: decision.brake?.name || null, applied: applied || null, notified });
}
