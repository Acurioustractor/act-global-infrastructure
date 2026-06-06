#!/usr/bin/env node
/**
 * build-field-surfaces.mjs — regenerate The Field's three surfaces in one pass.
 * Cron: daily 6:50am AEST (before the 7am daily briefing) so the morning read
 * is waiting with coffee. All three are read-only over the worklist CSVs —
 * this re-renders dates/cooling/rotation; it does NOT re-pull GHL/EL.
 * Beeper recency IS re-pulled first (2026-06-07 — the cadence clock was email-blind;
 * local metadata-only, failure-soft if Beeper Desktop isn't running).
 * (After any bulk GHL tag change, re-run the GHL sync first — see
 * wiki/concepts/ghl-tag-namespaces.md "sync-before-regen".)
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
const CWD = '/Users/benknight/Code/act-global-infrastructure';

// ── spine freshness canary ──────────────────────────────────────────────────
// The gmail→communications_history trigger broke SILENTLY 06-03→06-06 (an external sweep
// misquoted function search_path; 699/699 inserts rejected, sync just printed "Errors: 699").
// This writes field-freshness.json so the morning read can banner staleness where Ben looks.
dotenv.config({ path: `${CWD}/.env.local` });
try {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await sb.from('communications_history').select('created_at')
    .eq('source_system', 'gmail').order('created_at', { ascending: false }).limit(1);
  const last = data?.[0]?.created_at || null;
  const staleDays = last ? Math.round((Date.now() - Date.parse(last)) / 864e5) : null;
  writeFileSync(`${CWD}/thoughts/shared/field-freshness.json`,
    JSON.stringify({ gmail_max_created: last, checked_at: new Date().toISOString(), stale_days: staleDays }, null, 1));
  if (staleDays == null || staleDays > 2)
    console.error(`⚠ SPINE CANARY: gmail ingest ${staleDays ?? '??'} days stale — check sync-gmail-to-supabase + trigger errors (see migration 20260606000000)`);
} catch (e) { console.error(`spine canary failed (surfaces still build): ${e.message}`); }

// beeper recency first — surfaces fold it into last_contact. Failure-soft: if the
// Beeper app is down, surfaces still build on the last snapshot (clock just staler).
try { execSync('node scripts/build-beeper-recency.mjs', { stdio: 'inherit', cwd: CWD }); }
catch { console.error('⚠ beeper recency pull failed (Beeper Desktop running?) — surfaces use the previous snapshot'); }

let failed = 0;
for (const s of ['build-morning-read.mjs', 'build-scope-board.mjs', 'build-orbit-viz.mjs']) {
  try { execSync(`node scripts/${s}`, { stdio: 'inherit', cwd: CWD }); }
  catch (e) { console.error(`✗ ${s}: ${e.message}`); failed++; }
}
if (failed) { console.error(`${failed} surface build(s) failed`); process.exit(1); }
