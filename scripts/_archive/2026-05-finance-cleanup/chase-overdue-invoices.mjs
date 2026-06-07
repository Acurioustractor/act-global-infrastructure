#!/usr/bin/env node
/**
 * Collections Autopilot — Chase Overdue Invoices
 *
 * Automated collections system that:
 *   1. Detects DRAFT invoices that haven't been sent
 *   2. Escalates overdue invoices at 7/14/30/60/90 day thresholds
 *   3. Sends Telegram alerts for new escalations (deduped — won't repeat)
 *   4. Logs all actions to collections_actions table
 *   5. Reports summary to console
 *
 * Usage:
 *   node scripts/chase-overdue-invoices.mjs              # Full run + Telegram alerts
 *   node scripts/chase-overdue-invoices.mjs --dry-run    # Report only, no alerts/logging
 *   node scripts/chase-overdue-invoices.mjs --critical   # Only 30+ days overdue
 *   node scripts/chase-overdue-invoices.mjs --json       # JSON output for automation
 *
 * Cron: Daily 10am AEST (after Xero sync + morning briefing)
 *
 * Created: 2026-03-12 | Upgraded to autopilot: 2026-03-20
 */

import '../lib/load-env.mjs';
import { createClient } from '@supabase/supabase-js';
import { sendTelegram } from './lib/telegram.mjs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const criticalOnly = args.includes('--critical');
const jsonOutput = args.includes('--json');

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function formatMoney(n) {
  return `$${Math.abs(n).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ============================================================================
// ESCALATION LEVELS
// ============================================================================

const THRESHOLDS = [
  { minDays: 180, level: 'WRITE_OFF_DECISION', label: 'WRITE-OFF?', action: 'Decision needed: write off or send to debt recovery.' },
  { minDays: 90,  level: 'FINAL_DEMAND', label: 'FINAL DEMAND', action: 'Formal demand letter. Phone call from both founders.' },
  { minDays: 60,  level: 'ESCALATE', label: 'ESCALATE', action: 'Direct phone call from Ben. Discuss payment plan.' },
  { minDays: 30,  level: 'CHASE', label: 'CHASE', action: 'Follow-up email with invoice attached. Request payment timeline.' },
  { minDays: 14,  level: 'REMINDER_2', label: 'REMINDER', action: 'Second reminder. "Following up — is there anything blocking payment?"' },
  { minDays: 7,   level: 'REMINDER_1', label: 'NUDGE', action: 'Gentle reminder. "Just checking this is in your payment queue."' },
  { minDays: 0,   level: 'MONITOR', label: 'MONITOR', action: 'Just overdue. Monitor for 7 days before first nudge.' },
];

function getEscalation(daysOverdue) {
  for (const t of THRESHOLDS) {
    if (daysOverdue >= t.minDays) return t;
  }
  return { level: 'NOT_DUE', label: 'NOT DUE', action: 'Not yet due.' };
}

// ============================================================================
// COLLECTIONS LOG — deduplication + history
// ============================================================================

async function getRecentAlerts() {
  // Get alerts sent in the last 7 days to avoid spamming
  const { data } = await supabase
    .from('collections_actions')
    .select('invoice_number, escalation_level, created_at')
    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString())
    .order('created_at', { ascending: false });
  return data || [];
}

async function logAction(invoice, escalationLevel, actionType, detail) {
  if (DRY_RUN) return;
  await supabase.from('collections_actions').insert({
    invoice_number: invoice.invoice_number,
    contact_name: invoice.contact_name,
    amount_due: parseFloat(invoice.amount_due),
    days_overdue: invoice.daysOverdue,
    escalation_level: escalationLevel,
    action_type: actionType,
    detail,
  }).then(({ error }) => {
    if (error) log(`  Log error: ${error.message}`);
  });
}

function wasAlertedRecently(recentAlerts, invoiceNumber, level) {
  return recentAlerts.some(a =>
    a.invoice_number === invoiceNumber && a.escalation_level === level
  );
}

// ============================================================================
// DRAFT INVOICE DETECTION
// ============================================================================

async function checkDraftInvoices() {
  const { data: drafts, error } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, total, date, due_date, amount_due')
    .eq('type', 'ACCREC')
    .eq('status', 'DRAFT')
    .gt('total', 0)
    .order('total', { ascending: false });

  if (error || !drafts?.length) return [];

  const today = new Date();
  return drafts.map(d => {
    const created = new Date(d.date);
    const daysOld = Math.floor((today - created) / 86400000);
    return { ...d, daysOld };
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log('=== Collections Autopilot ===');
  if (DRY_RUN) log('DRY RUN — no alerts or logging');

  // ── 1. Check for DRAFT invoices (unsent) ──────────────────────────────
  const drafts = await checkDraftInvoices();
  const stuckDrafts = drafts.filter(d => d.daysOld >= 3);

  if (stuckDrafts.length > 0) {
    log(`\nDRAFT INVOICES (unsent):`);
    const draftLines = [];
    for (const d of stuckDrafts) {
      const line = `  ${d.invoice_number}  ${d.contact_name}  ${formatMoney(d.total)}  created ${d.date}  (${d.daysOld} days ago)`;
      log(line);
      draftLines.push(`${d.contact_name}: ${formatMoney(d.total)} (${d.daysOld}d old)`);
      await logAction(d, 'DRAFT_UNSENT', 'alert', `DRAFT invoice ${d.daysOld} days old, never sent`);
    }

    // Telegram alert for stuck DRAFTs
    if (!DRY_RUN && stuckDrafts.length > 0) {
      const totalDraft = stuckDrafts.reduce((s, d) => s + parseFloat(d.total), 0);
      await sendTelegram(
        `*UNSENT INVOICES*\n\n` +
        `${stuckDrafts.length} DRAFT invoice(s) totalling *${formatMoney(totalDraft)}* never sent:\n\n` +
        draftLines.map(l => `- ${l}`).join('\n') +
        `\n\n_Approve in Xero and send to client._`
      );
    }
  }

  // ── 2. Fetch all outstanding receivable invoices ──────────────────────
  const { data: invoices, error } = await supabase
    .from('xero_invoices')
    .select('invoice_number, contact_name, total, amount_due, due_date, date, status, reference, project_code')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'SENT'])
    .gt('amount_due', 0)
    .order('amount_due', { ascending: false });

  if (error) {
    log(`ERROR: ${error.message}`);
    process.exit(1);
  }

  if (!invoices.length) {
    log('No outstanding invoices. All clear!');
    return;
  }

  // ── 3. Calculate escalations ──────────────────────────────────────────
  const today = new Date();
  const recentAlerts = await getRecentAlerts();

  const enriched = invoices.map(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today - dueDate) / 86400000);
    const amountDue = parseFloat(inv.amount_due);
    const escalation = getEscalation(daysOverdue);
    return { ...inv, daysOverdue, amountDue, escalation };
  });

  // Group by contact
  const contacts = {};
  for (const inv of enriched) {
    const name = inv.contact_name;
    if (!contacts[name]) {
      contacts[name] = { invoices: [], totalDue: 0, maxDaysOverdue: 0, maxEscalation: null };
    }
    contacts[name].invoices.push(inv);
    contacts[name].totalDue += inv.amountDue;
    if (inv.daysOverdue > contacts[name].maxDaysOverdue) {
      contacts[name].maxDaysOverdue = inv.daysOverdue;
      contacts[name].maxEscalation = inv.escalation;
    }
  }

  const sorted = Object.entries(contacts)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.totalDue - a.totalDue);

  const overdue = sorted.filter(c => c.maxDaysOverdue > 0);
  const notYetDue = sorted.filter(c => c.maxDaysOverdue <= 0);

  // Filter if critical only
  const filtered = criticalOnly ? overdue.filter(c => c.maxDaysOverdue > 30) : overdue;

  if (jsonOutput) {
    console.log(JSON.stringify({ drafts: stuckDrafts, overdue: filtered, notYetDue }, null, 2));
    return;
  }

  // ── 4. Console report ─────────────────────────────────────────────────
  const totalOverdue = filtered.reduce((s, c) => s + c.totalDue, 0);
  const totalNotDue = notYetDue.reduce((s, c) => s + c.totalDue, 0);

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  ACT COLLECTIONS AUTOPILOT');
  console.log(`  ${new Date().toISOString().split('T')[0]}`);
  console.log('════════════════════════════════════════════════════════════');
  console.log(`  OVERDUE: ${formatMoney(totalOverdue)} across ${filtered.length} contacts`);
  console.log(`  COMING: ${formatMoney(totalNotDue)} across ${notYetDue.length} contacts (not yet due)\n`);

  for (const contact of filtered) {
    const esc = contact.maxEscalation;
    console.log('────────────────────────────────────────────────────────────');
    console.log(`  [${esc.label}] ${contact.name}`);
    console.log(`  ${formatMoney(contact.totalDue)}  |  ${contact.invoices.length} inv  |  ${contact.maxDaysOverdue}d overdue`);
    console.log(`  Action: ${esc.action}`);
    for (const inv of contact.invoices) {
      const tag = inv.daysOverdue > 0 ? `${inv.daysOverdue}d overdue` : `due in ${-inv.daysOverdue}d`;
      console.log(`    ${inv.invoice_number}  ${formatMoney(inv.amountDue)}  due ${inv.due_date}  (${tag})  ${inv.project_code || ''}`);
    }
    console.log('');
  }

  if (notYetDue.length > 0) {
    console.log('── Coming Due Soon ────────────────────────────────────────');
    for (const c of notYetDue) {
      for (const inv of c.invoices) {
        console.log(`  ${inv.contact_name}  ${formatMoney(inv.amountDue)}  due ${inv.due_date}  (in ${-inv.daysOverdue}d)  ${inv.project_code || ''}`);
      }
    }
    console.log('');
  }

  // ── 5. Telegram alerts for NEW escalations ────────────────────────────
  if (DRY_RUN) {
    log('Skipping Telegram alerts (dry run)');
    return;
  }

  // Only alert on invoices that crossed a threshold since last alert
  const newEscalations = [];
  for (const contact of filtered) {
    for (const inv of contact.invoices) {
      if (inv.daysOverdue <= 0) continue; // Not overdue yet
      if (inv.escalation.level === 'MONITOR') continue; // Too early to alert

      const alreadyAlerted = wasAlertedRecently(recentAlerts, inv.invoice_number, inv.escalation.level);
      if (!alreadyAlerted) {
        newEscalations.push(inv);
        await logAction(inv, inv.escalation.level, 'telegram_alert',
          `Escalated to ${inv.escalation.label}: ${inv.contact_name} ${formatMoney(inv.amountDue)} (${inv.daysOverdue}d overdue)`
        );
      }
    }
  }

  if (newEscalations.length > 0) {
    // Group new escalations by severity for a clean message
    const critical = newEscalations.filter(e => e.daysOverdue >= 60);
    const warning = newEscalations.filter(e => e.daysOverdue >= 14 && e.daysOverdue < 60);
    const nudge = newEscalations.filter(e => e.daysOverdue >= 7 && e.daysOverdue < 14);

    let msg = `*COLLECTIONS UPDATE*\n`;
    msg += `${newEscalations.length} invoice(s) need attention:\n\n`;

    if (critical.length > 0) {
      msg += `*CRITICAL (60+ days):*\n`;
      for (const e of critical) {
        msg += `- ${e.contact_name}: *${formatMoney(e.amountDue)}* (${e.daysOverdue}d) — ${e.escalation.action}\n`;
      }
      msg += '\n';
    }
    if (warning.length > 0) {
      msg += `*CHASE (14-59 days):*\n`;
      for (const e of warning) {
        msg += `- ${e.contact_name}: ${formatMoney(e.amountDue)} (${e.daysOverdue}d)\n`;
      }
      msg += '\n';
    }
    if (nudge.length > 0) {
      msg += `*NUDGE (7-13 days):*\n`;
      for (const e of nudge) {
        msg += `- ${e.contact_name}: ${formatMoney(e.amountDue)} (${e.daysOverdue}d)\n`;
      }
      msg += '\n';
    }

    msg += `\n*Total overdue: ${formatMoney(totalOverdue)}*`;

    await sendTelegram(msg);
    log(`Sent Telegram alert for ${newEscalations.length} escalation(s)`);
  } else {
    log('No new escalations since last alert');
  }

  // ── 6. Summary ────────────────────────────────────────────────────────
  log(`\nDone. ${filtered.length} overdue contacts, ${formatMoney(totalOverdue)} outstanding.`);
}

main().catch(err => {
  log(`FATAL: ${err.message}`);
  process.exit(1);
});
