#!/usr/bin/env node
/**
 * Pilot lifecycle reminder cron — Pass 2B B4.
 *
 * Stage-aware staleness ladder (Q4):
 *   idea       → 90 days   (still raw — gentle nudge)
 *   scope      → 30 days   (actively shaping — push)
 *   fundraise  → 14 days   (asking for money — chase)
 *   start      → never     (in flight, look-back only)
 *   killed     → never     (terminal)
 *
 * Snooze cap (Q6): 3 per idea. Snoozed-burned ideas tagged in DM.
 *
 * Cap (Q4): max 5 per owner per nightly DM to avoid overwhelm. Stalest items first.
 *
 * Cron: daily 8:00am AEST (PM2 entry in ecosystem.config.cjs).
 *
 * Usage:
 *   node scripts/idea-board-reminders.mjs              # send if any stale
 *   node scripts/idea-board-reminders.mjs --dry-run    # print, don't send
 *   node scripts/idea-board-reminders.mjs --owner ben  # only for one owner
 */

import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { sendTelegram, buildInlineKeyboard } from './lib/telegram.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
loadEnv({ path: path.join(REPO, '.env.local') });
loadEnv({ path: path.join(REPO, '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const ownerIdx = process.argv.indexOf('--owner');
const OWNER_FILTER = ownerIdx >= 0 ? process.argv[ownerIdx + 1] : null;

const STAGE_STALE_DAYS = {
  idea: 90,
  scope: 30,
  fundraise: 14,
};

const MAX_PER_DM = 5;
const SNOOZE_LIMIT = 3;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function chatIdForOwner(owner) {
  // Per-owner override (e.g. TELEGRAM_CHAT_ID_NIC). Falls back to default TELEGRAM_CHAT_ID for ben.
  const upper = owner.toUpperCase();
  return process.env[`TELEGRAM_CHAT_ID_${upper}`] ?? process.env.TELEGRAM_CHAT_ID;
}

async function loadStaleIdeas() {
  const now = new Date();
  const thresholdISOByStage = Object.fromEntries(
    Object.entries(STAGE_STALE_DAYS).map(([stage, days]) => {
      const t = new Date(now);
      t.setUTCDate(t.getUTCDate() - days);
      return [stage, t.toISOString()];
    }),
  );

  // Pull all candidate stages in one query, filter staleness in JS for clarity.
  // stage_entered_at is the canonical "time in current stage" — set on every
  // transition. updated_at moves on every edit (trigger), so it can't be used.
  let q = supabase
    .from('idea_board')
    .select('id, text, lifecycle_stage, owner, stage_entered_at, created_at, value_estimate')
    .in('lifecycle_stage', Object.keys(STAGE_STALE_DAYS));
  if (OWNER_FILTER) q = q.eq('owner', OWNER_FILTER);
  const { data: rows, error } = await q;
  if (error) throw new Error(`Failed to load idea_board: ${error.message}`);

  const stale = (rows ?? []).filter((r) => {
    const stage = r.lifecycle_stage;
    const threshold = thresholdISOByStage[stage];
    const stageStartedAt = r.stage_entered_at ?? r.created_at;
    return threshold && stageStartedAt < threshold;
  });

  // Active snooze check — exclude ideas whose latest snooze hasn't expired yet.
  const ids = stale.map((r) => r.id);
  let activeSnoozes = new Set();
  let snoozeCounts = new Map();
  if (ids.length > 0) {
    const { data: snoozes } = await supabase
      .from('idea_snoozes')
      .select('idea_id, snoozed_until')
      .in('idea_id', ids);
    const todayDate = now.toISOString().slice(0, 10);
    for (const s of snoozes ?? []) {
      snoozeCounts.set(s.idea_id, (snoozeCounts.get(s.idea_id) ?? 0) + 1);
      if (s.snoozed_until > todayDate) activeSnoozes.add(s.idea_id);
    }
  }

  return stale
    .filter((r) => !activeSnoozes.has(r.id))
    .map((r) => {
      const stageStartedAt = r.stage_entered_at ?? r.created_at;
      const ageDays = Math.floor((now - new Date(stageStartedAt)) / (1000 * 60 * 60 * 24));
      const snoozeCount = snoozeCounts.get(r.id) ?? 0;
      return { ...r, ageDays, snoozeCount, snoozeBurned: snoozeCount >= SNOOZE_LIMIT };
    });
}

function buildKeyboardRows(idea) {
  const id = idea.id;
  const stage = idea.lifecycle_stage;
  const rows = [];

  const progressionButtons = [];
  if (stage === 'idea' || stage === 'scope') {
    progressionButtons.push({ text: '→ fundraise', callbackData: `idea:to_fundraise:${id}` });
  }
  if (stage === 'fundraise' || stage === 'scope') {
    progressionButtons.push({ text: '→ start', callbackData: `idea:to_start:${id}` });
  }
  if (progressionButtons.length > 0) rows.push(progressionButtons);

  const decisionRow = [{ text: '❌ kill', callbackData: `idea:kill:${id}` }];
  if (!idea.snoozeBurned) {
    decisionRow.push({ text: '💤 snooze 14d', callbackData: `idea:snooze:${id}:14` });
  }
  rows.push(decisionRow);

  return rows;
}

function formatIdeaLine(idea) {
  const stageEmoji = { idea: '💡', scope: '🔍', fundraise: '💸' };
  const emoji = stageEmoji[idea.lifecycle_stage] ?? '•';
  const burnedTag = idea.snoozeBurned ? ' · 💤×3 forced decision' : idea.snoozeCount > 0 ? ` · 💤×${idea.snoozeCount}` : '';
  const valueTag = idea.value_estimate > 0 ? ` · ~$${Number(idea.value_estimate).toLocaleString()}` : '';
  const text = idea.text.length > 100 ? idea.text.slice(0, 97) + '…' : idea.text;
  return `${emoji} *${idea.lifecycle_stage}* · ${idea.ageDays}d idle${valueTag}${burnedTag}\n   _${escapeMd(text)}_`;
}

function escapeMd(s) {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

async function main() {
  const stale = await loadStaleIdeas();
  if (stale.length === 0) {
    console.log('No stale ideas across any owner — no reminders sent.');
    return;
  }

  // Group by owner, oldest first, cap.
  const byOwner = new Map();
  for (const idea of stale) {
    if (!byOwner.has(idea.owner)) byOwner.set(idea.owner, []);
    byOwner.get(idea.owner).push(idea);
  }

  for (const [owner, items] of byOwner.entries()) {
    items.sort((a, b) => b.ageDays - a.ageDays);
    const shown = items.slice(0, MAX_PER_DM);
    const overflow = items.length - shown.length;

    const today = new Date().toISOString().slice(0, 10);
    const headerLines = [
      `💡 *Pilot lifecycle nudge — ${today}*`,
      `_${shown.length}${overflow > 0 ? ` of ${items.length}` : ''} stale idea${items.length === 1 ? '' : 's'} need a move_`,
      '',
    ];

    const chatId = chatIdForOwner(owner);

    if (DRY_RUN) {
      console.log(`\n=== owner=${owner} chat=${chatId ?? '<unset>'} ===`);
      console.log(headerLines.join('\n'));
      for (const idea of shown) {
        console.log('\n' + formatIdeaLine(idea));
        console.log('  buttons:', JSON.stringify(buildKeyboardRows(idea)));
      }
      if (overflow > 0) console.log(`\n(…${overflow} more capped — view at /ideas)`);
      continue;
    }

    if (!chatId) {
      console.warn(`No chat ID for owner=${owner} (set TELEGRAM_CHAT_ID_${owner.toUpperCase()} or TELEGRAM_CHAT_ID); skipping`);
      continue;
    }

    await sendTelegram(headerLines.join('\n'), { chatId });
    for (const idea of shown) {
      const replyMarkup = buildInlineKeyboard(buildKeyboardRows(idea));
      await sendTelegram(formatIdeaLine(idea), { replyMarkup, chatId });
    }
    if (overflow > 0) {
      await sendTelegram(`…${overflow} more capped — view at /ideas`, { chatId });
    }
    console.log(`Sent ${shown.length} reminders to owner=${owner}${overflow > 0 ? ` (+${overflow} overflow)` : ''}`);
  }
}

main().catch((err) => {
  console.error('idea-board-reminders failed:', err);
  process.exit(1);
});
