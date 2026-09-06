/**
 * Vercel deployment webhook -> ecosystem_sites status.
 *
 * Configure in Vercel: Team Settings > Webhooks, events deployment.created,
 * deployment.succeeded, deployment.error, deployment.canceled, URL
 * https://<command-center>/api/webhooks/vercel. Put the secret in
 * VERCEL_WEBHOOK_SECRET. The daily scripts/vercel-sync.mjs reconciles anything missed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { handleVercelWebhook, verifyVercelSignature } from '@/lib/webhooks/vercel-handler.mjs';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-vercel-signature') || '';
  if (!verifyVercelSignature(body, signature, process.env.VERCEL_WEBHOOK_SECRET || '')) {
    return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  }
  let event: unknown;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  const result = await handleVercelWebhook(event, supabase);
  return NextResponse.json(result, { status: 200 });
}
