#!/usr/bin/env node

/**
 * push-prospects-to-ghl.mjs — discovery → GHL pipelines (the missing third rail)
 *
 * Rails:
 *   grants      → Grants pipeline                (already automated: sync-grantscope-matches 5am — NOT this script)
 *   foundations → Goods Supporter Journey        → "Identified"      (source: foundation-shortlist.mjs --json)
 *   procurement → Goods — Buyer Pipeline         → "Outreach Queued" (source: goods-tender-scan.mjs --json)
 *
 * Dedupe: fetches ALL live opportunities first; any prospect whose name fuzzy-matches an
 * existing opportunity (any pipeline, any stage) is skipped — so already-worked relationships
 * (Snow, QBE, Centrecorp…) and previously-pushed prospects never duplicate. Lapsed/Declined
 * opps also block re-push (deliberate: re-engaging a decline is a human call, not a cron's).
 *
 * Usage:
 *   node scripts/push-prospects-to-ghl.mjs                # dry-run (default): print plan, write nothing
 *   node scripts/push-prospects-to-ghl.mjs --apply        # create contacts + opportunities
 *   node scripts/push-prospects-to-ghl.mjs --top 5        # shortlist depth (default 10)
 *   node scripts/push-prospects-to-ghl.mjs --days 30      # tender window (default 30; 90 currently times out)
 */

import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import { createGHLService } from './lib/ghl-api-service.mjs';

dotenv.config({ path: '.env.local' });

const APPLY = process.argv.includes('--apply');
const argVal = (flag, dflt) => {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const TOP = argVal('--top', '10');
const DAYS = argVal('--days', '30');

// Pipeline/stage targets (read live from GHL 2026-06-07 via opportunities/pipelines)
const SUPPORTER_JOURNEY = { pipelineId: 'JvBFYpVpyKsw899lkFgj', stageId: 'cf8d31d2-73be-4119-b56b-7b0334254197', label: 'Goods Supporter Journey → Identified' };
const BUYER_PIPELINE = { pipelineId: 'FjMyJM3YzWQFmKqR9fur', stageId: 'e5220eb2-be40-4e79-9571-6acae12285c7', label: 'Goods — Buyer Pipeline → Outreach Queued' };
const SOURCE_TAG = 'source:prospect-push';

const ghl = createGHLService();

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\b(the|trustee|for|pty|ltd|limited|foundation|trust|incorporated|inc|department|of)\b/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// ── 1. Gather prospects from the two discovery scripts ──────────────────────
console.log(`Gathering prospects (shortlist top ${TOP}, tenders last ${DAYS}d)...`);

// Each source is independent — a DB wobble on one must not kill the other.
function trySource(label, cmd, retries = 1) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return JSON.parse(execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    } catch {
      if (attempt < retries) {
        console.log(`  ⚠ ${label} failed (attempt ${attempt + 1}) — retrying in 30s...`);
        execSync('sleep 30');
      }
    }
  }
  console.log(`  ⚠ ${label} unavailable after retries — continuing without it.`);
  return null;
}

const shortlist = trySource('foundation-shortlist', `node scripts/foundation-shortlist.mjs --json --top ${TOP}`) || [];
const tenders = trySource('goods-tender-scan', `node scripts/goods-tender-scan.mjs --json --days ${DAYS}`) || {};

const foundationProspects = shortlist.map((f) => ({
  kind: 'foundation',
  name: f.name,
  oppName: `${f.name} — philanthropy prospect`,
  value: 0, // capacity is context, not an ask — don't inflate pipeline totals
  note: f.why,
  target: SUPPORTER_JOURNEY,
}));

const tenderProspects = (tenders.austender_mmr_targets || []).map((t) => ({
  kind: 'buyer',
  name: t.agency,
  oppName: `${t.agency} — MMR re-tender target`,
  value: 0, // incumbent contract value is a signal, not our deal size
  note: `incumbent: ${t.incumbent_supplier} ($${Math.round(t.value).toLocaleString()}) — verify live notice before approach`,
  target: BUYER_PIPELINE,
}));

const prospects = [...foundationProspects, ...tenderProspects];
console.log(`  ${foundationProspects.length} foundations + ${tenderProspects.length} buyers = ${prospects.length} candidates`);

// ── 2. Dedupe against every live opportunity (all pipelines, all stages) ────
console.log('Fetching all live opportunities for dedupe...');
const allOpps = await ghl.getAllOpportunities();
const existingNames = allOpps.map((o) => norm(o.name)).filter(Boolean);
const existsAlready = (name) => {
  const n = norm(name);
  if (!n) return true; // unparseable name → never push
  return existingNames.some((e) => e.includes(n) || n.includes(e));
};
console.log(`  ${allOpps.length} live opportunities loaded`);

// Dedupe tender prospects against each other too (same agency, multiple contracts)
const seenThisRun = new Set();

let created = 0, skipped = 0;
for (const p of prospects) {
  const key = norm(p.name);
  if (seenThisRun.has(key)) { skipped++; continue; }
  seenThisRun.add(key);

  if (existsAlready(p.name)) {
    console.log(`  SKIP (exists): ${p.name}`);
    skipped++;
    continue;
  }

  console.log(`  ${APPLY ? 'CREATE' : 'WOULD CREATE'}: [${p.target.label}] "${p.oppName}"`);
  console.log(`           ${p.note}`);

  if (APPLY) {
    // Opportunity needs a contact: reuse by name search, else create an org-level contact
    let contactId = null;
    const found = await ghl.getContacts({ query: p.name, limit: 3 });
    const match = (found?.contacts || found || []).find?.((c) => norm(c.contactName || `${c.firstName} ${c.lastName}`) === key);
    if (match) {
      contactId = match.id;
    } else {
      // GHL requires ≥1 of email/phone/firstName/lastName — org-shell convention:
      // firstName = first word, lastName = remainder (matches auto-created-from-xero shells)
      const words = p.name.trim().split(/\s+/);
      const contact = await ghl.createContact({
        firstName: words[0],
        lastName: words.slice(1).join(' ') || words[0],
        companyName: p.name,
        tags: [SOURCE_TAG],
      });
      contactId = contact?.id || contact?.contact?.id;
    }
    await ghl.createOpportunity({
      pipelineId: p.target.pipelineId,
      stageId: p.target.stageId,
      name: p.oppName,
      status: 'open',
      ...(contactId && { contactId }),
    });
    created++;
    await new Promise((r) => setTimeout(r, 300)); // be gentle on GHL rate limits
  } else {
    created++;
  }
}

console.log(`\nDone. ${created} ${APPLY ? 'created' : 'would be created'}, ${skipped} skipped (exist/dupes).${APPLY ? '' : ' Rerun with --apply to execute.'}`);
