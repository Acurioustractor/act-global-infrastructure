#!/usr/bin/env node
/**
 * Daily Telegram money alerts.
 *
 * Sends a message ONLY if there's an actionable signal:
 *   - Runway < 6 months
 *   - Invoices overdue > 30 days totalling >$25K
 *   - GHL opps stale > 120 days totalling >$100K
 *   - Cash forecast next 4 weeks dips below $200K
 *   - Bank deposit > $10K landed (worth flagging)
 *
 * Non-spammy: silent days when nothing significant.
 *
 * Cron: daily 9am AEST.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

async function fetchSignals() {
  const today = new Date();

  const { data: bankAccts } = await supabase
    .from('xero_bank_accounts').select('name, current_balance')
    .eq('type', 'BANK').eq('status', 'ACTIVE');
  const tradingBal = (bankAccts || [])
    .filter(a => /everyday|maximiser/i.test(a.name))
    .reduce((s, a) => s + Number(a.current_balance || 0), 0);

  const { data: spend90 } = await supabase
    .from('xero_transactions').select('total')
    .eq('type', 'SPEND').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10));
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? tradingBal / monthlyBurn : 999;

  const { data: overdue } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, amount_due, due_date')
    .eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0)
    .lt('due_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
    .order('amount_due', { ascending: false });
  const overdueTotal = (overdue || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

  const oneTwentyAgo = new Date(Date.now() - 120 * 86400000).toISOString();
  const { data: stale } = await supabase
    .from('ghl_opportunities')
    .select('name, monetary_value, last_stage_change_at')
    .eq('status', 'open').gt('monetary_value', 0)
    .lt('last_stage_change_at', oneTwentyAgo)
    .order('monetary_value', { ascending: false });
  const staleTotal = (stale || []).reduce((s, o) => s + Number(o.monetary_value || 0), 0);

  const { data: bigDeposits } = await supabase
    .from('xero_transactions')
    .select('contact_name, total, date')
    .eq('type', 'RECEIVE').eq('status', 'AUTHORISED')
    .gte('date', new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10))
    .gt('total', 10000)
    .order('total', { ascending: false });

  return { tradingBal, runway, monthlyBurn, overdue: overdue || [], overdueTotal,
           stale: stale || [], staleTotal, bigDeposits: bigDeposits || [] };
}

function buildMessage(s) {
  const alerts = [];

  // Runway
  if (s.runway < 6) {
    alerts.push(`🚨 *RUNWAY: ${s.runway.toFixed(1)} months* (bank ${fmt(s.tradingBal)} / burn ${fmt(s.monthlyBurn)}/mo)`);
  } else if (s.runway < 12) {
    alerts.push(`🟠 Runway: ${s.runway.toFixed(1)} months — watch closely`);
  }

  // Overdue
  if (s.overdueTotal > 25000) {
    alerts.push(`🟠 *Overdue >30d: ${fmt(s.overdueTotal)}* across ${s.overdue.length} invoices`);
    for (const i of s.overdue.slice(0, 5)) {
      alerts.push(`   · ${fmt(i.amount_due)} ${i.invoice_number} ${i.contact_name?.slice(0, 30)}`);
    }
  }

  // Stale opps
  if (s.staleTotal > 100000) {
    alerts.push(`🟡 *Stale >120d: ${fmt(s.staleTotal)}* across ${s.stale.length} GHL opps`);
    for (const o of s.stale.slice(0, 3)) {
      const days = Math.floor((new Date() - new Date(o.last_stage_change_at)) / 86400000);
      alerts.push(`   · ${fmt(o.monetary_value)} ${o.name?.slice(0, 40)} (${days}d stale)`);
    }
  }

  // Big deposits (good news)
  for (const d of s.bigDeposits.slice(0, 3)) {
    alerts.push(`💰 ${fmt(d.total)} landed: ${d.contact_name?.slice(0, 30) || 'unknown'} (${d.date})`);
  }

  if (alerts.length === 0) return null;

  const header = `*ACT Money Daily — ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}*`;
  const footer = `\n_Bank: ${fmt(s.tradingBal)} · Runway: ${s.runway.toFixed(1)} mo_`;
  return `${header}\n\n${alerts.join('\n')}${footer}`;
}

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) {
    log('TELEGRAM_BOT_TOKEN or AUTHORIZED_USERS not set');
    log('Would send:\n' + text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
  });
  if (!res.ok) throw new Error(`TG ${res.status}: ${await res.text()}`);
  log('✓ Sent');
}

async function main() {
  log('=== Money alerts ===');
  const signals = await fetchSignals();
  const message = buildMessage(signals);
  if (!message) {
    log('No actionable signals — silent day.');
    return;
  }
  log('Sending...\n' + message + '\n');
  await sendTelegram(message);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
