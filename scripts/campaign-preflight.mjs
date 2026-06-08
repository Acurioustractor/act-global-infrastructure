#!/usr/bin/env node
/**
 * campaign-preflight.mjs — DRY-RUN campaign config validator + printer.
 *
 * Scaffold for P1/P2 of thoughts/shared/plans/2026-06-08-contained-adelaide-campaign-crm.md.
 * Loads a config/campaigns/<campaign>.json, validates its shape, and prints the
 * canonical contract, the CTA -> canonical migration map, the off-contract tag
 * migration map, and the preflight gate.
 *
 * TIER 1 ONLY. This script makes NO GHL calls and imports no GHLService. It reads
 * a local JSON file and prints. The live preflight (GHLService, dry-run counts) is
 * P2 (scripts/lib/campaign-ghl-preflight.mjs, to build). Any --apply is Tier 3,
 * day-shift, explicit verb, gated to the go/no-go — this scaffold refuses it.
 *
 * Usage:
 *   node scripts/campaign-preflight.mjs                       # validates contained-adelaide-2026
 *   node scripts/campaign-preflight.mjs <path-to-config.json>
 *   node scripts/campaign-preflight.mjs --apply               # refused (Tier 3 gate)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_CONFIG = join(REPO_ROOT, 'config/campaigns/contained-adelaide-2026.json');

const args = process.argv.slice(2);

if (args.includes('--apply')) {
  console.error(
    '\nREFUSED: --apply is a Tier 3 action (live GHL writes).\n' +
    'This scaffold is dry-run only. Live apply (tag migration, custom-field/calendar/\n' +
    'pipeline creation, automations, sends) is day-shift, human-in-loop, explicit verb,\n' +
    'gated to the campaign go/no-go. Use the P2 module (scripts/lib/campaign-ghl-preflight.mjs)\n' +
    'with the existing field-align/orbit gated-apply pattern, not this validator.\n'
  );
  process.exit(2);
}

const configPath = args.find((a) => !a.startsWith('--')) || DEFAULT_CONFIG;

let cfg;
try {
  cfg = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error(`FAILED to read/parse config: ${configPath}\n  ${err.message}`);
  process.exit(1);
}

// --- validation -----------------------------------------------------------
const problems = [];
const require = (cond, msg) => { if (!cond) problems.push(msg); };

require(cfg.meta?.ghl_location_id, 'meta.ghl_location_id missing');
require(cfg.meta?.campaign_slug, 'meta.campaign_slug missing');
require(Array.isArray(cfg.canonical_contract?.always) && cfg.canonical_contract.always.length > 0,
  'canonical_contract.always must be a non-empty array');
require(cfg.canonical_contract?.consent_gate?.consent_field, 'canonical_contract.consent_gate.consent_field missing');
require(cfg.newsletter?.enrolment_tag?.startsWith('comms:'), 'newsletter.enrolment_tag must be a comms:* tag (consent-gated)');

// skip annotation keys (_comment, etc.) when iterating maps
const realEntries = (o) => Object.entries(o || {}).filter(([k]) => !k.startsWith('_'));

// every role_map entry must carry at least one tag
for (const [role, def] of realEntries(cfg.canonical_contract?.role_map)) {
  require(Array.isArray(def.tags) && def.tags.length > 0, `role_map.${role} has no tags`);
}
// every cta_map entry needs a known status
const OK_STATUS = new Set(['canonical', 'migrate', 'build', 'local-only']);
for (const [cta, def] of realEntries(cfg.cta_map)) {
  require(OK_STATUS.has(def.status), `cta_map.${cta}.status="${def.status}" not one of ${[...OK_STATUS].join('|')}`);
}
// every always tag must be a colon-namespaced canonical tag (no underscore aliases)
for (const t of cfg.canonical_contract?.always || []) {
  require(t.includes(':') && !t.includes('_'), `canonical_contract.always tag "${t}" is not colon-canonical`);
}

// --- print ----------------------------------------------------------------
const line = (s = '') => console.log(s);
line(`\n=== campaign-preflight (DRY-RUN, no GHL calls) ===`);
line(`config:   ${configPath}`);
line(`campaign: ${cfg.meta?.campaign_name}  [${cfg.meta?.campaign_code}]  status=${cfg.status}`);
line(`location: ${cfg.meta?.ghl_location_name} (${cfg.meta?.ghl_location_id})`);
line(`go/no-go: ${cfg.meta?.go_no_go}   event: ${cfg.meta?.event_dates}`);

line(`\n-- canonical contract (every contact) --`);
for (const t of cfg.canonical_contract?.always || []) line(`  ${t}`);
line(`  newsletter (consent-gated): ${cfg.newsletter?.enrolment_tag}`);
line(`  community line: ${cfg.canonical_contract?.community_line?.tag} (no auto comms:*)`);

line(`\n-- role map (canonical role: tags; "<-- needs ruling" only if any remain PROPOSED) --`);
for (const [role, def] of realEntries(cfg.canonical_contract?.role_map)) {
  const flag = def.ruling?.startsWith('PROPOSED') ? '  <-- needs ruling' : '';
  line(`  ${role.padEnd(16)} -> ${def.tags.join(', ')}${def.suppress_comms ? '  [suppress comms]' : ''}${flag}`);
}

const ctaEntries = realEntries(cfg.cta_map);
line(`\n-- CTA map (${ctaEntries.length} CTAs) --`);
const byStatus = { migrate: [], build: [], canonical: [], 'local-only': [] };
for (const [cta, def] of ctaEntries) (byStatus[def.status] ||= []).push(cta);
for (const s of ['migrate', 'build', 'canonical', 'local-only']) {
  if (byStatus[s]?.length) line(`  ${s.padEnd(11)}: ${byStatus[s].join(', ')}`);
}

line(`\n-- off-contract -> canonical migration (Tier 3, gated) --`);
for (const [from, to] of Object.entries(cfg.migration?.map || {})) line(`  ${from}  ->  ${to}`);
const liveCounts = cfg.migration?.['live_counts_2026-06-09'];
if (liveCounts) line(`  live counts: ${Object.entries(liveCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);

line(`\n-- preflight gate --`);
const pf = cfg.preflight || {};
line(`  import rows ${pf.import_rows} | matchable ${pf.matchable_by_email} | conflicts ${pf.ghl_id_conflicts}`);
line(`  eligibility: ${pf.eligibility_gate?.eligible} eligible / ${pf.eligibility_gate?.blocked} blocked`);

line(`\n-- validation --`);
if (problems.length === 0) {
  line('  OK: config is internally consistent (dry-run; not checked against live GHL).');
} else {
  line(`  ${problems.length} problem(s):`);
  for (const p of problems) line(`    - ${p}`);
}
line(`\nNote: dry-run only. Live apply is Tier 3 / day-shift / gated to ${cfg.meta?.go_no_go}.\n`);

process.exit(problems.length === 0 ? 0 : 1);
