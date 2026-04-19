#!/usr/bin/env node
/**
 * ALMA health check — read-only.
 *
 * Runs a series of diagnostic queries against GrantScope's ALMA data in the
 * shared Supabase instance (tednluwflfhxyucgwigh) and produces a markdown
 * report at wiki/output/alma-health/<YYYY-MM-DD>.md plus a JSON summary at
 * apps/command-center/public/alma-health-latest.json for the dashboard.
 *
 * Why this exists
 * ---------------
 * A scoring model without a ground-truth harness silently degrades. This
 * script checks the model against ACT's confirmed anchor communities. If an
 * anchor falls out of the top 200 by portfolio_score, something in the
 * scoring pipeline has regressed and future shortlists will mislead.
 *
 * See thoughts/shared/plans/alma-health-diagnosis-and-fix.md for the full
 * context and the three-phase fix plan this check supports.
 *
 * Usage
 * -----
 *   node scripts/alma-health-check.mjs
 *   node scripts/alma-health-check.mjs --verbose
 *   node scripts/alma-health-check.mjs --json-only
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const REPORT_DIR = join(REPO_ROOT, 'wiki', 'output', 'alma-health')
const JSON_OUTPUT = join(REPO_ROOT, 'apps', 'command-center', 'public', 'alma-health-latest.json')

const args = process.argv.slice(2)
const VERBOSE = args.includes('--verbose')
const JSON_ONLY = args.includes('--json-only')

// Load shared Supabase env
try {
  const env = readFileSync(join(REPO_ROOT, '.env.local'), 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
} catch {}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1) }

// PostgREST query helper — doesn't support arbitrary SQL directly, so we use
// the RPC `exec_sql` if it exists, otherwise use discrete table queries.
async function q(sql) {
  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`RPC exec_sql failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---- Known anchor ground truth --------------------------------------------
// These IDs are from the 2026-04-20 investigation. Update when new entities
// are created for BG Fit + Mounty Yarns.
const ANCHORS = [
  { label: 'Oonchiumpa', gs_entity_id: '16cadc21-083d-4d5e-8b9f-7dc6dca33b38', expected_state: 'NT', status: 'confirmed' },
  { label: 'PICC', gs_entity_id: '18fc2705-463c-4b27-8dbd-0ca79c640582', expected_state: 'QLD', status: 'confirmed' },
  { label: 'MMEIC', gs_entity_id: 'e7267f3a-e466-416f-aebf-d6bf52c7dde7', expected_state: 'QLD', status: 'confirmed' },
  { label: 'BG Fit', gs_entity_id: '8851899b-2bef-4f90-b0a4-a5accee86296', expected_state: 'QLD', status: 'confirmed' },
  { label: 'Mounty Yarns', gs_entity_id: '9ddcbdc9-4b59-4610-aaeb-6180538ca816', expected_state: 'NSW', status: 'confirmed' },
]

// ---- Checks ---------------------------------------------------------------

async function checkCoverage() {
  // Count youth-justice interventions + community-controlled entities + distinct states
  const total = await get('alma_interventions?select=id&limit=10000')
  const youth = await get('alma_interventions?select=id&serves_youth_justice=eq.true&limit=10000')
  const ccEntities = await get('gs_entities?select=id&is_community_controlled=eq.true&limit=10000')
  return {
    total_interventions: total.length,
    youth_justice_interventions: youth.length,
    community_controlled_entities: ccEntities.length,
  }
}

async function checkSignalCompleteness() {
  // Sample the first 2000 youth-justice interventions and compute completeness stats client-side.
  // PostgREST doesn't support aggregate functions without an RPC.
  const rows = await get(
    'alma_interventions?select=id,portfolio_score,evidence_strength_signal,community_authority_signal,harm_risk_signal,implementation_capability_signal,option_value_signal,evidence_level&serves_youth_justice=eq.true&limit=2000',
  )
  const stats = {
    sampled: rows.length,
    null_score: 0,
    null_evidence: 0,
    null_authority: 0,
    null_risk: 0,
    null_implementation: 0,
    null_option: 0,
    evidence_stuck_01: 0,
    evidence_level_vs_signal_mismatch: 0,
  }
  for (const r of rows) {
    if (r.portfolio_score == null) stats.null_score++
    if (r.evidence_strength_signal == null) stats.null_evidence++
    if (r.community_authority_signal == null) stats.null_authority++
    if (r.harm_risk_signal == null) stats.null_risk++
    if (r.implementation_capability_signal == null) stats.null_implementation++
    if (r.option_value_signal == null) stats.null_option++
    if (r.evidence_strength_signal === 0.1) stats.evidence_stuck_01++
    // Sanity: "Effective" should give evidence_signal >= 0.70
    if (r.evidence_level && r.evidence_level.startsWith('Effective') && r.evidence_strength_signal != null && r.evidence_strength_signal < 0.7) {
      stats.evidence_level_vs_signal_mismatch++
    }
  }
  return stats
}

async function checkAnchorRanks() {
  // For each confirmed anchor, fetch the max portfolio_score among their interventions
  // and determine where they rank against the full pool.
  const allScores = await get(
    'alma_interventions?select=gs_entity_id,portfolio_score&serves_youth_justice=eq.true&portfolio_score=not.is.null&order=portfolio_score.desc&limit=2000',
  )
  const rankedOrgs = []
  const seen = new Set()
  for (const r of allScores) {
    if (!r.gs_entity_id || seen.has(r.gs_entity_id)) continue
    seen.add(r.gs_entity_id)
    rankedOrgs.push({ gs_entity_id: r.gs_entity_id, top_score: r.portfolio_score })
  }
  const results = []
  for (const anchor of ANCHORS) {
    if (!anchor.gs_entity_id) {
      results.push({ ...anchor, rank: null, top_score: null, status_note: 'entity not yet created' })
      continue
    }
    const idx = rankedOrgs.findIndex((o) => o.gs_entity_id === anchor.gs_entity_id)
    if (idx === -1) {
      // Org has an entity but no scored interventions — check if interventions exist at all
      const interventions = await get(`alma_interventions?select=id&gs_entity_id=eq.${anchor.gs_entity_id}`)
      results.push({
        ...anchor,
        rank: null,
        top_score: null,
        status_note: interventions.length === 0
          ? 'entity exists, zero interventions authored'
          : `entity exists with ${interventions.length} interventions, all null portfolio_score`,
      })
    } else {
      results.push({
        ...anchor,
        rank: idx + 1,
        top_score: rankedOrgs[idx].top_score,
        status_note: idx < 200 ? 'healthy' : 'below top 200 — scoring drift alert',
      })
    }
  }
  return { ranked_orgs_total: rankedOrgs.length, anchors: results }
}

async function checkOrphanCommunityOrgs() {
  // Community-controlled Aboriginal corps with zero interventions in ALMA — potential authoring gaps
  const entities = await get(
    "gs_entities?select=id,canonical_name,state&is_community_controlled=eq.true&entity_type=eq.indigenous_corp&limit=2000",
  )
  // Sample — fetch intervention counts for first 500 entities to avoid long runs
  const sample = entities.slice(0, 500)
  let orphans = 0
  for (const e of sample) {
    const ints = await get(`alma_interventions?select=id&gs_entity_id=eq.${e.id}&limit=1`)
    if (ints.length === 0) orphans++
  }
  return {
    sampled_entities: sample.length,
    orphans_in_sample: orphans,
    orphan_percentage: Math.round((orphans / sample.length) * 100),
    note: 'Community-controlled Indigenous corps in CivicGraph with zero ALMA interventions. Potential authoring gaps.',
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  const when = new Date().toISOString()
  const stamp = when.slice(0, 10)
  console.log(`===== ALMA health check — ${stamp} =====`)
  console.log(`Supabase: ${URL}`)
  console.log('')

  const coverage = await checkCoverage()
  const signals = await checkSignalCompleteness()
  const anchors = await checkAnchorRanks()
  const orphans = await checkOrphanCommunityOrgs()

  // Derived verdict
  const healthyAnchors = anchors.anchors.filter((a) => a.rank && a.rank <= 200).length
  const totalTrackable = anchors.anchors.filter((a) => a.gs_entity_id).length
  const verdict = healthyAnchors === totalTrackable && signals.evidence_stuck_01 / signals.sampled < 0.1
    ? 'healthy'
    : 'degraded'

  const report = {
    generated_at: when,
    supabase: URL,
    verdict,
    summary: {
      healthy_anchors: healthyAnchors,
      trackable_anchors: totalTrackable,
      total_known_anchors: anchors.anchors.length,
    },
    coverage,
    signal_completeness: signals,
    anchor_ground_truth: anchors,
    orphan_community_orgs: orphans,
  }

  // JSON for dashboard
  if (!existsSync(dirname(JSON_OUTPUT))) mkdirSync(dirname(JSON_OUTPUT), { recursive: true })
  writeFileSync(JSON_OUTPUT, JSON.stringify(report, null, 2))
  console.log(`✓ JSON: ${JSON_OUTPUT.replace(REPO_ROOT + '/', '')}`)

  if (JSON_ONLY) return

  // Markdown report
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true })
  const md = [
    `# ALMA health check — ${stamp}`,
    '',
    `**Verdict:** ${verdict.toUpperCase()}`,
    '',
    `Generated: ${when}`,
    `Source: ${URL}`,
    '',
    '## Summary',
    '',
    `- Anchors ranked in top 200: **${healthyAnchors} of ${totalTrackable}** (entity-tracked anchors)`,
    `- Total known anchors: ${anchors.anchors.length} (${anchors.anchors.length - totalTrackable} have no entity yet)`,
    '',
    '## Coverage',
    '',
    `| Metric | Count |`,
    `|---|---|`,
    `| Total ALMA interventions | ${coverage.total_interventions} |`,
    `| Youth-justice interventions | ${coverage.youth_justice_interventions} |`,
    `| Community-controlled entities | ${coverage.community_controlled_entities} |`,
    '',
    '## Signal completeness (sampled from first 2000 youth-justice interventions)',
    '',
    `| Signal | Null count | Percentage |`,
    `|---|---|---|`,
    `| portfolio_score | ${signals.null_score} | ${Math.round((signals.null_score / signals.sampled) * 100)}% |`,
    `| evidence_strength_signal | ${signals.null_evidence} | ${Math.round((signals.null_evidence / signals.sampled) * 100)}% |`,
    `| community_authority_signal | ${signals.null_authority} | ${Math.round((signals.null_authority / signals.sampled) * 100)}% |`,
    `| harm_risk_signal | ${signals.null_risk} | ${Math.round((signals.null_risk / signals.sampled) * 100)}% |`,
    `| implementation_capability_signal | ${signals.null_implementation} | ${Math.round((signals.null_implementation / signals.sampled) * 100)}% |`,
    `| option_value_signal | ${signals.null_option} | ${Math.round((signals.null_option / signals.sampled) * 100)}% |`,
    `| evidence_signal stuck at 0.1 fallback | ${signals.evidence_stuck_01} | ${Math.round((signals.evidence_stuck_01 / signals.sampled) * 100)}% |`,
    `| evidence_level/signal mismatch | ${signals.evidence_level_vs_signal_mismatch} | ${Math.round((signals.evidence_level_vs_signal_mismatch / signals.sampled) * 100)}% |`,
    '',
    '## Anchor ground truth',
    '',
    `Total scored organisations in pool: ${anchors.ranked_orgs_total}`,
    '',
    `| Anchor | Status | Rank | Top score | Note |`,
    `|---|---|---|---|---|`,
    ...anchors.anchors.map((a) =>
      `| ${a.label} | ${a.status} | ${a.rank ?? '—'} | ${a.top_score ?? '—'} | ${a.status_note ?? ''} |`,
    ),
    '',
    '## Orphan community-controlled orgs (sampled)',
    '',
    `- Sampled: ${orphans.sampled_entities} community-controlled Indigenous corps`,
    `- Without ALMA interventions: ${orphans.orphans_in_sample} (${orphans.orphan_percentage}%)`,
    '',
    `These are potential authoring gaps — Indigenous corps in CivicGraph that could be active youth-justice programs but have never been described in ALMA.`,
    '',
    '## What this means',
    '',
    verdict === 'healthy'
      ? 'All known-anchor ground truth is in the top 200 and signal completeness is within tolerance. Shortlisting output can be trusted.'
      : 'The scoring pipeline has degraded from expected state. Shortlisting output is currently biased against anchors whose interventions have null or stuck signals. See thoughts/shared/plans/alma-health-diagnosis-and-fix.md for the 3-phase fix plan.',
    '',
    '---',
    '',
    `*Next check: weekly via cron, or run manually: \`node scripts/alma-health-check.mjs\`.*`,
  ].join('\n')

  const mdPath = join(REPORT_DIR, `${stamp}.md`)
  writeFileSync(mdPath, md)
  console.log(`✓ Report: ${mdPath.replace(REPO_ROOT + '/', '')}`)

  console.log('')
  console.log('==========================================')
  console.log(`VERDICT: ${verdict.toUpperCase()}`)
  console.log(`Anchors healthy: ${healthyAnchors}/${totalTrackable}`)
  console.log(`Evidence signals stuck at 0.1: ${signals.evidence_stuck_01}/${signals.sampled} (${Math.round((signals.evidence_stuck_01 / signals.sampled) * 100)}%)`)
  console.log('==========================================')

  if (VERBOSE) {
    console.log('')
    console.log('Anchor details:')
    for (const a of anchors.anchors) {
      console.log(`  ${a.label.padEnd(20)} rank=${a.rank ?? '—'}  top_score=${a.top_score ?? '—'}  ${a.status_note}`)
    }
  }
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  console.error(err.stack)
  process.exit(1)
})
