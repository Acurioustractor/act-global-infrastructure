/**
 * Telegram alert dedup helper.
 *
 * Each push script can hash the content-determining parts of its alert,
 * check whether the same hash was sent recently, and skip if so. Replaces
 * "blast every cron run" with "send only when content changed".
 *
 * Storage: /tmp/.tg-dedup/<source>.json
 *   { hash: "abc123...", sent_at: "2026-05-23T05:30:00Z" }
 *
 * Usage:
 *   import { alertHash, sentRecently, markSent } from './lib/telegram-dedup.mjs';
 *
 *   const hash = alertHash(unmatchedCount, [...vendors].sort());
 *   if (await sentRecently('tagger-unmatched', hash, { ttlHours: 24 })) {
 *     return; // skip
 *   }
 *   await sendTelegram(msg);
 *   await markSent('tagger-unmatched', hash);
 *
 * Plan: telegram-noise-audit-2026-05-23
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DEDUP_DIR = '/tmp/.tg-dedup';

function ensureDir() {
  if (!existsSync(DEDUP_DIR)) mkdirSync(DEDUP_DIR, { recursive: true });
}

/**
 * Compute a short content hash from any number of inputs. Arrays are sorted
 * (for stability) before joining. Objects are JSON-serialized.
 */
export function alertHash(...parts) {
  const norm = parts.map((p) => {
    if (Array.isArray(p)) return [...p].sort().join('|');
    if (p && typeof p === 'object') return JSON.stringify(p, Object.keys(p).sort());
    return String(p);
  }).join('::');
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

/**
 * Has an alert with this hash been sent within the TTL window?
 *
 * @param {string} source - unique key per push site (e.g. "tagger-unmatched")
 * @param {string} hash - from alertHash()
 * @param {Object} [opts]
 * @param {number} [opts.ttlHours=24] - skip if last identical alert is younger than this
 * @returns {boolean}
 */
export function sentRecently(source, hash, { ttlHours = 24 } = {}) {
  ensureDir();
  const file = join(DEDUP_DIR, `${source}.json`);
  if (!existsSync(file)) return false;
  try {
    const { hash: lastHash, sent_at } = JSON.parse(readFileSync(file, 'utf8'));
    if (lastHash !== hash) return false;
    const ageHours = (Date.now() - Date.parse(sent_at)) / (1000 * 60 * 60);
    return ageHours < ttlHours;
  } catch {
    return false;
  }
}

/**
 * Mark this alert hash as sent. Call AFTER a successful sendTelegram.
 */
export function markSent(source, hash) {
  ensureDir();
  const file = join(DEDUP_DIR, `${source}.json`);
  writeFileSync(file, JSON.stringify({ hash, sent_at: new Date().toISOString() }));
}

/**
 * Convenience wrapper. Returns true if the caller should send.
 * Caller is still responsible for calling sendTelegram() + markSent().
 *
 * Now async — also checks Supabase telegram_mutes table.
 * Falls open (allow send) if mute check fails.
 *
 * Example:
 *   if (!await shouldSend('compliance', hash)) return;
 *   await sendTelegram(msg);
 *   markSent('compliance', hash);
 */
export async function shouldSend(source, hash, opts) {
  // 1. Mute check (Supabase shared state — set by bot inline buttons)
  if (await isMuted(source)) {
    console.log(`[telegram-dedup] ${source} suppressed (muted)`);
    return false;
  }
  // 2. Dedup check (local filesystem hash compare)
  if (sentRecently(source, hash, opts)) {
    console.log(`[telegram-dedup] ${source} suppressed (hash=${hash} sent within ${opts?.ttlHours ?? 24}h)`);
    return false;
  }
  return true;
}

let _supabase = null;
async function getSupabase() {
  if (_supabase) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  _supabase = createClient(url, key);
  return _supabase;
}

/**
 * Is this source currently muted?
 * Reads telegram_mutes table. NULL muted_until = forever.
 * Returns false on any error (fail open — don't suppress sends on infra blips).
 */
export async function isMuted(source) {
  try {
    const supabase = await getSupabase();
    if (!supabase) return false;
    const { data, error } = await supabase
      .from('telegram_mutes')
      .select('muted_until')
      .eq('source', source)
      .maybeSingle();
    if (error || !data) return false;
    if (data.muted_until === null) return true; // forever
    return Date.parse(data.muted_until) > Date.now();
  } catch {
    return false;
  }
}

/**
 * Mute a source. hours = null means forever.
 * Called by bot callback handler (mute:24h:source-key).
 */
export async function muteFor(source, hours, mutedBy) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const muted_until = hours === null ? null : new Date(Date.now() + hours * 3600 * 1000).toISOString();
  const { error } = await supabase
    .from('telegram_mutes')
    .upsert({
      source,
      muted_until,
      muted_at: new Date().toISOString(),
      muted_by: mutedBy ? String(mutedBy) : null,
      reason: hours === null ? 'muted forever' : `snoozed ${hours}h`,
    }, { onConflict: 'source' });
  if (error) throw error;
}

/**
 * Unmute a source.
 */
export async function unmute(source) {
  const supabase = await getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  await supabase.from('telegram_mutes').delete().eq('source', source);
}

/**
 * Build inline keyboard rows with snooze/mute buttons. Returned
 * structure matches buildInlineKeyboard() input in scripts/lib/telegram.mjs.
 */
export function snoozeButtons(source) {
  return [
    [
      { text: '😴 24h', callback_data: `mute:24h:${source}` },
      { text: '🛌 7d', callback_data: `mute:7d:${source}` },
      { text: '🔇 Mute', callback_data: `mute:forever:${source}` },
    ],
  ];
}
