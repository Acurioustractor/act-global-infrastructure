#!/usr/bin/env node
/**
 * Telegram daily-focus push — runs every morning (7:30am AEST) and sends a
 * compact, phone-readable summary of what needs Ben's eyes today.
 *
 * Different audience than notion-money-alerts (this is the broader cockpit,
 * money alerts is exceptions-only). Designed to be glanced at over coffee.
 *
 * Sections (in order):
 *   - 🔴 Action items flagged THIS WEEK (top 5)
 *   - 💸 Receivables (open total, top 3 overdue)
 *   - ⚠️ Funder Cadence FAIL orgs
 *   - 📞 Re-engage candidates (PASS-cadence orgs silent 30+ days)
 *
 * Non-spammy: caps at 5 items per section, total under 4000 chars.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_AUTHORIZED_USERS
 *   NOTION_MIRROR_TOKEN + DB IDs
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/telegram-daily-focus.mjs           # dry-run, prints message
 *   node scripts/telegram-daily-focus.mjs --apply
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
await import(join(__dirname, 'lib/load-env.mjs'));
const { sendTelegram } = await import(join(__dirname, 'lib/telegram.mjs'));

const APPLY = process.argv.includes('--apply');
const TOKEN = process.env.NOTION_MIRROR_TOKEN;
const ORGS_DB = process.env.NOTION_ORGANISATIONS_DB_ID;
const ACTIONS_DB = process.env.NOTION_ACTION_ITEMS_DB_ID;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();
process.env.TELEGRAM_CHAT_ID = TG_CHAT; // sendTelegram reads this

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const DAY = 24 * 3600 * 1000;
const daysAgo = ts => Math.floor((Date.now() - new Date(ts).getTime()) / DAY);

let lastN = 0;
async function nfetch(path, init = {}) {
  const dt = Date.now() - lastN; if (dt < 350) await new Promise(r => setTimeout(r, 350 - dt)); lastN = Date.now();
  const r = await fetch(`https://api.notion.com/v1${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json', ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`Notion ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

async function queryAll(db, body = {}) {
  const out = []; let cursor = null;
  while (true) {
    const b = { ...body, page_size: 100 };
    if (cursor) b.start_cursor = cursor;
    const d = await nfetch(`/databases/${db}/query`, { method: 'POST', body: JSON.stringify(b) });
    out.push(...d.results);
    if (!d.has_more) break; cursor = d.next_cursor;
  }
  return out;
}

console.log(`telegram-daily-focus — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// 1. Action items THIS WEEK, not done
const actions = await queryAll(ACTIONS_DB, {
  filter: {
    and: [
      { property: 'Priority', select: { equals: 'This week' } },
      { property: 'Status', select: { does_not_equal: 'Done' } },
      { property: 'Status', select: { does_not_equal: 'Cancelled' } },
    ],
  },
});
const actionLines = actions.map(r => ({
  text: r.properties['Action']?.title?.[0]?.plain_text || '',
  owner: r.properties['Owner']?.select?.name || '?',
  status: r.properties['Status']?.select?.name || 'To do',
})).filter(a => a.text);

// 2. Receivables
const { data: overdueAll } = await supabase
  .from('xero_invoices')
  .select('contact_name, invoice_number, amount_due, due_date')
  .eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0)
  .order('amount_due', { ascending: false });
const openTotal = (overdueAll || []).reduce((s, i) => s + Number(i.amount_due), 0);
const overdue = (overdueAll || []).filter(i => i.due_date < new Date().toISOString().slice(0, 10));

// 3. FAIL orgs
const failOrgs = await queryAll(ORGS_DB, { filter: { property: 'Funder Cadence', select: { equals: 'FAIL' } } });
const failLines = failOrgs.map(r => ({
  name: r.properties['Name']?.title?.[0]?.plain_text || '',
  outstanding: r.properties['Outstanding (Xero)']?.number || 0,
  openPipe: r.properties['Open Pipeline Value']?.number || 0,
}));

// 4. Re-engage — PASS orgs silent 30+ days with open pipeline
const allPassOrgs = await queryAll(ORGS_DB, {
  filter: {
    and: [
      { property: 'Funder Cadence', select: { equals: 'PASS' } },
      { property: 'Open Pipeline Value', number: { greater_than: 0 } },
    ],
  },
});
const reEngage = allPassOrgs
  .map(r => ({
    name: r.properties['Name']?.title?.[0]?.plain_text || '',
    openPipe: r.properties['Open Pipeline Value']?.number || 0,
    lastContact: r.properties['Last Contact']?.date?.start || null,
  }))
  .filter(o => o.lastContact && daysAgo(o.lastContact) > 30)
  .sort((a, b) => b.openPipe - a.openPipe);

// ─── Build message ────────────────────────────────────────────────
const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
const lines = [
  `*🎯 ACT Focus — ${today}*`,
  '',
];

if (actionLines.length > 0) {
  lines.push('*🔴 This week*');
  for (const a of actionLines.slice(0, 5)) {
    lines.push(`• \`${a.owner}\` ${a.text}`);
  }
  if (actionLines.length > 5) lines.push(`_…${actionLines.length - 5} more in Action Items_`);
  lines.push('');
}

if (overdue.length > 0) {
  lines.push(`*💸 Receivables: ${fmt(openTotal)} open · ${overdue.length} overdue*`);
  for (const i of overdue.slice(0, 3)) {
    lines.push(`• ${fmt(i.amount_due)} · ${i.contact_name?.slice(0, 35)} · ${i.invoice_number} · ${daysAgo(i.due_date)}d`);
  }
  lines.push('');
}

if (failLines.length > 0) {
  lines.push('*⚠️ FAIL cadence*');
  for (const o of failLines.slice(0, 5)) {
    lines.push(`• ${o.name} · pipe ${fmt(o.openPipe)} · open ${fmt(o.outstanding)}`);
  }
  lines.push('');
}

if (reEngage.length > 0) {
  lines.push(`*📞 Re-engage (PASS, silent 30d+)*`);
  for (const o of reEngage.slice(0, 5)) {
    lines.push(`• ${fmt(o.openPipe)} · ${o.name} · ${daysAgo(o.lastContact)}d silent`);
  }
  lines.push('');
}

lines.push(`_Full view: notion.so/Today's Focus_`);

const message = lines.join('\n').slice(0, 4000); // Telegram message limit

console.log('---\n' + message + '\n---');

if (!APPLY) {
  console.log('\nRe-run with --apply to send.');
  process.exit(0);
}

if (!TG_CHAT) { console.error('No TELEGRAM_AUTHORIZED_USERS configured'); process.exit(1); }

const ok = await sendTelegram(message);
console.log(ok ? 'Sent.' : 'Failed.');
