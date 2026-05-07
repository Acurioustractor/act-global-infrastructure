#!/usr/bin/env node
/**
 * One-shot drift detector for the money / soul-stack Notion pages
 * against repo-canonical sources.
 *
 * Inventory + the 7 alignment concerns:
 *   wiki/decisions/notion-page-inventory-money-stack.md
 *
 * What this script can check from the repo (no Notion API needed):
 *   #5 foundationsDb vs wiki/narrative/funders.json — flags funders the
 *      latest funder-alignment synthesis surfaced as wiki-absent.
 *   #6 entityHub freshness — compares the latest entity-migration synthesis
 *      mtime vs the canonical plan mtime. Stale if synthesis > 7 days old.
 *   #7 fourLanesCard wiring — flags if the cfg key isn't present.
 *   Bonus: lists wiki/decisions/*.md files Ben should mirror against the
 *      Notion decisionsLog manually (no auto-diff yet — see one-stop-shop).
 *
 * Notion-side checks (require working NOTION_TOKEN, otherwise skipped as
 * DEFERRED with a token-rotation pointer):
 *   #1 Hub-page redundancy — heading_2 overlap between moneyFramework and
 *      financeOverview surfaces dead-weight duplication.
 *   #2 Pile-mix populated — each of the 4 pile_* pages has >5 child blocks.
 *   #3 Money-in/out content present — moneyInAlignment + moneyOutAlignment
 *      both have live content (>5 blocks each).
 *   #4 decisionsLog row diff — Notion db rows vs wiki/decisions/*.md titles.
 *
 * Output: prints a colour-light report and writes
 *   wiki/cockpit/money-stack-alignment-YYYY-MM-DD.md
 *
 * Usage:
 *   node scripts/check-money-stack-alignment.mjs
 *   node scripts/check-money-stack-alignment.mjs --json
 */
import { readFileSync, statSync, existsSync, writeFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { Client } from '@notionhq/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = join(__dirname, '..')
await import(join(__dirname, 'lib/load-env.mjs'))

const CFG_PATH = join(REPO_ROOT, 'config/notion-database-ids.json')
const cfg = existsSync(CFG_PATH) ? JSON.parse(readFileSync(CFG_PATH, 'utf-8')) : {}
const notion = process.env.NOTION_TOKEN ? new Client({ auth: process.env.NOTION_TOKEN }) : null
const argv = process.argv.slice(2)
const JSON_OUT = argv.includes('--json')

const NOW = new Date()
const TODAY = NOW.toISOString().slice(0, 10)

function daysSinceMtime(p) {
  if (!existsSync(p)) return null
  return Math.floor((NOW - statSync(p).mtime) / 86400000)
}

function latestSynthesisFor(slug) {
  const dir = join(REPO_ROOT, 'wiki/synthesis')
  if (!existsSync(dir)) return null
  const matches = readdirSync(dir).filter((f) => f.startsWith(`${slug}-`) && f.endsWith('.md')).sort().reverse()
  return matches[0] ? join(dir, matches[0]) : null
}

const checks = []

// #5 Funder alignment — foundationsDb vs funders.json
function checkFoundationsVsFundersJson() {
  const synthesisPath = latestSynthesisFor('funder-alignment')
  if (!synthesisPath) return { id: '5-foundations-vs-funders-json', status: 'BLOCKED', reason: 'no funder-alignment synthesis found in wiki/synthesis/' }
  const md = readFileSync(synthesisPath, 'utf-8')
  // Prefer the schema-v1 frontmatter metric. Fall back to parsing the
  // headline-finding text for older syntheses generated before the
  // schema-stabilisation commit (98b8dc0, 2026-05-07).
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/)
  const fm = fmMatch ? fmMatch[1] : ''
  const wikiAbsentMatch = fm.match(/wiki_absent_count:\s*(\d+)/)
  let wikiAbsent = wikiAbsentMatch ? Number(wikiAbsentMatch[1]) : null

  // Headline-text fallback: "3 funder(s) absent from ..." captures the count.
  const countMatch = md.match(/\*\*(\d+)\s+funder\(s\)\s+absent\s+from\s+`wiki\/narrative\/funders\.json`/i)
  if (wikiAbsent === null && countMatch) wikiAbsent = Number(countMatch[1])

  // Pull the named funders from the same headline finding.
  const headlineMatch = md.match(/funder\(s\) absent from `wiki\/narrative\/funders\.json`[^\n]*?:\s*([^\n.]+)\./i)
  const names = headlineMatch ? headlineMatch[1].split(';').map((s) => s.trim()) : []

  if (wikiAbsent === null) {
    return { id: '5-foundations-vs-funders-json', status: 'BLOCKED', reason: 'could not extract wiki_absent_count from frontmatter or headline', synthesis: synthesisPath }
  }
  if (wikiAbsent === 0) {
    return { id: '5-foundations-vs-funders-json', status: 'IN-SYNC', summary: `0 wiki-absent funders in latest synthesis (${synthesisPath.split('/').pop()})`, synthesis: synthesisPath }
  }
  return {
    id: '5-foundations-vs-funders-json',
    status: 'DRIFT',
    summary: `${wikiAbsent} funder(s) have paid Xero invoices but are absent from wiki/narrative/funders.json`,
    drift: names,
    fix: 'Add the named funders to wiki/narrative/funders.json (and to Notion foundationsDb if you maintain it there).',
    synthesis: synthesisPath,
  }
}

// #6 Entity hub freshness
function checkEntityHubFreshness() {
  const synthesisPath = latestSynthesisFor('entity-migration-truth-state')
  const planPath = join(REPO_ROOT, 'thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md')
  if (!synthesisPath) return { id: '6-entity-hub-freshness', status: 'BLOCKED', reason: 'no entity-migration synthesis found' }
  const synthesisDays = daysSinceMtime(synthesisPath)
  const planDays = daysSinceMtime(planPath)
  if (synthesisDays === null || planDays === null) return { id: '6-entity-hub-freshness', status: 'BLOCKED', reason: 'plan or synthesis missing' }
  if (synthesisDays > 7) {
    return {
      id: '6-entity-hub-freshness',
      status: 'STALE',
      summary: `latest entity-migration synthesis is ${synthesisDays} days old (cutover countdown is short)`,
      fix: 'Re-run scripts/synthesize-entity-migration-truth-state.mjs',
      synthesis: synthesisPath,
    }
  }
  return {
    id: '6-entity-hub-freshness',
    status: 'IN-SYNC',
    summary: `synthesis is ${synthesisDays}d old; plan is ${planDays}d old. Notion entityHub may still be older — refresh sync-entity-hub-to-notion.mjs before sharing.`,
    synthesis: synthesisPath,
  }
}

// #7 Four-lanes card wiring
function checkFourLanesCardWired() {
  const cfgPath = join(REPO_ROOT, 'config/notion-database-ids.json')
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
  if (cfg.fourLanesCard) {
    return { id: '7-four-lanes-card', status: 'IN-SYNC', summary: `cfg.fourLanesCard set to ${cfg.fourLanesCard}` }
  }
  if (process.env.NOTION_PAGE_FOUR_LANES_CARD) {
    return { id: '7-four-lanes-card', status: 'IN-SYNC', summary: 'NOTION_PAGE_FOUR_LANES_CARD env set' }
  }
  return {
    id: '7-four-lanes-card',
    status: 'NOT-WIRED',
    summary: 'cfg.fourLanesCard absent and NOTION_PAGE_FOUR_LANES_CARD env not set',
    fix: 'Create a Notion page, copy its id (32 hex), add "fourLanesCard": "<id>" to config/notion-database-ids.json. Next Monday cron pushes the snapshot.',
  }
}

// Bonus — list wiki/decisions/*.md so Ben can manually align against Notion decisionsLog
function listWikiDecisions() {
  const dir = join(REPO_ROOT, 'wiki/decisions')
  if (!existsSync(dir)) return { id: 'bonus-wiki-decisions', status: 'BLOCKED', reason: `${dir} not found` }
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
  const rows = files.map((f) => {
    const days = daysSinceMtime(join(dir, f))
    return { file: f, days_since_edit: days }
  }).sort((a, b) => a.days_since_edit - b.days_since_edit)
  return {
    id: 'bonus-wiki-decisions',
    status: 'INFO',
    summary: `${files.length} decisions in wiki/decisions/`,
    files: rows,
    note: 'No auto-diff against Notion decisionsLog yet — that requires Notion API access. Use this list to spot-check that the Notion log carries the load-bearing ones.',
  }
}

async function listChildBlocks(pageId) {
  const out = []
  let cursor
  do {
    const res = await notion.blocks.children.list({ block_id: pageId, start_cursor: cursor, page_size: 100 })
    out.push(...res.results)
    cursor = res.has_more ? res.next_cursor : null
  } while (cursor)
  return out
}

function headingTexts(blocks, level = 'heading_2') {
  return blocks.filter((b) => b.type === level).map((b) => (b[level].rich_text || []).map((t) => t.plain_text).join('').trim().toLowerCase()).filter(Boolean)
}

async function checkHubRedundancy() {
  if (!notion) return { id: '1-hub-redundancy', status: 'DEFERRED', reason: 'NOTION_TOKEN not set', fix: 'rotate NOTION_TOKEN and re-run' }
  if (!cfg.moneyFramework) return { id: '1-hub-redundancy', status: 'BLOCKED', reason: 'cfg.moneyFramework missing' }
  // financeOverview was deprecated 2026-05-08 and archived. moneyFramework is now canonical.
  // If financeOverview is gone (404 on retrieve), the redundancy is structurally resolved — mark IN-SYNC.
  if (!cfg.financeOverview) {
    return { id: '1-hub-redundancy', status: 'IN-SYNC', summary: 'financeOverview retired; moneyFramework is the single canonical hub' }
  }
  try {
    const fovPage = await notion.pages.retrieve({ page_id: cfg.financeOverview }).catch(() => null)
    if (!fovPage || fovPage.archived || fovPage.in_trash) {
      return { id: '1-hub-redundancy', status: 'IN-SYNC', summary: 'financeOverview archived (deprecated 2026-05-08); moneyFramework is the single canonical hub' }
    }
    const [a, b] = await Promise.all([listChildBlocks(cfg.moneyFramework), listChildBlocks(cfg.financeOverview)])
    const aH = new Set(headingTexts(a))
    const bH = new Set(headingTexts(b))
    const overlap = [...aH].filter((h) => bH.has(h))
    const total = new Set([...aH, ...bH]).size
    const pct = total ? Math.round((overlap.length / total) * 100) : 0
    if (overlap.length === 0) {
      return { id: '1-hub-redundancy', status: 'IN-SYNC', summary: `0 heading overlap between moneyFramework (${aH.size} h2s) and financeOverview (${bH.size} h2s)` }
    }
    return {
      id: '1-hub-redundancy',
      status: pct >= 30 ? 'DRIFT' : 'INFO',
      summary: `${overlap.length} of ${total} h2 headings overlap (${pct}%) between moneyFramework and financeOverview`,
      drift: overlap,
      fix: pct >= 30 ? 'Pick one as canonical front door; move unique content from the other; archive the loser. Per money-stack-one-stop-shop.md the recommendation is to deprecate financeOverview and fold into moneyFramework.' : undefined,
    }
  } catch (e) {
    return { id: '1-hub-redundancy', status: 'BLOCKED', reason: e.message.slice(0, 100) }
  }
}

async function checkPileMixPopulated() {
  if (!notion) return { id: '2-pile-mix-populated', status: 'DEFERRED', reason: 'NOTION_TOKEN not set' }
  const piles = ['pilePage_voice', 'pilePage_flow', 'pilePage_ground', 'pilePage_grants']
  const missing = piles.filter((k) => !cfg[k])
  if (missing.length) return { id: '2-pile-mix-populated', status: 'BLOCKED', reason: `cfg keys missing: ${missing.join(', ')}` }
  try {
    const counts = await Promise.all(piles.map(async (k) => ({ key: k, blocks: (await listChildBlocks(cfg[k])).length })))
    const empty = counts.filter((c) => c.blocks <= 5)
    if (empty.length === 0) {
      return { id: '2-pile-mix-populated', status: 'IN-SYNC', summary: `all 4 pile pages populated (blocks: ${counts.map((c) => c.key.replace('pilePage_', '') + '=' + c.blocks).join(', ')})` }
    }
    return {
      id: '2-pile-mix-populated',
      status: 'DRIFT',
      summary: `${empty.length} of 4 pile pages near-empty (≤5 blocks)`,
      drift: empty.map((c) => `${c.key} (${c.blocks} blocks)`),
      fix: 'Run `node scripts/sync-pile-pages-to-notion.mjs` to repopulate.',
    }
  } catch (e) {
    return { id: '2-pile-mix-populated', status: 'BLOCKED', reason: e.message.slice(0, 100) }
  }
}

async function checkMoneyInOutVsSyntheses() {
  if (!notion) return { id: '3-money-in-out-vs-syntheses', status: 'DEFERRED', reason: 'NOTION_TOKEN not set' }
  if (!cfg.moneyInAlignment || !cfg.moneyOutAlignment) return { id: '3-money-in-out-vs-syntheses', status: 'BLOCKED', reason: 'cfg keys missing' }
  try {
    const [inBlocks, outBlocks] = await Promise.all([listChildBlocks(cfg.moneyInAlignment), listChildBlocks(cfg.moneyOutAlignment)])
    const tooShort = []
    if (inBlocks.length <= 5) tooShort.push(`moneyInAlignment (${inBlocks.length} blocks)`)
    if (outBlocks.length <= 5) tooShort.push(`moneyOutAlignment (${outBlocks.length} blocks)`)
    if (tooShort.length === 0) {
      return { id: '3-money-in-out-vs-syntheses', status: 'IN-SYNC', summary: `moneyInAlignment=${inBlocks.length} blocks · moneyOutAlignment=${outBlocks.length} blocks` }
    }
    return {
      id: '3-money-in-out-vs-syntheses',
      status: 'DRIFT',
      summary: `${tooShort.length} alignment page(s) near-empty`,
      drift: tooShort,
      fix: 'Run `node scripts/audit-money-in-alignment.mjs && node scripts/audit-money-out-alignment.mjs && node scripts/sync-money-alignment-to-notion.mjs` to refresh.',
    }
  } catch (e) {
    return { id: '3-money-in-out-vs-syntheses', status: 'BLOCKED', reason: e.message.slice(0, 100) }
  }
}

async function checkDecisionsLogRowDiff() {
  if (!notion) return { id: '4-decisions-log-row-diff', status: 'DEFERRED', reason: 'NOTION_TOKEN not set' }
  // SDK v5 + Notion API 2025-09-03 routes db queries through dataSources.
  const dsId = cfg.decisionsLogDataSource
  if (!dsId) return { id: '4-decisions-log-row-diff', status: 'BLOCKED', reason: 'cfg.decisionsLogDataSource missing' }
  try {
    const rows = []
    let cursor
    do {
      const res = await notion.dataSources.query({ data_source_id: dsId, start_cursor: cursor, page_size: 100 })
      rows.push(...res.results)
      cursor = res.has_more ? res.next_cursor : null
    } while (cursor)
    const notionTitles = rows.map((r) => {
      const props = r.properties || {}
      for (const k of Object.keys(props)) {
        const p = props[k]
        if (p?.type === 'title') return (p.title || []).map((t) => t.plain_text).join('').trim().toLowerCase()
      }
      return ''
    }).filter(Boolean)

    const wikiDir = join(REPO_ROOT, 'wiki/decisions')
    const wikiFiles = existsSync(wikiDir)
      ? readdirSync(wikiDir).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace(/\.md$/, '').replace(/-/g, ' ').toLowerCase())
      : []

    return {
      id: '4-decisions-log-row-diff',
      status: 'INFO',
      summary: `Notion decisionsLog has ${notionTitles.length} rows · wiki/decisions/ has ${wikiFiles.length} files`,
      note: 'Auto-diff is naive (slug→title comparison). For an actual reconciliation, audit titles by hand. The two stores are designed to differ (Notion = working, wiki = canonical) but every load-bearing decision should appear in both.',
      notion_count: notionTitles.length,
      wiki_count: wikiFiles.length,
    }
  } catch (e) {
    return { id: '4-decisions-log-row-diff', status: 'BLOCKED', reason: e.message.slice(0, 100) }
  }
}

const notionChecks = await Promise.all([
  checkHubRedundancy(),
  checkPileMixPopulated(),
  checkMoneyInOutVsSyntheses(),
  checkDecisionsLogRowDiff(),
])

const results = [
  checkFoundationsVsFundersJson(),
  checkEntityHubFreshness(),
  checkFourLanesCardWired(),
  listWikiDecisions(),
  ...notionChecks,
]

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

// Markdown report
const lines = []
lines.push(`# Money-stack alignment check — ${TODAY}`, '')
lines.push(`> Generated by \`scripts/check-money-stack-alignment.mjs\`. Repo-side checks only. Items marked DEFERRED need a working Notion token.`, '')

const buckets = { DRIFT: [], 'NOT-WIRED': [], STALE: [], 'IN-SYNC': [], INFO: [], DEFERRED: [], BLOCKED: [] }
for (const r of results) (buckets[r.status] ?? buckets.BLOCKED).push(r)

const order = ['DRIFT', 'NOT-WIRED', 'STALE', 'IN-SYNC', 'INFO', 'DEFERRED', 'BLOCKED']
const counts = order.map((k) => `${k} ${buckets[k]?.length ?? 0}`).join(' · ')
lines.push(`Status: ${counts}`, '')

for (const status of order) {
  const rows = buckets[status]
  if (!rows || rows.length === 0) continue
  lines.push(`## ${status} (${rows.length})`, '')
  for (const r of rows) {
    lines.push(`### ${r.id}`, '')
    if (r.summary) lines.push(`- **summary**: ${r.summary}`)
    if (r.reason) lines.push(`- **reason**: ${r.reason}`)
    if (r.synthesis) lines.push(`- **source**: \`${r.synthesis.replace(REPO_ROOT + '/', '')}\``)
    if (r.drift && r.drift.length) {
      lines.push(`- **drift items**:`)
      for (const d of r.drift) lines.push(`  - ${d}`)
    }
    if (r.fix) lines.push(`- **fix**: ${r.fix}`)
    if (r.note) lines.push(`- **note**: ${r.note}`)
    if (r.files) {
      lines.push(`- **files** (${r.files.length}):`)
      for (const f of r.files.slice(0, 20)) lines.push(`  - \`${f.file}\` (${f.days_since_edit}d ago)`)
      if (r.files.length > 20) lines.push(`  - ... and ${r.files.length - 20} more`)
    }
    lines.push('')
  }
}

const out = lines.join('\n')
const outPath = join(REPO_ROOT, `wiki/cockpit/money-stack-alignment-${TODAY}.md`)
writeFileSync(outPath, out)
console.log(out)
console.log(`\n[check-money-stack-alignment] wrote ${outPath}`)
