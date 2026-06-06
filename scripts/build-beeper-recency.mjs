#!/usr/bin/env node
/**
 * build-beeper-recency.mjs — fold warm-channel TIME into The Field's clock.
 *
 * The cadence engine was EMAIL-BLIND: last_contact came from GHL/Gmail only, so
 * people alive on WhatsApp showed overdue (sam davies "53d") or dateless (Croft).
 * This pulls every SINGLE chat's lastActivity from the local Beeper Desktop API —
 * METADATA ONLY (title / network / timestamp), never message content (vibe-pass rule,
 * wiki/concepts/relationship-first-crm.md). Local API, nothing leaves the machine.
 *
 * Consumed by scripts/lib/field-warmth.mjs → overlayBeeperRecency() in all surfaces.
 * Failure-soft in the cron: if Beeper Desktop isn't running, surfaces keep the last
 * snapshot (build-field-surfaces.mjs catches the non-zero exit).
 *
 * Run:  node scripts/build-beeper-recency.mjs
 * Out:  thoughts/shared/beeper-recency.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API = 'http://127.0.0.1:23373';
const HORIZON_DAYS = 365;           // chats quieter than this don't move any cadence state
const PAGE = 100;
const MAX_PAGES = 300;              // runaway backstop

// token: env first, else the Beeper MCP entry in ~/.claude.json (don't copy secrets around)
let token = process.env.BEEPER_ACCESS_TOKEN;
if (!token) {
  try {
    token = JSON.parse(readFileSync(`${homedir()}/.claude.json`, 'utf8'))
      ?.mcpServers?.beeper?.env?.BEEPER_ACCESS_TOKEN;
  } catch { /* fall through */ }
}
if (!token) { console.error('No BEEPER_ACCESS_TOKEN (env or ~/.claude.json mcpServers.beeper)'); process.exit(1); }

const horizon = Date.now() - HORIZON_DAYS * 864e5;
const singles = [];
let cursor = null, pages = 0, seenChats = 0;

while (pages < MAX_PAGES) {
  const url = `${API}/v1/chats?limit=${PAGE}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  let res;
  try { res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }); }
  catch (e) { console.error(`Beeper Desktop unreachable (${e.message}) — is the app running?`); process.exit(1); }
  if (!res.ok) { console.error(`Beeper API ${res.status}: ${(await res.text()).slice(0, 200)}`); process.exit(1); }
  const j = await res.json();
  const items = j.items || [];
  if (!items.length) break;
  pages++; seenChats += items.length;

  for (const c of items) {
    if (c.type !== 'single') continue;                       // 1:1 threads only — group pings ≠ personal contact
    const t = Date.parse(c.lastActivity || '');
    if (isNaN(t) || t < horizon) continue;
    singles.push({
      title: c.title || '',
      network: c.network || '',
      lastActivity: c.lastActivity,
      unread: c.unreadCount ?? 0,
    });
  }

  // chats arrive lastActivity-desc: once a whole page is past the horizon, stop
  const oldest = Date.parse(items[items.length - 1]?.lastActivity || '');
  if (!j.hasMore || (!isNaN(oldest) && oldest < horizon)) break;
  cursor = j.oldestCursor;
  if (!cursor) break;
}

const out = {
  generated_at: new Date().toISOString(),
  horizon_days: HORIZON_DAYS,
  source: 'beeper-desktop-api /v1/chats (single chats, metadata only)',
  chats: singles,
};
writeFileSync('thoughts/shared/beeper-recency.json', JSON.stringify(out, null, 1));

console.log(`Scanned ${seenChats} chats across ${pages} page(s) → ${singles.length} single chats within ${HORIZON_DAYS}d`);
console.log(`Wrote thoughts/shared/beeper-recency.json`);
for (const c of singles.slice(0, 10)) {
  console.log(`  ${c.lastActivity.slice(0, 10)}  ${c.network.padEnd(9)} ${c.title}`);
}
