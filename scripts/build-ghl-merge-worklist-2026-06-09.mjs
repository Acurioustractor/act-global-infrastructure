#!/usr/bin/env node
/**
 * Build a GHL contact-merge worklist (READ-ONLY).
 *
 * GHL has NO public contact-merge API (`POST /contacts/merge` always 403s —
 * UI-only / Workflow-action). So this does NOT merge anything. It triages the
 * email-duplicate groups in the `ghl_contacts` mirror into action buckets and
 * emits a worklist Ben works through in the GHL UI.
 *
 * Buckets (per same-lower(email) group of >1 live row):
 *   MERGE     — personal email, plausible human keeper → safe to merge in UI
 *   REVIEW    — role/shared inbox (info@, contact@, jobs@ …) → same address can
 *               be DIFFERENT people; do NOT merge without eyeballing
 *   LOW_VALUE — every record has no tags, no consent and a garbage/empty name
 *               → candidate to DELETE the dups, not merge
 *
 * Canonical keeper per group (the record to KEEP / merge others INTO):
 *   1. has empathy_ledger_id      (linked to a storyteller record)
 *   2. newsletter_consent = true  (keep the record that carries consent)
 *   3. most tags
 *   4. most recent updated_at
 *   5. tiebreak: earliest created_at, then lowest ghl_id
 *
 * Output: thoughts/shared/reviews/2026-06-09_ghl-merge-worklist.{md,csv}
 *
 * Usage: node scripts/build-ghl-merge-worklist-2026-06-09.mjs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SOFT_DELETED = new Set(['gone-from-ghl', 'ghl-deleted']);

// local-part values (and prefixes) that signal a shared / role inbox — same
// address legitimately used by multiple distinct humans → never blind-merge.
const ROLE_LOCALPARTS = new Set([
  'info', 'admin', 'hi', 'hello', 'contact', 'office', 'team', 'jobs', 'careers',
  'support', 'enquiries', 'enquiry', 'hq', 'mail', 'accounts', 'sales', 'marketing',
  'media', 'press', 'hr', 'finance', 'reception', 'bookings', 'orders', 'noreply',
  'no-reply', 'donate', 'donations', 'volunteer', 'volunteers', 'partnerships',
  'general', 'help', 'service', 'services', 'ceo', 'admin1', 'all', 'people',
]);

function isRoleInbox(email) {
  const local = (email.split('@')[0] || '').toLowerCase().trim();
  if (ROLE_LOCALPARTS.has(local)) return true;
  // info-au, contact-us, jobs.apply etc.
  return /^(info|contact|admin|hello|hi|jobs|careers|support|enquir|office|team|accounts|donate|media|press)\b/.test(local.replace(/[._-]/g, ' '));
}

// Automation / system addresses — a tool generates a contact per run (e.g. the
// GrantScope orchestrator on grantscope-triage@act.place). Not relationships;
// delete / fix at source, never hand-merge.
function isSystemGroup(email, recs) {
  const local = (email.split('@')[0] || '').toLowerCase().trim();
  if (/^(grantscope|triage|orchestrator|bot|automation|webhook|cron|daemon|noreply|no-reply|mailer|postmaster|system|test)\b/.test(local.replace(/[._-]/g, ' '))) return true;
  // whole group is named like an automation artifact
  return recs.every(r => /triage|orchestrator|\bbot\b|automation/i.test(displayName(r)));
}

// ACT ecosystem domains — funders, partners, community, team, key vendors.
// A dup on one of these is a relationship worth fixing first.
const ECOSYSTEM_DOMAINS = new Set([
  'act.place', 'picc.com.au', 'oonchiumpa.com.au', 'anyinginyi.com.au',
  'snowfoundation.org.au', 'minderoo.org', 'frrr.org.au', 'paulramsayfoundation.org.au',
  'ianpotter.org.au', 'dusseldorp.org.au', 'philanthropy.org.au', 'queenslandgives.org.au',
  'reddust.org.au', 'defydesign.org', 'socialimpacthub.org', 'orangesky.org.au',
  'standardledger.co', 'streetsmartaustralia.org', 'wilyajanta.org', 'anat.org.au',
  'redmovies.com.au', 'portable.com.au', 'kalianahoutdoors.com.au', 'brianmdavis.org.au',
  'homelandschoolcompany.org.au',
]);

// NOT a person: test/placeholder/vendor-sender/place-record/scraped-spam. These
// leaked into the email-dup set but must never be merged as a human contact.
function isNotPeople(email) {
  const [localRaw, domainRaw] = email.toLowerCase().split('@');
  const local = (localRaw || '').trim();
  const domain = (domainRaw || '').trim();
  // test / placeholder / fake TLDs
  if (/(^|\.)(example\.com|placeholder|local|invalid|test)$/.test(domain)) return true;
  if (domain.endsWith('.placeholder') || domain.endsWith('.local') || domain.endsWith('.invalid')) return true;
  if (/test/.test(local)) return true;
  // Goods asset-tracker place records (communities, not people)
  if (domain === 'goods.civicgraph.io') return true;
  // automated / transactional sender local-parts
  if (/^(news|updates?|welcome|voicemail|invoice|invoices|billing|receipts?|feedback|notifications?|noreply|no-reply|donotreply|mailer|notify|alerts?|statements?|accounting|wecare|hello-|reply|.*\.reply)$/.test(local)) return true;
  if (local.includes('+')) return true; // plus-alias = almost always a system/sender address
  // scraped-spam gmail/googlemail: many-dotted or digit-laden obfuscated local-parts
  if ((domain === 'gmail.com' || domain === 'googlemail.com')) {
    const dots = (local.match(/\./g) || []).length;
    if (dots >= 4) return true;
    if (dots >= 2 && /\d/.test(local) && local.replace(/[^a-z]/g, '').length <= 12) return true;
  }
  return false;
}

function domainOf(email) { return (email.split('@')[1] || '').toLowerCase().trim(); }

// A name that looks scraped/garbage: single token, long, vowel-poor (no real
// human name). Used only as a soft signal, never to auto-act.
function looksGarbageName(name) {
  if (!name) return true;
  const n = name.trim();
  if (!n) return true;
  if (/\s/.test(n)) return false;            // has a space → treat as real
  if (n.length >= 12 && !/[aeiou]{1}/i.test(n.slice(2, -2))) return true; // long consonant blob
  if (/^[a-z]{14,}$/i.test(n)) return true;  // long single lowercase blob
  return false;
}

async function fetchAllWithEmail() {
  const all = [];
  let offset = 0;
  const page = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('ghl_contacts')
      .select('id, ghl_id, email, full_name, first_name, last_name, tags, newsletter_consent, empathy_ledger_id, last_contact_date, created_at, updated_at, sync_status')
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

function displayName(r) {
  return (r.full_name && r.full_name.trim())
    || [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
    || '(no name)';
}

function pickCanonical(rows) {
  return [...rows].sort((a, b) => {
    const el = (b.empathy_ledger_id ? 1 : 0) - (a.empathy_ledger_id ? 1 : 0);
    if (el) return el;
    const con = (b.newsletter_consent ? 1 : 0) - (a.newsletter_consent ? 1 : 0);
    if (con) return con;
    const tg = (b.tags?.length || 0) - (a.tags?.length || 0);
    if (tg) return tg;
    const up = new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
    if (up) return up;
    const cr = new Date(a.created_at || 0) - new Date(b.created_at || 0); // earliest first
    if (cr) return cr;
    return String(a.ghl_id).localeCompare(String(b.ghl_id));
  })[0];
}

const rows = await fetchAllWithEmail();
const live = rows.filter(r => !SOFT_DELETED.has(r.sync_status || ''));

const groups = new Map();
for (const r of live) {
  const k = r.email.toLowerCase().trim();
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const buckets = { MERGE: [], REVIEW: [], SYSTEM: [], NOT_PEOPLE: [], LOW_VALUE: [] };

for (const [email, recs] of groups) {
  if (recs.length < 2) continue;
  const canonical = pickCanonical(recs);
  const dups = recs.filter(r => r.id !== canonical.id);

  const anyValue = recs.some(r => (r.tags?.length || 0) > 0 || r.newsletter_consent || r.empathy_ledger_id);
  const allGarbage = recs.every(r => looksGarbageName(displayName(r)));

  let bucket;
  if (isSystemGroup(email, recs)) bucket = 'SYSTEM';
  else if (isNotPeople(email)) bucket = 'NOT_PEOPLE';
  else if (isRoleInbox(email)) bucket = 'REVIEW';
  else if (!anyValue && allGarbage) bucket = 'LOW_VALUE';
  else bucket = 'MERGE';

  // importance (merge-these-first): an ecosystem relationship, or fragmented
  // across 2+ duplicate records. Consent/EL alone is table-stakes, not priority.
  const eco = ECOSYSTEM_DOMAINS.has(domainOf(email));
  const important = bucket === 'MERGE' && (eco || dups.length >= 2);
  buckets[bucket].push({ email, canonical, dups, recs, eco, important });
}

// MERGE sorted by importance: ecosystem first, then most dups, then most tags
buckets.MERGE.sort((a, b) =>
  (b.eco ? 1 : 0) - (a.eco ? 1 : 0)
  || b.dups.length - a.dups.length
  || (b.canonical.tags?.length || 0) - (a.canonical.tags?.length || 0));
for (const k of ['REVIEW', 'SYSTEM', 'NOT_PEOPLE', 'LOW_VALUE']) {
  buckets[k].sort((a, b) => b.dups.length - a.dups.length);
}

const dupCount = b => buckets[b].reduce((s, g) => s + g.dups.length, 0);
const totalGroups = Object.values(buckets).reduce((s, l) => s + l.length, 0);
const mergeDups = dupCount('MERGE');
const reviewDups = dupCount('REVIEW');
const systemDups = dupCount('SYSTEM');
const notPeopleDups = dupCount('NOT_PEOPLE');
const lowDups = dupCount('LOW_VALUE');
const importantGroups = buckets.MERGE.filter(g => g.important);

// ─── markdown ───
const L = [];
L.push('# GHL contact-merge worklist — 2026-06-09');
L.push('');
L.push('> **GHL has no merge API** (`POST /contacts/merge` → 403, UI-only). This worklist is');
L.push('> read-only; do the merges in the GHL UI. For each group: open the **KEEP** contact,');
L.push('> use Contact → Merge, and merge each **dup** into it. Verify the kept record still');
L.push('> carries the consent + tags before saving.');
L.push('');
L.push(`**Source:** \`ghl_contacts\` mirror (${live.length} live rows w/ email, paginated). Re-run: \`node scripts/build-ghl-merge-worklist-2026-06-09.mjs\`.`);
L.push('');
L.push('| Bucket | Groups | Dup rows to clear |');
L.push('|---|---:|---:|');
L.push(`| ✅ MERGE — real people (⭐ ${importantGroups.length} important) | ${buckets.MERGE.length} | ${mergeDups} |`);
L.push(`| ⚠️ REVIEW (role/shared inbox) | ${buckets.REVIEW.length} | ${reviewDups} |`);
L.push(`| 🤖 SYSTEM (automation — delete/fix at source) | ${buckets.SYSTEM.length} | ${systemDups} |`);
L.push(`| 🚫 NOT_PEOPLE (vendor/test/place/spam — skip or delete) | ${buckets.NOT_PEOPLE.length} | ${notPeopleDups} |`);
L.push(`| 🗑️ LOW_VALUE (delete dups, don't merge) | ${buckets.LOW_VALUE.length} | ${lowDups} |`);
L.push(`| **Total** | **${totalGroups}** | **${mergeDups + reviewDups + systemDups + notPeopleDups + lowDups}** |`);
L.push('');
L.push(`**Merge these ${importantGroups.length} first** (an ACT ecosystem relationship, or fragmented across 2+ duplicate records). The rest of MERGE is real but low-stakes — single low-value dups you can skip or batch later.`);
L.push('');

function recLine(r, isKeep) {
  const tags = r.tags?.length || 0;
  const flags = [
    r.empathy_ledger_id ? 'EL' : null,
    r.newsletter_consent ? 'consent' : null,
    `${tags}t`,
  ].filter(Boolean).join(' ');
  const last = (r.last_contact_date || r.updated_at || '').toString().slice(0, 10);
  return `   ${isKeep ? '**KEEP**' : 'merge← '} \`${r.ghl_id}\` ${displayName(r)} · ${flags} · ${last}`;
}

function section(title, list, note) {
  L.push(`## ${title}`);
  if (note) { L.push(''); L.push(note); }
  L.push('');
  if (!list.length) { L.push('_none_'); L.push(''); return; }
  list.forEach((g, i) => {
    const star = g.important ? '⭐ ' : '';
    L.push(`### ${star}${i + 1}. ${g.email}  (${g.dups.length} dup${g.dups.length > 1 ? 's' : ''})`);
    L.push(recLine(g.canonical, true));
    g.dups.forEach(d => L.push(recLine(d, false)));
    L.push('');
  });
}

section('✅ MERGE — safe to merge in UI', buckets.MERGE,
  'Personal addresses with a plausible human keeper. Merge each `merge←` row into the **KEEP** row.');
section('⚠️ REVIEW — role / shared inbox', buckets.REVIEW,
  'Same address, but a shared inbox can be **different people**. Confirm they are the same human before merging; otherwise re-email them and split.');
section('🤖 SYSTEM — automation artifacts (delete / fix at source)', buckets.SYSTEM,
  'A tool created a contact per run (e.g. the GrantScope orchestrator on `grantscope-triage@act.place`). **Do not hand-merge** — delete the extras and fix the source so it stops regrowing.');
section('🚫 NOT_PEOPLE — vendor / test / place-record / scraped spam', buckets.NOT_PEOPLE,
  'Not human relationships: example/placeholder domains, automated senders (`news@`, `invoice+…`), `goods.civicgraph.io` place-records, and dotted-gmail spam. **Skip when merging**; safe to bulk-delete.');
section('🗑️ LOW_VALUE — delete the dups (don\'t merge)', buckets.LOW_VALUE,
  'No tags, no consent, garbage/empty names — scrape artifacts. Safe to delete the `merge←` rows in UI rather than merge.');

writeFileSync('thoughts/shared/reviews/2026-06-09_ghl-merge-worklist.md', L.join('\n'));

// ─── csv ───
const C = ['bucket,important,email,action,ghl_id,name,tags,consent,empathy_ledger,last_seen'];
const dupAction = bk => (bk === 'LOW_VALUE' || bk === 'SYSTEM' || bk === 'NOT_PEOPLE') ? 'DELETE'
  : (bk === 'REVIEW' ? 'REVIEW' : 'MERGE_INTO_KEEP');
for (const bk of ['MERGE', 'REVIEW', 'SYSTEM', 'NOT_PEOPLE', 'LOW_VALUE']) {
  for (const g of buckets[bk]) {
    const esc = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const row = (r, action) => C.push([
      bk, g.important ? 'yes' : 'no', esc(g.email), action, r.ghl_id, esc(displayName(r)),
      r.tags?.length || 0, r.newsletter_consent ? 'yes' : 'no',
      r.empathy_ledger_id ? 'yes' : 'no',
      (r.last_contact_date || r.updated_at || '').toString().slice(0, 10),
    ].join(','));
    row(g.canonical, 'KEEP');
    g.dups.forEach(d => row(d, dupAction(bk)));
  }
}
writeFileSync('thoughts/shared/reviews/2026-06-09_ghl-merge-worklist.csv', C.join('\n'));

console.log(`Groups: ${totalGroups}  | MERGE ${buckets.MERGE.length} (⭐${importantGroups.length} important, ${mergeDups} dups) · REVIEW ${buckets.REVIEW.length} (${reviewDups}) · SYSTEM ${buckets.SYSTEM.length} (${systemDups}) · NOT_PEOPLE ${buckets.NOT_PEOPLE.length} (${notPeopleDups}) · LOW_VALUE ${buckets.LOW_VALUE.length} (${lowDups})`);
console.log('Wrote thoughts/shared/reviews/2026-06-09_ghl-merge-worklist.{md,csv}');
