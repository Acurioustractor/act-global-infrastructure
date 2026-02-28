#!/usr/bin/env node

/**
 * Grant Deadline Checker
 *
 * Runs every 6 hours to:
 * 1. Find applications with upcoming deadlines (30 days)
 * 2. Check milestone completion status
 * 3. Send Telegram alerts for:
 *    - Overdue milestones (immediate)
 *    - 7/3/1 days before deadline (reminder with completion %)
 *
 * Usage:
 *   node scripts/check-grant-deadlines.mjs
 *   node scripts/check-grant-deadlines.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

async function sendTelegram(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId || DRY_RUN) {
    console.log('[DRY RUN] Would send:', message);
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
    });
  } catch (err) {
    console.error('Telegram error:', err.message);
  }
}

async function main() {
  console.log('⏰ Grant Deadline Checker\n');

  // Get active applications with linked opportunities
  const { data: apps, error } = await supabase
    .from('grant_applications')
    .select(`
      id,
      application_name,
      status,
      amount_requested,
      milestones,
      project_code,
      opportunity_id,
      grant_opportunities!grant_applications_opportunity_id_fkey (
        closes_at,
        name,
        provider
      )
    `)
    .in('status', ['draft', 'in_progress', 'submitted', 'under_review']);

  if (error) {
    console.error('Error fetching applications:', error.message);
    process.exit(1);
  }

  if (!apps || apps.length === 0) {
    console.log('No active grant applications.');
    return;
  }

  const now = new Date();
  let alertsSent = 0;

  for (const app of apps) {
    const opp = app.grant_opportunities;
    if (!opp?.closes_at) continue;

    const deadline = new Date(opp.closes_at);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Skip if deadline is more than 30 days away
    if (daysRemaining > 30) continue;

    const milestones = app.milestones || [];
    const completed = milestones.filter(m => m.completed).length;
    const total = milestones.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Check for overdue milestones
    const overdueMilestones = milestones.filter(m => {
      if (m.completed) return false;
      if (!m.due) return false;
      return new Date(m.due) < now;
    });

    // Send overdue milestone alerts
    if (overdueMilestones.length > 0) {
      const overdueNames = overdueMilestones.map(m => m.name).join(', ');
      const message = [
        `🚨 *Overdue Grant Milestones*`,
        `📋 ${app.application_name}`,
        `⏰ ${overdueMilestones.length} overdue: ${overdueNames}`,
        `📊 ${pct}% complete (${completed}/${total})`,
        `📅 Deadline: ${opp.closes_at} (${daysRemaining}d)`,
      ].join('\n');

      await sendTelegram(message);
      alertsSent++;
    }

    // Deadline reminders at 30/14/7/3/1 days
    const reminderDays = [30, 14, 7, 3, 1];
    if (reminderDays.includes(daysRemaining)) {
      const urgency = daysRemaining === 1 ? '🔴' : daysRemaining <= 3 ? '🟡' : daysRemaining <= 7 ? '🟠' : '⏰';
      const message = [
        `${urgency} *Grant Deadline in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}*`,
        `📋 ${app.application_name}`,
        `🏢 ${opp.provider} — ${opp.name}`,
        `📊 ${pct}% complete · ${overdueMilestones.length} milestones overdue`,
        total > 0 ? `Next: ${milestones.find(m => !m.completed)?.name || 'All done'}` : '',
      ].filter(Boolean).join('\n');

      await sendTelegram(message);
      alertsSent++;
    }

    console.log(`${daysRemaining <= 7 ? '🔴' : daysRemaining <= 14 ? '🟡' : '🟢'} ${app.application_name} — ${daysRemaining}d left, ${pct}% complete`);
  }

  console.log(`\n✅ Checked ${apps.length} applications, sent ${alertsSent} alerts.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
