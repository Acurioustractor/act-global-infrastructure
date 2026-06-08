#!/usr/bin/env node
/**
 * phantom-consent-guard.mjs — audit (default) + revoke (--apply) PHANTOM newsletter consent.
 *
 * PHANTOM consent = GHL `Newsletter Consent = Yes` with NO `Consent Source` AND NO `Consent Timestamp`.
 * Real opt-ins always carry a source + timestamp; a bare Yes is consent that was never given (root cause:
 * a manual GHL-UI prospect import — see thoughts/shared/reviews/2026-06-09_phantom-consent-root-cause.md).
 * Phantom consent passes a naive `Yes`-only send gate → Spam Act exposure.
 *
 * MODES
 *   (default, dry-run)  AUDIT — read-only. Scans consented contacts live, reports every phantom, writes
 *                       a dated audit md. Cron-safe; alert when count > 0. This is the standing monitor.
 *   --apply             REVOKE — set `Newsletter Consent = No` on each phantom (re-verified live first).
 *                       Tier-2/3 write — HELD; needs explicit human authorisation. Revoking never-given
 *                       consent is the always-safe direction. NEVER sets Yes; never touches a real opt-in.
 *
 *   --sample N          only check the first N consented contacts (fast smoke test).
 *
 * Truth source: LIVE GHL (the mirror carries newsletter_consent but NOT source/timestamp). Mirror is used
 * only to enumerate candidate ghl_ids (consent=true).
 */
import 'dotenv/config';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { createGHLService } from './lib/ghl-api-service.mjs';

const APPLY = process.argv.includes('--apply');
const sIx = process.argv.indexOf('--sample');
const SAMPLE = sIx > -1 ? parseInt(process.argv[sIx + 1], 10) : 0;
const EXPECT_LOC = 'agzsSZWgovjwgpcoASWG';
const CONSENT_FIELD_ID = 'aVnqmajnysMtGYhLD0oA'; // "Newsletter Consent" (Yes|No)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.env.GHL_LOCATION_ID !== EXPECT_LOC) throw new Error(`GHL_LOCATION_ID mismatch: ${process.env.GHL_LOCATION_ID}`);
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const ghl = createGHLService();
const cfs = await ghl.getCustomFields();
const id2n = new Map(cfs.map((f) => [f.id, f.name]));
const val = (live, re) => { const f = (live.customFields || []).find((x) => re.test(id2n.get(x.id) || '')); return f ? String(f.value || '') : ''; };

console.log(`\n=== Phantom-consent guard — ${APPLY ? 'REVOKE (--apply)' : 'AUDIT (dry-run)'}${SAMPLE ? ` --sample ${SAMPLE}` : ''} ===\n`);

// 1. enumerate consented candidates from the mirror (paginated past the 1000-cap)
let cand = [], from = 0;
for (;;) {
  const { data } = await sb.from('ghl_contacts').select('ghl_id,email,full_name,tags').eq('newsletter_consent', true).range(from, from + 999);
  cand = cand.concat(data || []); if (!data || data.length < 1000) break; from += 1000;
}
cand = cand.filter((r) => !(r.tags || []).some((t) => String(t).startsWith('gone-from-ghl')));
if (SAMPLE) cand = cand.slice(0, SAMPLE);
console.log(`consented candidates (mirror): ${cand.length} — checking live provenance…\n`);

// 2. live provenance per candidate → classify PHANTOM vs REAL
const phantom = [];
let i = 0;
for (const c of cand) {
  i++;
  try {
    const live = await ghl.getContactById(c.ghl_id); await sleep(1100);
    const nl = val(live, /newsletter consent/i);
    if (!/^yes$/i.test(nl)) continue; // mirror said Yes but live isn't — skip (stale)
    const src = val(live, /consent source/i), ts = val(live, /consent timestamp/i);
    if (!src && !ts) phantom.push({ ...c, dateAdded: (live.dateAdded || '').slice(0, 10), source: live.source || '' });
  } catch { /* transient — skip this pass */ }
  if (i % 50 === 0) console.error(`  …${i}/${cand.length}`);
}
console.log(`\nPHANTOM consent found: ${phantom.length} / ${cand.length} checked`);
phantom.slice(0, 30).forEach((p) => console.log(`  - ${(p.full_name || p.email || p.ghl_id).padEnd(34)} added=${p.dateAdded} src="${p.source}"`));
if (phantom.length > 30) console.log(`  …and ${phantom.length - 30} more`);

const today = new Date().toISOString().slice(0, 10);
const audit = `thoughts/shared/reviews/${today}_phantom-consent-audit.md`;
fs.writeFileSync(audit, `# Phantom-consent audit — ${today}\n\nconsented checked: ${cand.length}${SAMPLE ? ' (sampled)' : ''}\nPHANTOM (Yes, no source/timestamp): **${phantom.length}**\n\n${phantom.map((p) => `- ${p.full_name || p.email} \`${p.ghl_id}\` added=${p.dateAdded} src="${p.source}"`).join('\n')}\n`);
console.log(`\naudit → ${audit}`);

if (!APPLY) { console.log(`\n[dry-run / AUDIT] No writes. ${phantom.length} phantom consent(s). Run with --apply to REVOKE (set Newsletter Consent = No).\n`); process.exit(0); }

// 3. REVOKE — re-verify live, then set Newsletter Consent = No (never Yes)
let revoked = 0;
for (const p of phantom) {
  try {
    const live = await ghl.getContactById(p.ghl_id); await sleep(1100);
    if (!/^yes$/i.test(val(live, /newsletter consent/i))) { console.log(`SKIP ${p.email} — not Yes now`); continue; }
    if (val(live, /consent source/i) || val(live, /consent timestamp/i)) { console.log(`SKIP ${p.email} — has provenance now`); continue; }
    await ghl.updateContact(p.ghl_id, { customFields: [{ id: CONSENT_FIELD_ID, value: 'No' }] }); await sleep(1100);
    revoked++; console.log(`✓ revoked ${p.email}`);
  } catch (e) { console.log(`✗ ${p.email}: ${String(e.message).slice(0, 60)}`); }
}
console.log(`\nRevoked ${revoked}/${phantom.length}. (Newsletter Consent → No; never set Yes; mirror re-syncs on next sync-ghl-to-supabase.)\n`);
