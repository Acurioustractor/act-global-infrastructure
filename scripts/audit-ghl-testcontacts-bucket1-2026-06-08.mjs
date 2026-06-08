#!/usr/bin/env node
/**
 * audit-ghl-testcontacts-bucket1-2026-06-08.mjs — READ-ONLY. No writes, ever.
 *
 * Phase B / bucket 1 DRY-RUN, part 2: enumerate the LIVE GHL contacts that carry
 * the 6 "codex-smoke test" tags the flat-tag map flags for contact deletion, so we
 * can confirm they are genuinely test fixtures (not real people) before any delete.
 *
 * Uses getAllContactsByTag (GET) only. Cannot delete.
 *
 * Usage: node scripts/audit-ghl-testcontacts-bucket1-2026-06-08.mjs
 */
import dotenv from 'dotenv';
import { createGHLService } from './lib/ghl-api-service.mjs';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const ghl = createGHLService();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// codex-smoke test-contact tags (orphan-DROP "delete the contacts too" set).
const TEST_TAGS = ['community-idea', 'idea-general', 'residency-applicant', 'residency-artist', 'business-interest', 'biz-expression-of-interest'];

const seen = new Map(); // id -> {name, email, tags, viaTag}
for (const tag of TEST_TAGS) {
  let contacts = [];
  try { contacts = await ghl.getAllContactsByTag(tag); }
  catch (e) { console.log(`  ⚠ getAllContactsByTag('${tag}') -> ${e.message}`); await sleep(1100); continue; }
  console.log(`tag "${tag}": ${contacts.length} live contact(s)`);
  for (const c of contacts) {
    const id = c.id || c.contactId;
    const name = c.contactName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '(no name)';
    const email = c.email || '(no email)';
    if (!seen.has(id)) seen.set(id, { name, email, tags: c.tags || [], viaTags: [tag] });
    else seen.get(id).viaTags.push(tag);
  }
  await sleep(1100);
}

console.log(`\n=== Distinct live contacts carrying any of the 6 test tags: ${seen.size} ===`);
for (const [id, c] of seen) {
  console.log(`\n  ${c.name}  <${c.email}>  ${id}`);
  console.log(`    via: [${c.viaTags.join(', ')}]`);
  console.log(`    all tags: [${(c.tags || []).join(', ')}]`);
}
console.log(`\n(READ-ONLY — no contacts deleted. Delete decisions are Ben's, per-contact, after this review.)`);
