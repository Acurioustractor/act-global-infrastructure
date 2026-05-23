#!/usr/bin/env node
/**
 * Daily nudge: Telegram alert for supporters that need a reply.
 *
 * Triggers:
 *   - CRITICAL outstanding ($50K+) + 14+ days since last touch
 *   - WARM tier + 60+ days since last touch
 *   - Any supporter with 3+ unanswered inbound emails (waiting_for_response)
 *
 * Read-only — does not write to GHL or Notion. Just nudges Ben.
 *
 * Dedup: same nudge content within 24h is suppressed.
 *
 * Cron: 07:15 AEST after the 06:00/06:10/06:15 builds.
 *
 * Plan: act-communication-pipeline-2026-05-23-locked § unified supporter view
 */

import 'dotenv/config';
import { sendTelegram, buildInlineKeyboard } from './lib/telegram.mjs';
import { alertHash, shouldSend, markSent } from './lib/telegram-dedup.mjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function daysAgo(at) {
  if (!at) return null;
  return Math.floor((Date.now() - new Date(at).getTime()) / 86400_000);
}

async function main() {
  console.log('🔔 Building supporters nudge...\n');

  // Pull supporters + comms summary
  const [{ data: supporters }, { data: comms }] = await Promise.all([
    supabase.from('supporters_intelligence').select('*').order('outstanding_aud', { ascending: false }),
    supabase.from('supporter_comms_summary').select('*').limit(2000),
  ]);

  const commsByDomain = new Map((comms || []).map(c => [c.domain, c]));

  function domainFor(s) {
    if (!s.primary_email) return null;
    const first = s.primary_email.split(',')[0].trim();
    return first.split('@')[1]?.toLowerCase() || null;
  }

  const critical = [];   // CRITICAL outstanding + 14+ days silent
  const warmFading = []; // WARM tier + 60+ days silent
  const inboundLoad = []; // 3+ unanswered inbound

  for (const s of (supporters || [])) {
    const c = commsByDomain.get(domainFor(s));
    const lastTouch = c?.last_touch_at || s.last_communicated_at;
    const days = daysAgo(lastTouch);
    const waiting = c?.waiting_for_response_count || 0;

    if (s.outstanding_alert === 'CRITICAL' && (days === null || days > 14)) {
      critical.push({ name: s.name, outstanding: s.outstanding_aud, days, waiting });
    }
    if (s.tier === 'WARM' && days !== null && days > 60) {
      warmFading.push({ name: s.name, days, waiting });
    }
    if (waiting >= 3) {
      inboundLoad.push({ name: s.name, waiting, days });
    }
  }

  if (critical.length === 0 && warmFading.length === 0 && inboundLoad.length === 0) {
    console.log('✓ Nothing to nudge. All supporters in the clear.');
    return;
  }

  // Build message
  const lines = [];
  lines.push(`*🔔 Supporters needing reply*`);
  lines.push(``);

  if (critical.length) {
    lines.push(`*🟥 Critical outstanding + silent 14d+:*`);
    for (const c of critical) {
      const daysStr = c.days === null ? 'never touched' : `${c.days}d silent`;
      lines.push(`  • ${c.name} — $${Math.round(c.outstanding).toLocaleString()}, ${daysStr}${c.waiting ? `, ${c.waiting} waiting reply` : ''}`);
    }
    lines.push(``);
  }

  if (warmFading.length) {
    lines.push(`*🟡 Warm relationships fading (60d+ silent):*`);
    for (const w of warmFading) {
      lines.push(`  • ${w.name} — ${w.days}d silent${w.waiting ? `, ${w.waiting} waiting` : ''}`);
    }
    lines.push(``);
  }

  if (inboundLoad.length) {
    lines.push(`*📬 3+ unanswered inbound:*`);
    for (const i of inboundLoad.slice(0, 5)) {
      lines.push(`  • ${i.name} — ${i.waiting} waiting${i.days != null ? `, last seen ${i.days}d ago` : ''}`);
    }
    if (inboundLoad.length > 5) lines.push(`  ...and ${inboundLoad.length - 5} more`);
    lines.push(``);
  }

  lines.push(`👉 [Open supporters view](https://command.act.place/supporters)`);

  const message = lines.join('\n');

  // Dedup: same content within 24h
  const hash = alertHash('supporters-nudge', critical.length, warmFading.length, inboundLoad.length,
    [...critical, ...warmFading, ...inboundLoad].map(x => x.name).sort().join('|'));
  if (!await shouldSend('supporters-nudge', hash, { ttlHours: 20 })) {
    console.log(`[suppressed] same nudge content sent within 20h`);
    return;
  }

  const replyMarkup = buildInlineKeyboard([
    [{ text: '🔇 Mute 24h', callback_data: 'mute:24h:supporters-nudge' },
     { text: '📅 Mute 7d',   callback_data: 'mute:7d:supporters-nudge' }],
  ]);

  await sendTelegram(message, { parseMode: 'Markdown', replyMarkup });
  await markSent('supporters-nudge', hash, { ttlHours: 20 });
  console.log(`✓ Nudge sent — ${critical.length} critical · ${warmFading.length} warm-fading · ${inboundLoad.length} inbound-load`);
}

main().catch(e => { console.error('Nudge failed:', e); process.exit(1); });
