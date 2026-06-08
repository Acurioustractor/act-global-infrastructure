#!/usr/bin/env node
/**
 * audit-ghl-cruft-mirror-bucket1-2026-06-08.mjs — READ-ONLY. No writes.
 *
 * Phase B / bucket 1 DRY-RUN, part 2 (mirror worklist). Counts LIVE (non-gone)
 * mirror contacts per cruft tag, and lists the contacts carrying the 6 codex-smoke
 * "test-contact" tags so Ben can confirm they're fixtures before any delete.
 * Mirror = worklist source; verify-first against GHL at apply time.
 *
 * Usage: node scripts/audit-ghl-cruft-mirror-bucket1-2026-06-08.mjs
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const PRESENT_CRUFT = [ // the 11 cruft tag-defs that exist in live GHL
  'auto-triage', 'quiz-completed', 'business-registration', 'community-idea', 'idea-general',
  'residency-applicant', 'residency-artist', 'business-interest', 'biz-expression-of-interest', 'minderoo-connection',
];
const TEST_CONTACT_TAGS = ['community-idea', 'idea-general', 'residency-applicant', 'residency-artist', 'business-interest', 'biz-expression-of-interest'];

// Pull all rows overlapping the cruft set (paginate past 1000-cap).
let rows = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from('ghl_contacts')
    .select('ghl_id, full_name, email, tags')
    .overlaps('tags', PRESENT_CRUFT)
    .not('ghl_id', 'is', null)
    .range(from, from + 999);
  if (error) { console.error('Supabase error:', error.message); process.exit(1); }
  rows.push(...(data || []));
  if (!data || data.length < 1000) break;
}
const isGone = (r) => (r.tags || []).some((t) => String(t).startsWith('gone-from-ghl'));
const live = rows.filter((r) => !isGone(r));

console.log(`=== Bucket-1 cruft — mirror worklist (READ-ONLY) ===`);
console.log(`Rows overlapping cruft: ${rows.length} · gone-from-ghl excluded: ${rows.length - live.length} · LIVE: ${live.length}\n`);

console.log(`--- Live contact count per cruft tag (mirror; verify-first at apply) ---`);
for (const tag of PRESENT_CRUFT) {
  const n = live.filter((r) => (r.tags || []).includes(tag)).length;
  console.log(`  ${tag.padEnd(26)} ${n}`);
}

const testContacts = live.filter((r) => (r.tags || []).some((t) => TEST_CONTACT_TAGS.includes(t)));
console.log(`\n--- Contacts carrying any of the 6 test-contact tags: ${testContacts.length} (candidates for CONTACT delete) ---`);
for (const r of testContacts) {
  const via = (r.tags || []).filter((t) => TEST_CONTACT_TAGS.includes(t));
  console.log(`\n  ${r.full_name || '(no name)'}  <${r.email || 'no email'}>  ${r.ghl_id}`);
  console.log(`    via: [${via.join(', ')}]`);
  console.log(`    all tags: [${(r.tags || []).join(', ')}]`);
}
console.log(`\n(READ-ONLY — nothing changed. Tag-def deletes are authoritative via delete-junk-ghl-tags.mjs; contact deletes are per-contact, Ben's call.)`);
