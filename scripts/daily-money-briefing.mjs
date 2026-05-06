#!/usr/bin/env node
/**
 * Daily Money Briefing — pushed to Telegram every morning + appends to a Notion page.
 *
 * Includes BOTH wins and burns (vs telegram-money-alerts.mjs which is silent on quiet days).
 * Always sends — gives you a single 30-second scan.
 *
 * Cron: daily 8am AEST (before the Mon refresh stack at 9am).
 */

import { Client } from '@notionhq/client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await import(join(__dirname, '../lib/load-env.mjs'));

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const cfgPath = join(__dirname, '..', 'config', 'notion-database-ids.json');
const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = (process.env.TELEGRAM_AUTHORIZED_USERS || '').split(',')[0]?.trim();

const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const fmt = (n) => `$${Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;

async function fetchBriefingData() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [
    { data: bank },
    { data: paidYesterday },
    { data: newOpps },
    { data: overdueTop },
    { data: dueThisWeek },
    { data: openActions },
    { data: spend90 },
  ] = await Promise.all([
    supabase.from('xero_bank_accounts').select('name, current_balance').eq('type', 'BANK').eq('status', 'ACTIVE'),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_paid, fully_paid_date').eq('type', 'ACCREC').gt('amount_paid', 0).gte('updated_at', yesterday).order('amount_paid', { ascending: false }).limit(5),
    supabase.from('ghl_opportunities').select('name, monetary_value, pipeline_name, pile').eq('status', 'open').gte('ghl_created_at', yesterday).order('monetary_value', { ascending: false, nullsFirst: false }).limit(5),
    supabase.from('xero_invoices').select('invoice_number, contact_name, amount_due, due_date').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).lt('due_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).order('amount_due', { ascending: false }).limit(3),
    supabase.from('xero_invoices').select('amount_due').eq('type', 'ACCREC').eq('status', 'AUTHORISED').gt('amount_due', 0).gte('due_date', new Date().toISOString().slice(0, 10)).lte('due_date', new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)),
    cfg.actionItemsDataSource ? notion.dataSources.query({ data_source_id: cfg.actionItemsDataSource, page_size: 100, filter: { property: 'Status', select: { does_not_equal: 'Done' } } }).then(r => ({ data: r.results })) : Promise.resolve({ data: [] }),
    supabase.from('xero_transactions').select('total').eq('type', 'SPEND').eq('status', 'AUTHORISED').gte('date', new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)),
  ]);

  const tradingBal = (bank || []).filter(a => /everyday|maximiser/i.test(a.name)).reduce((s, a) => s + Number(a.current_balance || 0), 0);
  const monthlyBurn = (spend90 || []).reduce((s, t) => s + Number(t.total || 0), 0) / 3;
  const runway = monthlyBurn > 0 ? tradingBal / monthlyBurn : 999;
  const expectedThisWeek = (dueThisWeek || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);
  const overdueTotal = (overdueTop || []).reduce((s, i) => s + Number(i.amount_due || 0), 0);

  // Critical/High priority actions
  const criticalActions = (openActions || []).filter(a => {
    const p = a.properties?.Priority?.select?.name;
    return p === 'Critical' || p === 'High';
  }).slice(0, 3).map(a => ({
    name: a.properties?.Task?.title?.[0]?.plain_text || a.properties?.Name?.title?.[0]?.plain_text,
    due: a.properties?.Due?.date?.start,
    priority: a.properties?.Priority?.select?.name,
  }));

  return { tradingBal, runway, monthlyBurn, paidYesterday, newOpps, overdueTop, expectedThisWeek, overdueTotal, criticalActions, chainHealth: fetchChainHealth() };
}

function fetchChainHealth() {
  if (new Date().getDay() !== 1) return null; // Monday only
  try {
    const out = execSync('pm2 jlist 2>/dev/null', { encoding: 'utf8', timeout: 5000 });
    const procs = JSON.parse(out);
    if (procs.length === 0) {
      return { error: 'PM2 has zero processes registered. Run `pm2 start ecosystem.config.cjs && pm2 save`.' };
    }
    const failures = procs
      .filter(p => {
        const exit = p.pm2_env?.exit_code;
        return exit !== null && exit !== undefined && exit !== 0;
      })
      .map(p => ({ name: p.name, exit_code: p.pm2_env?.exit_code, status: p.pm2_env?.status }));
    return { count: procs.length, failures };
  } catch (err) {
    return { error: `PM2 query failed: ${err.message?.slice(0, 80)}` };
  }
}

function buildMessage(d) {
  const lines = [];
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

  lines.push(`*ACT Money — ${today}*`);
  lines.push('');
  lines.push(`💰 Bank: ${fmt(d.tradingBal)}  ·  🛬 Runway: ${d.runway.toFixed(1)}mo  ·  📅 Due this week: ${fmt(d.expectedThisWeek)}`);
  lines.push('');

  // Wins (yesterday's paid invoices)
  if (d.paidYesterday && d.paidYesterday.length > 0) {
    lines.push(`✅ *Yesterday's wins*`);
    for (const p of d.paidYesterday.slice(0, 5)) {
      lines.push(`   ${fmt(p.amount_paid)} ${p.invoice_number} ${p.contact_name?.slice(0, 30)}`);
    }
    lines.push('');
  }

  // New pipeline
  if (d.newOpps && d.newOpps.length > 0) {
    lines.push(`✨ *New pipeline*`);
    for (const o of d.newOpps.slice(0, 3)) {
      lines.push(`   ${fmt(o.monetary_value || 0)} ${o.name?.slice(0, 40)} (${o.pipeline_name?.slice(0, 20)})`);
    }
    lines.push('');
  }

  // Overdue
  if (d.overdueTop && d.overdueTop.length > 0) {
    lines.push(`🟠 *Top overdue*`);
    for (const o of d.overdueTop.slice(0, 3)) {
      const days = Math.floor((new Date() - new Date(o.due_date)) / 86400000);
      lines.push(`   ${fmt(o.amount_due)} ${o.invoice_number} ${o.contact_name?.slice(0, 25)} (${days}d)`);
    }
    lines.push('');
  }

  // Critical actions
  if (d.criticalActions && d.criticalActions.length > 0) {
    lines.push(`🎯 *Critical/High priority today*`);
    for (const a of d.criticalActions) {
      lines.push(`   [${a.priority}] ${a.name?.slice(0, 60)}${a.due ? ` (due ${a.due})` : ''}`);
    }
    lines.push('');
  }

  // Mon-only chain integrity
  if (d.chainHealth) {
    if (d.chainHealth.error) {
      lines.push(`🚨 *Mon chain integrity*`);
      lines.push(`   ${d.chainHealth.error}`);
      lines.push('');
    } else if (d.chainHealth.failures.length > 0) {
      lines.push(`🚨 *Mon chain — ${d.chainHealth.failures.length} cron failures*`);
      for (const f of d.chainHealth.failures.slice(0, 5)) {
        lines.push(`   ${f.name} exit=${f.exit_code} (${f.status})`);
      }
      lines.push('');
    } else {
      lines.push(`✅ Mon chain: all ${d.chainHealth.count} cron processes clean`);
      lines.push('');
    }
  }

  // Closing
  lines.push(`_Open dashboard: notion.so/357ebcf981cf8101bc12dd5eab9ebec5_`);

  return lines.join('\n');
}

async function sendTelegram(text) {
  if (!TG_TOKEN || !TG_CHAT) {
    log('TELEGRAM creds not set — printing only');
    log('\n' + text);
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'Markdown' }),
  });
  if (!res.ok) throw new Error(`TG ${res.status}: ${await res.text()}`);
  log('✓ Sent to Telegram');
  return true;
}

async function main() {
  log('=== Daily Money Briefing ===');
  const data = await fetchBriefingData();
  const message = buildMessage(data);
  log(`\n${message}\n`);
  await sendTelegram(message);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
