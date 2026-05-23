#!/usr/bin/env node
/**
 * Drain the Telegram quiet-hours queue.
 *
 * scripts/lib/telegram.mjs queues non-urgent pushes during 21:00-06:30 AEST
 * to /tmp/.tg-queue.jsonl. This script reads the queue, de-duplicates,
 * groups by chat_id, and sends one consolidated message per recipient.
 * Then truncates the queue.
 *
 * PM2 cron: daily 06:35am AEST (just before the morning push window opens).
 *
 * Plan: telegram-noise-audit-2026-05-23
 */

import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';

const QUEUE_FILE = '/tmp/.tg-queue.jsonl';

async function main() {
  if (!existsSync(QUEUE_FILE)) {
    console.log('No queue file — nothing to drain.');
    return;
  }
  const size = statSync(QUEUE_FILE).size;
  if (size === 0) {
    console.log('Queue empty — nothing to drain.');
    return;
  }

  const lines = readFileSync(QUEUE_FILE, 'utf8').trim().split('\n').filter(Boolean);
  const entries = lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  if (entries.length === 0) {
    writeFileSync(QUEUE_FILE, '');
    console.log('Queue had only invalid entries — cleared.');
    return;
  }

  // Group by chat_id; within each, dedup by message content.
  const byChat = new Map();
  for (const e of entries) {
    const list = byChat.get(e.chat_id) || [];
    if (!list.some((x) => x.message === e.message)) list.push(e);
    byChat.set(e.chat_id, list);
  }

  // Force-send (bypass quiet hours since we're explicitly draining)
  process.env.TG_FORCE = '1';
  const { sendTelegram } = await import('./lib/telegram.mjs');

  for (const [chatId, items] of byChat) {
    const header = `🌅 *${items.length} push${items.length > 1 ? 'es' : ''} held overnight (quiet-hours queue)*\n`;
    const body = items.map((e, i) => `\n— *#${i + 1}* (${e.queued_at.slice(11, 16)} UTC)\n${e.message}`).join('\n');
    await sendTelegram(header + body, { chatId, urgent: true });
  }

  // Truncate the queue
  writeFileSync(QUEUE_FILE, '');
  console.log(`✓ Drained ${entries.length} queued pushes to ${byChat.size} chat(s).`);
}

main().catch((e) => {
  console.error('Queue drain failed:', e);
  process.exit(1);
});
