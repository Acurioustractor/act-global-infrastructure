#!/usr/bin/env node
/**
 * Dedup ghl_contacts where same email → multiple rows.
 *
 * Strategy:
 *   1. Group by LOWER(email)
 *   2. For each group, pick canonical row:
 *      - Prefer rows with empathy_ledger_id set
 *      - Then most recent updated_at
 *      - Tiebreak: lowest id
 *   3. Union tags, projects, custom_fields onto canonical
 *   4. Pick best full_name (longest non-empty)
 *   5. Pick most recent last_contact_date
 *   6. Set canonical_contact_id on dups (NOT delete — reversible)
 *
 * Does NOT touch GHL. GHL-side merge requires explicit "merge in GHL" verb.
 *
 * Usage:
 *   node scripts/dedup-ghl-contacts.mjs            # dry-run
 *   node scripts/dedup-ghl-contacts.mjs --apply
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log(`dedup-ghl-contacts — ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// Pull all contacts with email (paginated)
async function fetchAll() {
  const all = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, email, full_name, first_name, last_name, company_name, tags, projects, custom_fields, empathy_ledger_id, canonical_entity_id, xero_contact_id, last_contact_date, updated_at, ghl_created_at, is_storyteller, is_elder, newsletter_consent, newsletter_consent_at, canonical_contact_id')
      .not('email', 'is', null)
      .neq('email', '')
      .order('id')
      .range(offset, offset + page - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < page) break;
    offset += page;
  }
  return all;
}

const contacts = await fetchAll();
console.log(`Loaded ${contacts.length} contacts with email`);

// Group by lowercased email
const groups = new Map();
for (const c of contacts) {
  const k = c.email.trim().toLowerCase();
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(c);
}

const dupGroups = [...groups.entries()].filter(([_, rows]) => rows.length > 1);
console.log(`Groups with duplicates: ${dupGroups.length}`);

function pickCanonical(rows) {
  // Sort: empathy_ledger_id present DESC, updated_at DESC, id ASC
  return [...rows].sort((a, b) => {
    if (!!a.empathy_ledger_id !== !!b.empathy_ledger_id) return a.empathy_ledger_id ? -1 : 1;
    const ua = new Date(a.updated_at || 0).getTime();
    const ub = new Date(b.updated_at || 0).getTime();
    if (ua !== ub) return ub - ua;
    return a.id < b.id ? -1 : 1;
  })[0];
}

function mergeSet(field, rows) {
  const s = new Set();
  for (const r of rows) for (const v of r[field] || []) s.add(v);
  return [...s].sort();
}

function bestName(rows) {
  const candidates = rows
    .map(r => (r.full_name || '').trim())
    .filter(n => n.length > 0)
    .sort((a, b) => {
      // Prefer name with both upper and lower case (proper case) over all-lower
      const aMixed = /[A-Z]/.test(a) && /[a-z]/.test(a);
      const bMixed = /[A-Z]/.test(b) && /[a-z]/.test(b);
      if (aMixed !== bMixed) return aMixed ? -1 : 1;
      return b.length - a.length;
    });
  return candidates[0] || null;
}

let totalDupsMarked = 0;
let groupsProcessed = 0;
const examples = [];

for (const [email, rows] of dupGroups) {
  const canonical = pickCanonical(rows);
  const dups = rows.filter(r => r.id !== canonical.id);

  // Merge
  const mergedTags = mergeSet('tags', rows);
  const mergedProjects = mergeSet('projects', rows);
  const mergedName = bestName(rows);
  const mergedLastContact = rows
    .map(r => r.last_contact_date ? new Date(r.last_contact_date).toISOString() : null)
    .filter(Boolean)
    .sort()
    .pop();
  const empathy = rows.map(r => r.empathy_ledger_id).find(Boolean);
  const canonEntity = rows.map(r => r.canonical_entity_id).find(Boolean);
  const xeroId = rows.map(r => r.xero_contact_id).find(Boolean);
  const elderFlag = rows.some(r => r.is_elder);
  const storyFlag = rows.some(r => r.is_storyteller);
  const nlConsent = rows.some(r => r.newsletter_consent);
  const nlConsentAt = rows
    .map(r => r.newsletter_consent_at)
    .filter(Boolean)
    .sort()[0];

  groupsProcessed++;
  totalDupsMarked += dups.length;

  if (examples.length < 5) {
    examples.push({ email, kept: canonical.id.slice(0, 8), name: mergedName, dups: dups.length, tag_count: mergedTags.length });
  }

  if (!APPLY) continue;

  // Update canonical with merged data
  await supabase
    .from('ghl_contacts')
    .update({
      tags: mergedTags,
      projects: mergedProjects,
      full_name: mergedName || canonical.full_name,
      last_contact_date: mergedLastContact || canonical.last_contact_date,
      empathy_ledger_id: empathy || canonical.empathy_ledger_id,
      canonical_entity_id: canonEntity || canonical.canonical_entity_id,
      xero_contact_id: xeroId || canonical.xero_contact_id,
      is_storyteller: storyFlag || canonical.is_storyteller,
      is_elder: elderFlag || canonical.is_elder,
      newsletter_consent: nlConsent || canonical.newsletter_consent,
      newsletter_consent_at: nlConsentAt || canonical.newsletter_consent_at,
      updated_at: new Date().toISOString()
    })
    .eq('id', canonical.id);

  // Mark dups
  const dupIds = dups.map(d => d.id);
  if (dupIds.length > 0) {
    await supabase
      .from('ghl_contacts')
      .update({ canonical_contact_id: canonical.id, updated_at: new Date().toISOString() })
      .in('id', dupIds);
  }

  if (groupsProcessed % 50 === 0) {
    console.log(`  …${groupsProcessed} groups, ${totalDupsMarked} dups marked`);
  }
}

console.log(`\n─── results ───`);
console.log(`Groups processed: ${groupsProcessed}`);
console.log(`Duplicate rows marked: ${totalDupsMarked}`);

console.log(`\n─── samples ───`);
for (const e of examples) {
  console.log(`  ${e.email.padEnd(40)} kept=${e.kept}  dups=${e.dups}  tags=${e.tag_count}  name="${e.name}"`);
}

if (!APPLY) console.log(`\nDry-run. Re-run with --apply.`);
