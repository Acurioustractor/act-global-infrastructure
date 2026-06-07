#!/usr/bin/env node
/**
 * Finance Daily Briefing
 *
 * Generates a daily finance action summary and sends it to Telegram.
 * Designed to tell Ben/Nick exactly what needs attention today/this week.
 *
 * Sections:
 *   1. URGENT — overdue invoices, missing BAS data, stuck items
 *   2. THIS WEEK — untagged transactions, missing receipts, vendor gaps
 *   3. GOOD NEWS — R&D tracking, savings, coverage improvements
 *   4. OPTIMIZE — cost reduction opportunities, consolidation tips
 *   5. KEY DATES — BAS due, FBT, EOFY milestones
 *
 * Usage:
 *   node scripts/finance-daily-briefing.mjs              # Generate + send to Telegram
 *   node scripts/finance-daily-briefing.mjs --dry-run    # Print only, don't send
 *   node scripts/finance-daily-briefing.mjs --json       # Output JSON for Notion
 */

import '../lib/load-env.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const JSON_MODE = args.includes('--json');

// ── Helpers ──────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

function formatMoney(n) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

function getQuarterInfo() {
  const now = new Date();
  const month = now.getMonth();
  let q, fyYear;
  if (month >= 6 && month <= 8) { q = 1; fyYear = now.getFullYear() + 1; }
  else if (month >= 9 && month <= 11) { q = 2; fyYear = now.getFullYear() + 1; }
  else if (month >= 0 && month <= 2) { q = 3; fyYear = now.getFullYear(); }
  else { q = 4; fyYear = now.getFullYear(); }

  // BAS due: 28th of month after quarter ends
  const quarterEndMonths = [9, 12, 3, 6];
  const endMonth = quarterEndMonths[q - 1];
  const dueMonth = endMonth + 1 > 12 ? 1 : endMonth + 1;
  const dueYear = dueMonth === 1 ? (endMonth === 12 ? fyYear - 1 : fyYear) + 1 : fyYear;
  const basDue = `${dueYear}-${String(dueMonth).padStart(2, '0')}-28`;

  return { label: `Q${q} FY${String(fyYear).slice(2)}`, quarter: q, fyYear, basDue };
}

// ── Data Fetchers ────────────────────────────────────────────────────────

async function fetchUrgent() {
  const today = todayStr();
  const items = [];

  // Overdue invoices
  const { data: overdue, count: overdueCount } = await supabase
    .from('xero_invoices')
    .select('contact_name, amount_due, due_date', { count: 'exact' })
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'SENT'])
    .lt('due_date', today)
    .order('amount_due', { ascending: false })
    .limit(5);

  if (overdueCount > 0) {
    const totalOverdue = (overdue || []).reduce((s, i) => s + Math.abs(Number(i.amount_due) || 0), 0);
    const topNames = (overdue || []).slice(0, 3).map(i => i.contact_name).join(', ');
    items.push({
      priority: 'critical',
      text: `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} (${formatMoney(totalOverdue)}) — ${topNames}`,
      action: 'Chase payments today',
    });
  }

  // BAS deadline proximity
  const qi = getQuarterInfo();
  const basDays = daysUntil(qi.basDue);
  if (basDays <= 14 && basDays > 0) {
    items.push({
      priority: 'critical',
      text: `BAS ${qi.label} due in ${basDays} days (${qi.basDue})`,
      action: 'Ensure all receipts and tags are up to date',
    });
  }

  // Sync freshness
  const { data: syncs } = await supabase
    .from('sync_status')
    .select('integration_name, last_success_at')
    .in('integration_name', ['xero_bank_transactions', 'xero_invoices']);

  for (const sync of syncs || []) {
    if (!sync.last_success_at) continue;
    const hours = (Date.now() - new Date(sync.last_success_at).getTime()) / 3600000;
    if (hours > 48) {
      items.push({
        priority: 'high',
        text: `${sync.integration_name.replace(/_/g, ' ')} sync stale (${Math.round(hours)}h ago)`,
        action: 'Check PM2 cron status',
      });
    }
  }

  return items;
}

async function fetchThisWeek() {
  const items = [];

  // Untagged transactions
  const { count: untaggedCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .is('project_code', null)
    .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")');

  if (untaggedCount > 0) {
    // Get untagged value
    const { data: untaggedData } = await supabase
      .from('xero_transactions')
      .select('total')
      .is('project_code', null)
      .not('type', 'in', '("SPEND-TRANSFER","RECEIVE-TRANSFER")');

    const untaggedValue = (untaggedData || []).reduce((s, t) => s + Math.abs(Number(t.total) || 0), 0);
    items.push({
      text: `${untaggedCount} untagged transactions (${formatMoney(untaggedValue)})`,
      action: 'Run tagger or review in /finance/reconciliation',
      minutes: Math.ceil(untaggedCount / 10),
    });
  }

  // Missing receipts
  const { count: missingCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .in('type', ['SPEND', 'ACCPAY'])
    .or('has_attachments.is.null,has_attachments.eq.false');

  if (missingCount > 0) {
    items.push({
      text: `${missingCount} spend transactions missing receipts`,
      action: 'Check Dext forwarding, review in /finance/flow',
      minutes: Math.ceil(missingCount / 5),
    });
  }

  // Vendor gaps (Dext vendors with no rules)
  const { data: dextVendors } = await supabase
    .from('dext_receipts')
    .select('vendor_name')
    .is('xero_transaction_id', null)
    .not('vendor_name', 'eq', 'Unknown Supplier');

  const unmatchedVendors = [...new Set((dextVendors || []).map(d => d.vendor_name))];
  if (unmatchedVendors.length > 5) {
    items.push({
      text: `${unmatchedVendors.length} Dext receipts unmatched to Xero`,
      action: 'Improve vendor name mapping',
      minutes: 15,
    });
  }

  // Stuck pipeline items
  const { count: stuckCount } = await supabase
    .from('receipt_pipeline_status')
    .select('*', { count: 'exact', head: true })
    .eq('stage', 'dext_processed')
    .lt('transaction_date', daysAgo(14));

  if (stuckCount > 0) {
    items.push({
      text: `${stuckCount} receipt pipeline items stuck >14 days`,
      action: 'Check Dext → Xero publish status',
      minutes: stuckCount * 3,
    });
  }

  return items;
}

async function fetchGoodNews() {
  const items = [];

  // Tag coverage
  const { count: totalCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true });
  const { count: taggedCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .not('project_code', 'is', null);

  const tagPct = totalCount > 0 ? Math.round((taggedCount / totalCount) * 100) : 0;
  items.push({ text: `Tag coverage: ${tagPct}% (${taggedCount}/${totalCount})` });

  // R&D spend
  const { data: rdRules } = await supabase
    .from('vendor_project_rules')
    .select('vendor_name')
    .eq('rd_eligible', true);

  const rdVendorNames = new Set((rdRules || []).map(r => r.vendor_name));

  const fyStart = new Date().getMonth() >= 6
    ? `${new Date().getFullYear()}-07-01`
    : `${new Date().getFullYear() - 1}-07-01`;

  const { data: rdTx } = await supabase
    .from('xero_transactions')
    .select('contact_name, total')
    .in('type', ['SPEND', 'ACCPAY'])
    .gte('date', fyStart);

  let rdSpend = 0;
  for (const tx of rdTx || []) {
    if (rdVendorNames.has(tx.contact_name)) {
      rdSpend += Math.abs(Number(tx.total) || 0);
    }
  }

  const offset = Math.round(rdSpend * 0.435);
  items.push({
    text: `R&D spend: ${formatMoney(rdSpend)} → ${formatMoney(offset)} projected offset (43.5%)`,
  });

  // Reconciliation rate
  const { count: reconCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('is_reconciled', true);

  const reconPct = totalCount > 0 ? Math.round((reconCount / totalCount) * 100) : 0;
  items.push({ text: `Reconciliation: ${reconPct}% (${reconCount}/${totalCount})` });

  // Dext receipts imported
  const { count: dextCount } = await supabase
    .from('dext_receipts')
    .select('*', { count: 'exact', head: true });
  const { count: matchedCount } = await supabase
    .from('dext_receipts')
    .select('*', { count: 'exact', head: true })
    .not('xero_transaction_id', 'is', null);

  items.push({ text: `Dext receipts: ${dextCount} imported, ${matchedCount} matched to Xero` });

  // Active subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('monthly_cost')
    .eq('status', 'active');

  const monthlySpend = (subs || []).reduce((s, sub) => s + (sub.monthly_cost || 0), 0);
  items.push({ text: `Subscriptions: ${(subs || []).length} active (${formatMoney(monthlySpend)}/mo)` });

  return items;
}

async function fetchOptimize() {
  const items = [];

  // Subscription consolidation
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('name, monthly_cost, category')
    .eq('status', 'active');

  const catCounts = {};
  for (const sub of subs || []) {
    const cat = sub.category || 'Other';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(catCounts)) {
    if (count >= 3 && cat !== 'Other') {
      items.push({ text: `${count} subscriptions in "${cat}" — consolidate?` });
    }
  }

  // Month-over-month spend change
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastMonth = new Date(now);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStart = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const { data: thisMonthData } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .gte('date', thisMonthStart);

  const { data: lastMonthData } = await supabase
    .from('xero_transactions')
    .select('total')
    .in('type', ['SPEND', 'ACCPAY'])
    .gte('date', lastMonthStart)
    .lt('date', thisMonthStart);

  const thisTotal = (thisMonthData || []).reduce((s, t) => s + Math.abs(Number(t.total) || 0), 0);
  const lastTotal = (lastMonthData || []).reduce((s, t) => s + Math.abs(Number(t.total) || 0), 0);

  if (lastTotal > 0) {
    const change = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
    if (change > 20) {
      items.push({ text: `Spending up ${change}% this month (${formatMoney(thisTotal)} vs ${formatMoney(lastTotal)})` });
    } else if (change < -10) {
      items.push({ text: `Spending down ${Math.abs(change)}% this month — nice work` });
    }
  }

  return items;
}

function getKeyDates() {
  const qi = getQuarterInfo();
  const now = new Date();
  const fyYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const dates = [];

  // BAS
  const basDays = daysUntil(qi.basDue);
  if (basDays > 0 && basDays <= 90) {
    dates.push({ date: qi.basDue, label: `BAS ${qi.label}`, daysLeft: basDays });
  }

  // FBT (21 June)
  const fbtDate = `${fyYear}-06-21`;
  const fbtDays = daysUntil(fbtDate);
  if (fbtDays > 0 && fbtDays <= 120) {
    dates.push({ date: fbtDate, label: 'FBT return', daysLeft: fbtDays });
  }

  // EOFY (30 June)
  const eofyDate = `${fyYear}-06-30`;
  const eofyDays = daysUntil(eofyDate);
  if (eofyDays > 0 && eofyDays <= 150) {
    dates.push({ date: eofyDate, label: 'EOFY', daysLeft: eofyDays });
  }

  // Tax return (31 Oct for companies using tax agent)
  const taxDate = `${fyYear}-10-31`;
  const taxDays = daysUntil(taxDate);
  if (taxDays > 0 && taxDays <= 90) {
    dates.push({ date: taxDate, label: 'Tax return (agent)', daysLeft: taxDays });
  }

  return dates.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ── Format Message ───────────────────────────────────────────────────────

function formatMessage(urgent, thisWeek, goodNews, optimize, keyDates) {
  const dayName = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
  const lines = [`📊 *Finance Briefing — ${dayName}*\n`];

  // URGENT
  if (urgent.length > 0) {
    lines.push('🔴 *URGENT*');
    for (const item of urgent) {
      lines.push(`• ${item.text}`);
      if (item.action) lines.push(`  → _${item.action}_`);
    }
    lines.push('');
  }

  // THIS WEEK
  if (thisWeek.length > 0) {
    lines.push('🟡 *THIS WEEK*');
    const totalMin = thisWeek.reduce((s, i) => s + (i.minutes || 0), 0);
    for (const item of thisWeek) {
      const time = item.minutes ? ` (~${item.minutes}min)` : '';
      lines.push(`• ${item.text}${time}`);
      if (item.action) lines.push(`  → _${item.action}_`);
    }
    if (totalMin > 0) {
      lines.push(`  ⏱ Total estimated: ~${totalMin}min`);
    }
    lines.push('');
  }

  // GOOD NEWS
  if (goodNews.length > 0) {
    lines.push('🟢 *STATUS*');
    for (const item of goodNews) {
      lines.push(`• ${item.text}`);
    }
    lines.push('');
  }

  // OPTIMIZE
  if (optimize.length > 0) {
    lines.push('💡 *OPTIMIZE*');
    for (const item of optimize) {
      lines.push(`• ${item.text}`);
    }
    lines.push('');
  }

  // KEY DATES
  if (keyDates.length > 0) {
    lines.push('📅 *KEY DATES*');
    for (const d of keyDates) {
      const urgency = d.daysLeft <= 14 ? '⚠️ ' : '';
      lines.push(`• ${urgency}${d.label}: ${d.date} (${d.daysLeft} days)`);
    }
    lines.push('');
  }

  lines.push('_View details: /finance/flow_');

  return lines.join('\n');
}

// ── Telegram Send ────────────────────────────────────────────────────────

async function sendToTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    if (res.ok) {
      console.log('Sent to Telegram');
      return true;
    } else {
      const err = await res.text();
      console.error('Telegram send failed:', err);
      return false;
    }
  } catch (err) {
    console.error('Telegram send error:', err.message);
    return false;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Finance Daily Briefing ===\n');

  const [urgent, thisWeek, goodNews, optimize] = await Promise.all([
    fetchUrgent(),
    fetchThisWeek(),
    fetchGoodNews(),
    fetchOptimize(),
  ]);

  const keyDates = getKeyDates();

  if (JSON_MODE) {
    console.log(JSON.stringify({ urgent, thisWeek, goodNews, optimize, keyDates }, null, 2));
    return;
  }

  const message = formatMessage(urgent, thisWeek, goodNews, optimize, keyDates);

  console.log(message);
  console.log('\n---\n');

  if (DRY_RUN) {
    console.log('DRY RUN — message not sent');
    return;
  }

  await sendToTelegram(message);

  // Record to sync_status for health monitoring
  try {
    const { error } = await supabase
      .from('sync_status')
      .upsert({
        integration_name: 'finance_daily_briefing',
        status: 'success',
        last_success_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
        record_count: urgent.length + thisWeek.length + goodNews.length + optimize.length,
      }, { onConflict: 'integration_name' });

    if (error) console.warn('Could not update sync_status:', error.message);
  } catch (e) {
    // non-fatal
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
