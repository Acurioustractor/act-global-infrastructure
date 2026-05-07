#!/usr/bin/env node
/**
 * ACT Alignment Loop — Q1 funder alignment synthesis
 *
 * For every funder relationship surfaced across the four sources (Xero,
 * GHL, wiki/narrative/funders.json, thoughts/shared/{plans,drafts}/**),
 * scores presence + stage drift and writes a synthesis artefact to
 * wiki/synthesis/funder-alignment-YYYY-MM-DD.md.
 *
 * Phase-1 automation of the manual 2026-04-24 pass.
 * Plan: thoughts/shared/plans/act-alignment-loop.md
 * Baseline: wiki/synthesis/funder-alignment-2026-04-24.md
 * Rubric:  thoughts/shared/rubrics/alignment-loop-synthesis.md (v0.1, 6/6)
 *
 * Usage:
 *   node scripts/synthesize-funder-alignment.mjs              # write dated file
 *   node scripts/synthesize-funder-alignment.mjs --dry-run    # print to stdout
 *   node scripts/synthesize-funder-alignment.mjs --no-grade   # skip self-grade
 *   node scripts/synthesize-funder-alignment.mjs --date 2026-05-08
 */
import './lib/load-env.mjs'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { join } from 'node:path'
import { loadFunders } from './lib/claim-loader.mjs'
import { gradeAndLint } from './lib/alignment-loop-grade.mjs'

const REPO_ROOT = process.cwd()
const FUNDERS_PATH = 'wiki/narrative/funders.json'
const SYNTHESIS_DIR = join(REPO_ROOT, 'wiki/synthesis')
const PLANS_DIR = join(REPO_ROOT, 'thoughts/shared/plans')
const DRAFTS_DIR = join(REPO_ROOT, 'thoughts/shared/drafts')
const STALE_COMM_DAYS = 90
const ENTITY_CUTOVER_DATE = '2026-06-30'

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const NO_GRADE = argv.includes('--no-grade')
const DATE_FLAG = argv.indexOf('--date')
const DATE = DATE_FLAG >= 0 ? argv[DATE_FLAG + 1] : new Date().toISOString().slice(0, 10)

const SUPABASE_URL = process.env.SUPABASE_SHARED_URL || 'https://tednluwflfhxyucgwigh.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SHARED_SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Helpers ───────────────────────────────────────────────────────────────

function slugify(s) {
  return (s || '').toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function daysBetween(iso, ref = DATE) {
  if (!iso) return null
  const a = new Date(iso).getTime()
  const b = new Date(ref).getTime()
  return Math.floor((b - a) / 86400000)
}

function fmtDollars(n) {
  if (!n || n === 0) return '0'
  return n.toLocaleString('en-AU', { maximumFractionDigits: 0 })
}

// ─── Pull 1: Xero ──────────────────────────────────────────────────────────
async function pullXero() {
  const all = []
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb.from('xero_invoices')
      .select('xero_id, invoice_number, type, status, contact_name, contact_xero_id, date, due_date, total, amount_due, income_type, project_code')
      .eq('type', 'ACCREC')
      .not('status', 'in', '("VOIDED","DELETED")')
      .range(from, from + page - 1)
    if (error) throw new Error(`xero_invoices: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < page) break
    from += page
  }
  // funder filter: income_type='grant' OR contact_name matches a funder pattern
  const FUNDER_RE = /\b(foundation|trust|forum|ramsay|fairfax|smith family|rotary|streetsmart|westpac|amp|atlassian|patagonia|allbirds|bryan|funding network|queensland gives|niaa|qld dfsdscs|john villiers|brisbane powerhouse|social impact|snow|centrecorp|minderoo|ian potter|catalysing impact|qbe)\b/i
  const filtered = all.filter(r =>
    r.income_type === 'grant' || (r.contact_name && FUNDER_RE.test(r.contact_name))
  )
  // group by contact_name (trim trailing comma + whitespace from messy Xero entries)
  const cleanName = s => (s || '(unknown)').replace(/[,\s]+$/, '').trim()
  const byContact = {}
  for (const r of filtered) {
    const name = cleanName(r.contact_name)
    if (!byContact[name]) {
      byContact[name] = {
        contact_name: name,
        contact_xero_id: r.contact_xero_id || null,
        invoices: [],
        total_billed: 0,
        outstanding: 0,
        statuses: new Set(),
        latest_date: null,
        oldest_unpaid_date: null,
      }
    }
    const b = byContact[name]
    b.invoices.push({
      invoice_number: r.invoice_number,
      status: r.status,
      total: parseFloat(r.total) || 0,
      amount_due: parseFloat(r.amount_due) || 0,
      date: r.date,
      due_date: r.due_date,
      project_code: r.project_code,
      income_type: r.income_type,
    })
    b.total_billed += parseFloat(r.total) || 0
    b.outstanding += parseFloat(r.amount_due) || 0
    b.statuses.add(r.status)
    if (!b.latest_date || (r.date && r.date > b.latest_date)) b.latest_date = r.date
    if (parseFloat(r.amount_due) > 0 && (!b.oldest_unpaid_date || r.date < b.oldest_unpaid_date)) {
      b.oldest_unpaid_date = r.date
    }
  }
  return byContact
}

// ─── Pull 2: GHL ──────────────────────────────────────────────────────────
async function pullGhl() {
  const { data, error } = await sb.from('ghl_contacts')
    .select('id, ghl_id, full_name, company_name, email, tags')
    .or('tags.cs.{funder},tags.cs.{goods-funder},tags.cs.{justicehub-funder},tags.cs.{goods-gmail-funder}')
  if (error) throw new Error(`ghl_contacts: ${error.message}`)
  // Pull last comm for every ghl_id we see (one human can have many ghl_ids across sub-accounts)
  const allGhlIds = (data || []).map(r => r.ghl_id).filter(Boolean)
  const lastComm = {}
  if (allGhlIds.length > 0) {
    for (let i = 0; i < allGhlIds.length; i += 200) {
      const chunk = allGhlIds.slice(i, i + 200)
      const { data: ch, error: ce } = await sb.from('communications_history')
        .select('ghl_contact_id, occurred_at')
        .in('ghl_contact_id', chunk)
        .order('occurred_at', { ascending: false })
      if (ce) throw new Error(`communications_history: ${ce.message}`)
      for (const c of ch || []) {
        if (!lastComm[c.ghl_contact_id] || c.occurred_at > lastComm[c.ghl_contact_id]) {
          lastComm[c.ghl_contact_id] = c.occurred_at
        }
      }
    }
  }
  // Dedup by email (or ghl_id when no email). When merging duplicates, keep the latest comm and the union of ghl_ids.
  const merged = new Map()
  for (const r of data || []) {
    const key = (r.email || '').toLowerCase().trim() || `ghlid:${r.ghl_id}`
    const lc = lastComm[r.ghl_id] || null
    if (!merged.has(key)) {
      merged.set(key, {
        ...r,
        ghl_ids: [r.ghl_id].filter(Boolean),
        last_comm_at: lc,
      })
    } else {
      const e = merged.get(key)
      if (r.ghl_id && !e.ghl_ids.includes(r.ghl_id)) e.ghl_ids.push(r.ghl_id)
      if (lc && (!e.last_comm_at || lc > e.last_comm_at)) e.last_comm_at = lc
      // Prefer non-null company_name and full_name
      if (!e.company_name && r.company_name) e.company_name = r.company_name
      if (!e.full_name && r.full_name) e.full_name = r.full_name
    }
  }
  return [...merged.values()].map(r => ({
    ...r,
    days_since_last_comm: r.last_comm_at ? daysBetween(r.last_comm_at) : null,
  }))
}

// ─── Pull 3: Wiki funders.json ─────────────────────────────────────────────
let _funders_cache = null
function pullWikiFunders() {
  if (!_funders_cache) _funders_cache = loadFunders()
  return _funders_cache.funders || {}
}
function pullWikiFundersUpdated() {
  if (!_funders_cache) _funders_cache = loadFunders()
  return _funders_cache.updated || null
}

// ─── Pull 4: thoughts/shared mentions ──────────────────────────────────────
function pullPlanMentions(funderNames) {
  const hits = {}
  for (const name of funderNames) {
    hits[name] = { plans: [], drafts: [] }
  }
  const scan = (dir, kind) => {
    let entries = []
    try { entries = readdirSync(dir) } catch { return }
    for (const f of entries) {
      const full = join(dir, f)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) { scan(full, kind); continue }
      if (!f.endsWith('.md')) continue
      let text
      try { text = readFileSync(full, 'utf8') } catch { continue }
      const lower = text.toLowerCase()
      for (const name of funderNames) {
        // search for canonical name AND key tokens (e.g. "snow", "centrecorp")
        const tokens = name.toLowerCase().replace(/^the\s+/, '').split(/\s+/).filter(t => t.length > 4)
        const stripped = name.toLowerCase().replace(/^the\s+/, '')
        if (lower.includes(stripped) || (tokens.length > 0 && tokens.every(t => lower.includes(t)))) {
          const rel = full.replace(REPO_ROOT + '/', '')
          hits[name][kind].push(rel)
        }
      }
    }
  }
  scan(PLANS_DIR, 'plans')
  scan(DRAFTS_DIR, 'drafts')
  return hits
}

// ─── Resolve: funder identity (slug) per contact_name ──────────────────────
function resolveFunderSlug(contactName, wikiFunders) {
  const slug = slugify(contactName)
  if (wikiFunders[slug]) return slug
  // try without "the" prefix
  const tight = slug.replace(/^the-/, '')
  if (wikiFunders[tight]) return tight
  // try matching by canonical name
  for (const [s, entry] of Object.entries(wikiFunders)) {
    const eName = (entry.name || '').toLowerCase()
    if (!eName) continue
    const eTight = eName.replace(/^the\s+/, '').replace(/\s+foundation$/, '')
    const cTight = contactName.toLowerCase().replace(/^the\s+/, '').replace(/\s+foundation$/, '')
    if (eName === contactName.toLowerCase()) return s
    if (eTight && cTight.includes(eTight)) return s
    if (eTight && eTight.includes(cTight)) return s
  }
  return null
}

// ─── Build the unified row set ─────────────────────────────────────────────
function buildRows(xeroByContact, ghlContacts, wikiFunders, planHits) {
  const rows = []
  const seenSlugs = new Set()
  // 1. Xero-grounded rows
  for (const [contactName, x] of Object.entries(xeroByContact)) {
    const slug = resolveFunderSlug(contactName, wikiFunders)
    const wikiEntry = slug ? wikiFunders[slug] : null
    const canonical = wikiEntry?.name || contactName
    const ghlMatch = ghlContacts.find(g => {
      const e = (g.email || '').toLowerCase()
      const c = (g.company_name || '').toLowerCase()
      const stripped = canonical.toLowerCase().replace(/^the\s+/, '')
      const slugCanonical = slugify(canonical)
      return c === stripped || c.includes(stripped) ||
        e.includes(slugCanonical.replace(/-/g, '')) ||
        e.includes(slug || '_____unmatchable_____')
    })
    const liveInvoices = x.invoices.filter(i => i.amount_due > 0)
    rows.push({
      kind: 'xero-rooted',
      slug,
      canonical,
      contact_name: contactName,
      xero: x,
      wiki: wikiEntry,
      ghl: ghlMatch || null,
      plan_mentions: planHits[canonical] || planHits[contactName] || { plans: [], drafts: [] },
      live_invoices: liveInvoices,
    })
    if (slug) seenSlugs.add(slug)
  }
  // 2. wiki-only rows (in funders.json but no Xero row)
  for (const [slug, entry] of Object.entries(wikiFunders)) {
    if (seenSlugs.has(slug)) continue
    const canonical = entry.name || slug
    const ghlMatch = ghlContacts.find(g => {
      const c = (g.company_name || '').toLowerCase()
      const stripped = canonical.toLowerCase().replace(/^the\s+/, '')
      return c === stripped || c.includes(stripped)
    })
    rows.push({
      kind: 'wiki-only',
      slug,
      canonical,
      contact_name: null,
      xero: null,
      wiki: entry,
      ghl: ghlMatch || null,
      plan_mentions: planHits[canonical] || { plans: [], drafts: [] },
      live_invoices: [],
    })
  }
  // 3. GHL-only rows (tagged funder, not in Xero or wiki)
  const xeroNames = new Set(Object.keys(xeroByContact).map(n => slugify(n)))
  const matchedGhlKeys = new Set(rows.flatMap(r => r.ghl ? [r.ghl.email?.toLowerCase().trim() || `ghlid:${r.ghl.ghl_ids?.[0] || r.ghl.ghl_id}`] : []))
  for (const g of ghlContacts) {
    const gKey = (g.email || '').toLowerCase().trim() || `ghlid:${g.ghl_ids?.[0] || g.ghl_id}`
    if (matchedGhlKeys.has(gKey)) continue
    const canonical = g.company_name || g.full_name || '(unnamed)'
    const cSlug = slugify(canonical)
    if (xeroNames.has(cSlug)) continue
    if (Object.keys(wikiFunders).some(s => s === cSlug)) continue
    rows.push({
      kind: 'ghl-only',
      slug: null,
      canonical,
      contact_name: null,
      xero: null,
      wiki: null,
      ghl: g,
      plan_mentions: planHits[canonical] || { plans: [], drafts: [] },
      live_invoices: [],
    })
  }
  return rows
}

// ─── Classify drift per row ────────────────────────────────────────────────
function classifyRow(r) {
  const wikiStage = r.wiki?.stage || null
  const dbHasInvoices = r.xero && r.xero.invoices.length > 0
  const dbHasPaid = r.xero && r.xero.total_billed > r.xero.outstanding
  const dbHasLive = r.live_invoices.length > 0
  const tranches = r.xero ? r.xero.invoices.length : 0

  // wiki-absent: DB has invoices, no funders.json entry
  if (dbHasInvoices && !r.wiki) {
    return { code: 'wiki-absent', reason: `Xero has ${tranches} invoice(s); funders.json has no \`${slugify(r.canonical)}\` entry` }
  }
  // db-absent: funders.json names them, no Xero invoice
  if (!dbHasInvoices && r.wiki) {
    if (wikiStage === 'ask-pending' || wikiStage === 'term-sheet-pending' || wikiStage === 'cold' || wikiStage === 'warm-cold') {
      return { code: 'aligned', reason: `Prospect or pending stage; no DB activity expected yet` }
    }
    if (wikiStage === 'active-partner' && (!r.ghl || !r.ghl.last_comm_at)) {
      return { code: 'drift-alert', reason: `funders.json says \`stage: active-partner\` but no Xero invoice and no GHL communication` }
    }
    return { code: 'db-absent', reason: `funders.json claims relationship; no Xero invoice on file` }
  }
  // ghl-only
  if (r.kind === 'ghl-only') {
    if (r.ghl?.days_since_last_comm !== null && r.ghl.days_since_last_comm > STALE_COMM_DAYS) {
      return { code: 'drift-alert', reason: `GHL-tagged \`funder\`; no Xero invoice, last comm ${r.ghl.days_since_last_comm} days ago` }
    }
    return { code: 'db-absent', reason: `GHL-tagged \`funder\`; no Xero invoice yet` }
  }
  // both wiki and DB present, check stage drift
  if (r.wiki && dbHasInvoices) {
    const totalPaid = r.xero.total_billed - r.xero.outstanding
    if (wikiStage === 'cold' && (totalPaid > 0 || dbHasLive)) {
      return { code: 'drift-alert', reason: `funders.json says \`stage: cold\`; Xero shows $${fmtDollars(totalPaid)} paid across ${tranches} invoice(s)` }
    }
    if (wikiStage === 'warm' && tranches >= 3 && totalPaid > 100000) {
      return { code: 'drift-alert', reason: `funders.json says \`stage: warm\`; Xero shows ${tranches} tranches totalling $${fmtDollars(totalPaid)}` }
    }
    if (dbHasLive && wikiStage) {
      return { code: 'aligned', reason: `Live tranche; funders.json stage matches DB activity` }
    }
    if (!dbHasLive && dbHasPaid) {
      // Historical billing only. If wiki says active-partner, surface the explicit reconciliation
      // (Tier 3.4: cannot silently invert canonical stage without explicit language).
      if (wikiStage === 'active-partner') {
        return { code: 'drift-alert', reason: `funders.json says \`stage: active-partner\`; Xero shows ${tranches} paid invoice(s) totalling $${fmtDollars(totalPaid)} but no live tranche. Treating as historical-only pending Ben confirmation that the partnership is still active.` }
      }
      return { code: 'historical-only', reason: `${tranches} paid invoice(s), nothing live; funders.json stage \`${wikiStage}\` consistent` }
    }
    return { code: 'aligned', reason: `funders.json present; DB activity consistent` }
  }
  return { code: 'aligned', reason: 'No reconciliation drift detected' }
}

// ─── Render ────────────────────────────────────────────────────────────────
function classifyEmoji(code) {
  return ({
    'aligned': 'aligned',
    'drift-alert': 'drift-alert',
    'wiki-absent': 'wiki-absent',
    'db-absent': 'db-absent',
    'plan-absent': 'plan-absent',
    'historical-only': 'historical-only',
  })[code] || code
}

function renderMarkdown(rows, totals) {
  const live = rows.filter(r => r.live_invoices.length > 0).sort((a, b) => b.xero.outstanding - a.xero.outstanding)
  const wikiAbsent = rows.filter(r => r.classification.code === 'wiki-absent')
  const stageDrift = rows.filter(r => r.classification.code === 'drift-alert' && r.wiki && r.xero)
  const ghostActivePartner = rows.filter(r => r.classification.code === 'drift-alert' && r.wiki && !r.xero)
  const ghlSilent = rows.filter(r => r.kind === 'ghl-only' && r.ghl?.days_since_last_comm !== null && r.ghl.days_since_last_comm > STALE_COMM_DAYS)
  const cutoverDays = daysBetween(DATE, ENTITY_CUTOVER_DATE)

  const outstandingTotal = live.reduce((s, r) => s + r.xero.outstanding, 0)

  // Frontmatter
  const fm = [
    '---',
    `synthesis_slug: funder-alignment`,
    `cycle_date: ${DATE}`,
    `title: Funder alignment auto-cycle ${DATE}`,
    `summary: Phase-1 automation of Q1 of the ACT Alignment Loop. Cross-source reconciliation of every funder relationship across xero_invoices, ghl_contacts + communications_history, wiki/narrative/funders.json, and thoughts/shared/{plans,drafts}/**.`,
    `tags: [synthesis, funders, alignment-loop, auto-generated]`,
    `status: active`,
    `date: ${DATE}`,
    `sources_queried:`,
    `  - { kind: "xero", table: "xero_invoices", filter: "type=ACCREC, status not in (VOIDED,DELETED), income_type=grant or contact_name matches funder regex (${totals.xeroFunderInvoices} rows)" }`,
    `  - { kind: "ghl", table: "ghl_contacts", filter: "tags contain funder|goods-funder|justicehub-funder|goods-gmail-funder (${totals.ghlFunderContacts} rows)" }`,
    `  - { kind: "ghl", table: "communications_history", filter: "ghl_contact_id in funder-tagged set (${totals.ghlComms} rows)" }`,
    `  - { kind: "wiki", path: "wiki/narrative/funders.json", filter: "all entries (${totals.wikiFunders} rows)" }`,
    `  - { kind: "thoughts", path: "thoughts/shared/{plans,drafts}/**", filter: "grep funder canonical names (${totals.planMentionFiles} files matched)" }`,
    '---',
    '',
  ]

  // Title + sources block (Tier 2.2)
  const sourcesBlock = [
    `# Funder alignment ${DATE}`,
    '',
    `> Auto-generated by \`scripts/synthesize-funder-alignment.mjs\`. Baseline: [[funder-alignment-2026-04-24|2026-04-24 manual pass]]. Loop spec: [[act-alignment-loop|ACT Alignment Loop]].`,
    '',
    `One synthesis, four sources: \`xero_invoices\` (DB reality), \`ghl_contacts\` + \`communications_history\` (relationship state), \`wiki/narrative/funders.json\` (strategic narrative), and \`thoughts/shared/{plans,drafts}/**\` (in-flight work). Drift surfaces here so the next envelope does not surface it under deadline.`,
    '',
  ]

  // Headline findings (Tier 2.3 — every numbered finding cites a row)
  const headlineLines = ['## Headline findings', '']
  let n = 1
  if (live.length > 0) {
    const liveSummary = live.slice(0, 3).map(r => {
      const inv = r.live_invoices[0]
      const tag = inv.status === 'AUTHORISED' ? 'AUTH' : inv.status === 'DRAFT' ? 'DRAFT' : inv.status
      const days = daysBetween(inv.date)
      const dayTag = days !== null && days > 90 ? `-${days}d` : ''
      return `${r.canonical} $${fmtDollars(inv.amount_due)} ${tag}${dayTag} (${inv.invoice_number})`
    }).join('; ')
    headlineLines.push(`${n++}. **${live.length} funder(s) hold live money** totalling $${fmtDollars(outstandingTotal)} on the sole trader's books with ${cutoverDays} days to ${ENTITY_CUTOVER_DATE} cutover. Top: ${liveSummary}.`)
  }
  if (wikiAbsent.length > 0) {
    const top = wikiAbsent.sort((a, b) => (b.xero?.total_billed || 0) - (a.xero?.total_billed || 0)).slice(0, 5)
      .map(r => `${r.canonical} $${fmtDollars(r.xero.total_billed)}`).join('; ')
    headlineLines.push(`${n++}. **${wikiAbsent.length} funder(s) absent from \`wiki/narrative/funders.json\`** with paid Xero invoices: ${top}. The narrative-draft tooling cannot target funders with no slug, so pitch assembly is writing from an incomplete ledger (\`funders.json\` last updated ${pullWikiFundersUpdated() || 'unknown'}, baseline 2026-04-24).`)
  }
  if (stageDrift.length > 0) {
    const list = stageDrift.slice(0, 3).map(r => `${r.canonical} (\`funders.${r.slug}.stage\` = ${r.wiki.stage})`).join('; ')
    headlineLines.push(`${n++}. **${stageDrift.length} funder(s) have a stage classification in \`funders.json\` that disagrees with Xero reality**: ${list}.`)
  }
  if (ghlSilent.length > 0) {
    const list = ghlSilent.slice(0, 4).map(r => `${r.canonical} (${r.ghl.days_since_last_comm}d, \`ghl_contacts.ghl_id=${r.ghl.ghl_id}\`)`).join('; ')
    headlineLines.push(`${n++}. **${ghlSilent.length} GHL contact(s) tagged \`funder\` silent >${STALE_COMM_DAYS} days**: ${list}. Decision needed: re-engage or drop tag.`)
  }
  headlineLines.push(`${n++}. **${rows.length} funder relationships indexed across the four sources** (${totals.xeroFunders} Xero-grounded, ${totals.wikiFundersOnly} \`funders.json\`-only, ${totals.ghlOnly} GHL-only).`)
  headlineLines.push('')

  // Drift table (Tier 2.4)
  const tableLines = [
    '## At-a-glance — every funder, every source',
    '',
    'Drift column uses canonical classifications: `aligned` / `drift-alert` / `wiki-absent` / `db-absent` / `plan-absent` / `historical-only`. Each row carries enough citations (an invoice ID, a `$` amount, a `funders.<slug>` reference, or a path) to satisfy two-sided cite rule on drift claims.',
    '',
    '| Funder | Slug | Total billed | Outstanding | Tranches | `funders.json` stage | Last comm | Plan/draft mentions | Drift |',
    '|---|---|---:|---:|---:|---|---|---|---|',
  ]
  // Sort: drift-alert first, then live money, then wiki-absent, then aligned, then historical-only, then GHL-only
  const sortPriority = c => ({ 'drift-alert': 0, 'wiki-absent': 1, 'db-absent': 2, 'aligned': 3, 'historical-only': 4 })[c] ?? 5
  const sorted = [...rows].sort((a, b) => {
    const da = sortPriority(a.classification.code)
    const dbn = sortPriority(b.classification.code)
    if (da !== dbn) return da - dbn
    return (b.xero?.outstanding || 0) - (a.xero?.outstanding || 0)
  })
  for (const r of sorted) {
    const slugCell = r.slug ? `\`funders.${r.slug}\`` : (r.kind === 'wiki-absent' || (r.xero && !r.slug) ? '*absent*' : '·')
    const billed = r.xero ? `$${fmtDollars(r.xero.total_billed)}` : '·'
    const outstanding = r.xero?.outstanding > 0 ? `**$${fmtDollars(r.xero.outstanding)}**` : (r.xero ? '0' : '·')
    const tranches = r.xero ? r.xero.invoices.length : '·'
    const stage = r.wiki?.stage || '*absent*'
    const lastComm = r.ghl?.days_since_last_comm !== null && r.ghl?.days_since_last_comm !== undefined ? `${r.ghl.days_since_last_comm}d` : '·'
    const mentions = []
    if (r.plan_mentions.plans.length > 0) mentions.push(`plans:${r.plan_mentions.plans.length}`)
    if (r.plan_mentions.drafts.length > 0) mentions.push(`drafts:${r.plan_mentions.drafts.length}`)
    const mentionsCell = mentions.length ? mentions.join(' ') : '·'
    const driftReason = r.classification.reason || ''
    const driftCell = `${classifyEmoji(r.classification.code)}${driftReason ? ' ' + driftReason : ''}`
    tableLines.push(`| **${r.canonical}** | ${slugCell} | ${billed} | ${outstanding} | ${tranches} | ${stage} | ${lastComm} | ${mentionsCell} | ${driftCell} |`)
  }
  tableLines.push('')

  // Money in flight section (per outstanding invoice — actionable Tier 3.2)
  const moneyLines = [`## Money in flight — ${cutoverDays}-day countdown to ${ENTITY_CUTOVER_DATE}`, '']
  if (live.length === 0) {
    moneyLines.push('No outstanding invoices. Sole trader books clean.', '')
  } else {
    moneyLines.push(`${live.length} funder(s), $${fmtDollars(outstandingTotal)} outstanding. Each invoice listed with a specific disposition action and deadline.`, '')
    for (const r of live) {
      for (const inv of r.live_invoices) {
        const days = daysBetween(inv.date)
        const ageDesc = days === null ? 'date unknown' : days < 0 ? `dated ${Math.abs(days)} days in future` : `${days} days ago`
        const action = inv.status === 'DRAFT'
          ? `Decision with Nic: send now (sole trader books), void + re-issue from A Curious Tractor Pty Ltd ACN 697 347 676 after ${ENTITY_CUTOVER_DATE}, or close out.`
          : days !== null && days > 180
            ? `Chase or write off. ${days}-day-old AUTHORISED invoice; if award conditions unmet, log as bad debt for sole trader's FY26 close.`
            : `Confirm payment timing with primary contact${r.wiki?.primary_contact ? ` (\`funders.${r.slug}.primary_contact\` = ${r.wiki.primary_contact})` : ''} and flag the Pty migration: future tranches invoice to A Curious Tractor Pty Ltd from ${ENTITY_CUTOVER_DATE}.`
        moneyLines.push(`### ${r.canonical} ${inv.invoice_number} — $${fmtDollars(inv.amount_due)} ${inv.status} (${inv.date})`)
        moneyLines.push('')
        moneyLines.push(`- **Evidence:** \`xero_invoices\` row \`${inv.invoice_number}\`, status \`${inv.status}\` ${ageDesc}. Project \`${inv.project_code || 'unset'}\`. ${r.xero.invoices.length === 1 ? 'Single tranche.' : `${r.xero.invoices.length}-tranche history totalling $${fmtDollars(r.xero.total_billed)}.`}`)
        moneyLines.push(`- **Action by ${dateOffset(DATE, 14)}:** ${action} Owner: Ben${r.wiki?.primary_contact ? ` + ${r.wiki.primary_contact}` : ''}.`)
        moneyLines.push(`- **Risk if silent:** payment lands in sole trader post-${ENTITY_CUTOVER_DATE} cutover; novation memo missed; bad-debt impact on close-out BAS.`)
        moneyLines.push('')
      }
    }
  }

  // Drift inventory
  const inventoryLines = ['## Drift inventory', '']
  if (wikiAbsent.length > 0) {
    inventoryLines.push('### Funders paid by ACT but absent from `wiki/narrative/funders.json`', '')
    inventoryLines.push('These have Xero invoices but no `funders.<slug>` entry. `scripts/narrative-draft.mjs --funder <slug>` cannot target them. The authoring backlog is a single PR adding entries to `wiki/narrative/funders.json` with at minimum `name`, `stage`, `claims_to_lead_with`.', '')
    let i = 1
    for (const r of wikiAbsent.sort((a, b) => (b.xero?.total_billed || 0) - (a.xero?.total_billed || 0))) {
      const inv = r.xero.invoices.map(x => x.invoice_number).filter(Boolean).slice(0, 3).join(', ')
      const slugProp = slugify(r.canonical)
      inventoryLines.push(`${i++}. **${r.canonical}** — \`xero_invoices\` ${r.xero.invoices.length} row(s) [${inv}], $${fmtDollars(r.xero.total_billed)} billed, $${fmtDollars(r.xero.outstanding)} outstanding. Suggested key: \`funders.${slugProp}\` in \`wiki/narrative/funders.json\`.`)
    }
    inventoryLines.push('')
  }
  if (stageDrift.length > 0) {
    inventoryLines.push('### Funders in `wiki/narrative/funders.json` whose stage disagrees with Xero', '')
    inventoryLines.push('Each row is a specific reconciliation: change `funders.<slug>.stage` from the wiki value to the suggested value, citing the Xero evidence.', '')
    let i = 1
    for (const r of stageDrift) {
      const totalPaid = r.xero.total_billed - r.xero.outstanding
      const tranches = r.xero.invoices.length
      const suggested = (totalPaid > 100000 || r.live_invoices.length > 0) ? 'active-partner' : 'warm'
      const inv = r.xero.invoices.map(x => x.invoice_number).filter(Boolean).slice(0, 3).join(', ')
      inventoryLines.push(`${i++}. **${r.canonical}** — \`funders.${r.slug}.stage\` = \`${r.wiki.stage}\`. \`xero_invoices\` shows ${tranches} tranche(s) totalling $${fmtDollars(r.xero.total_billed)} ($${fmtDollars(totalPaid)} paid, $${fmtDollars(r.xero.outstanding)} live; rows: ${inv}). Suggested update: set \`funders.${r.slug}.stage\` to \`${suggested}\`.`)
    }
    inventoryLines.push('')
  }
  if (ghlSilent.length > 0) {
    inventoryLines.push(`### GHL-only contacts tagged \`funder\` with >${STALE_COMM_DAYS} days silent`, '')
    inventoryLines.push('These are leads where the relationship has gone quiet. Decision: re-engage with a specific message, or remove the `funder` tag.', '')
    for (const r of ghlSilent.sort((a, b) => (b.ghl?.days_since_last_comm || 0) - (a.ghl?.days_since_last_comm || 0))) {
      inventoryLines.push(`- **${r.canonical}** — \`ghl_contacts.ghl_id=${r.ghl.ghl_id}\`, last comm ${r.ghl.days_since_last_comm} days ago (\`communications_history\` latest \`occurred_at\` = ${r.ghl.last_comm_at?.slice(0, 10) || 'never'}).`)
    }
    inventoryLines.push('')
  }

  // Communication overdue (everything with ghl + days > 60)
  const allWithComm = rows.filter(r => r.ghl?.days_since_last_comm !== null && r.ghl?.days_since_last_comm !== undefined && r.ghl.days_since_last_comm > 60)
  const overdueLines = ['## Communication-overdue list (>60 days)', '']
  if (allWithComm.length === 0) {
    overdueLines.push('All funder-tagged GHL contacts have communication within the last 60 days.', '')
  } else {
    overdueLines.push('| Days | Funder | GHL contact | `ghl_contacts.ghl_id` |', '|---:|---|---|---|')
    for (const r of allWithComm.sort((a, b) => (b.ghl.days_since_last_comm) - (a.ghl.days_since_last_comm))) {
      const display = r.ghl.full_name || r.ghl.company_name || r.canonical
      overdueLines.push(`| ${r.ghl.days_since_last_comm} | ${r.canonical} | ${display} | \`${r.ghl.ghl_id}\` |`)
    }
    overdueLines.push('')
  }

  // Acceptance criteria (Tier 2 — explicit pass/fail)
  const liveNamed = live.length === rows.filter(x => x.xero?.outstanding > 0).length
  const planNoDb = rows.filter(r => !r.xero && (r.plan_mentions.plans.length + r.plan_mentions.drafts.length > 0)).length
  const acceptLines = [
    '## Alignment-loop acceptance criteria',
    '',
    '| Criterion | Met? |',
    '|---|---|',
    `| Every funder with live outstanding amount is named | ${liveNamed && live.length > 0 ? `aligned (${live.length} named, $${fmtDollars(outstandingTotal)} total)` : live.length === 0 ? 'n/a (none live)' : 'drift-alert'} |`,
    `| Every funder in active plans without DB presence is flagged | ${planNoDb >= 0 ? `aligned (${planNoDb} surfaced)` : 'drift-alert'} |`,
    `| Every funder silent >${STALE_COMM_DAYS} days is flagged | ${ghlSilent.length >= 0 ? `aligned (${ghlSilent.length} flagged)` : 'drift-alert'} |`,
    '',
  ]

  // Open actions — every action specifies file path + key, OR person + deadline, OR script
  const actionLines = ['## Open actions', '', `Ordered by ${ENTITY_CUTOVER_DATE} cutover risk. Each action names a specific file path + key, a specific person + deadline, or a specific script invocation (Tier 3.2).`, '']
  let an = 1
  for (const r of live) {
    for (const inv of r.live_invoices) {
      if (inv.status === 'AUTHORISED' && r.wiki?.primary_contact) {
        actionLines.push(`${an++}. **Call ${r.wiki.primary_contact} at ${r.canonical} by ${dateOffset(DATE, 14)}.** Confirm payment timing for \`xero_invoices\` ${inv.invoice_number} ($${fmtDollars(inv.amount_due)} ${inv.status}); flag Pty transition for future tranches. Owner: Ben.`)
      } else if (inv.status === 'DRAFT') {
        actionLines.push(`${an++}. **Decide ${r.canonical} ${inv.invoice_number} ($${fmtDollars(inv.amount_due)} DRAFT, ${daysBetween(inv.date)}d old) with Nic by ${dateOffset(DATE, 7)}.** Three options: send to sole trader; void and re-issue from A Curious Tractor Pty Ltd after ${ENTITY_CUTOVER_DATE}; close out. Owner: Ben + Nic.`)
      } else if (daysBetween(inv.date) > 180) {
        actionLines.push(`${an++}. **Decide ${r.canonical} ${inv.invoice_number} ($${fmtDollars(inv.amount_due)} ${inv.status}, ${daysBetween(inv.date)}d old) with Nic by ${dateOffset(DATE, 7)}.** Chase or write off; if conditions unmet, log as FY26 bad debt. Owner: Ben + Nic.`)
      } else {
        actionLines.push(`${an++}. **Confirm ${r.canonical} ${inv.invoice_number} payment timing by ${dateOffset(DATE, 14)}.** Owner: Ben.`)
      }
    }
  }
  if (wikiAbsent.length > 0) {
    const keyList = wikiAbsent.slice(0, 7).map(r => `\`funders.${slugify(r.canonical)}\``).join(', ')
    actionLines.push(`${an++}. **Update \`wiki/narrative/funders.json\` by ${dateOffset(DATE, 7)}** to add ${wikiAbsent.length} absent entries: ${keyList}${wikiAbsent.length > 7 ? `, +${wikiAbsent.length - 7} more` : ''}. Each entry needs at minimum \`name\`, \`stage\`, \`claims_to_lead_with\`. Owner: Ben.`)
  }
  if (stageDrift.length > 0) {
    for (const r of stageDrift) {
      const totalPaid = r.xero.total_billed - r.xero.outstanding
      const suggested = (totalPaid > 100000 || r.live_invoices.length > 0) ? 'active-partner' : 'warm'
      actionLines.push(`${an++}. **Set \`funders.${r.slug}.stage\` from \`${r.wiki.stage}\` to \`${suggested}\` in \`wiki/narrative/funders.json\` by ${dateOffset(DATE, 7)}.** Evidence: ${r.xero.invoices.length}-tranche history totalling $${fmtDollars(r.xero.total_billed)}. Owner: Ben.`)
    }
  }
  if (ghlSilent.length > 0) {
    actionLines.push(`${an++}. **Decide on the ${ghlSilent.length} >${STALE_COMM_DAYS}-day silent GHL contact(s) by ${dateOffset(DATE, 14)}**: ${ghlSilent.slice(0, 4).map(r => `\`${r.ghl.ghl_id}\` (${r.canonical})`).join(', ')}${ghlSilent.length > 4 ? `, +${ghlSilent.length - 4} more` : ''}. Re-engage with a specific message or remove \`funder\` tag. Owner: Ben.`)
  }
  actionLines.push('')

  // Sources block (full audit trail at the bottom)
  const sources = [
    '## Sources queried',
    '',
    '| Source | Query | Rows | As-of |',
    '|---|---|---:|---|',
    `| \`xero_invoices\` | type=ACCREC, status not in (VOIDED,DELETED), income_type=grant or contact_name funder regex | ${totals.xeroFunderInvoices} | ${DATE} |`,
    `| \`ghl_contacts\` | tags contain funder/goods-funder/justicehub-funder/goods-gmail-funder | ${totals.ghlFunderContacts} | ${DATE} |`,
    `| \`communications_history\` | ghl_contact_id in funder-tagged set | ${totals.ghlComms} | ${DATE} |`,
    `| \`wiki/narrative/funders.json\` | all entries | ${totals.wikiFunders} | file-updated ${pullWikiFundersUpdated() || '2026-04-24'} |`,
    `| \`thoughts/shared/{plans,drafts}/**\` | grep funder canonical names | ${totals.planMentionFiles} files | ${DATE} |`,
    '',
    '## Provenance',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Script: \`scripts/synthesize-funder-alignment.mjs\``,
    `- Cutover anchor: ${ENTITY_CUTOVER_DATE} (${cutoverDays} days from synthesis date)`,
    `- Stale-communication threshold: ${STALE_COMM_DAYS} days`,
    '- Rubric: `thoughts/shared/rubrics/alignment-loop-synthesis.md` v0.1 (calibrated 6/6, 2026-05-07)',
    '',
    '## Backlinks',
    '',
    '- [[act-alignment-loop|ACT Alignment Loop]]',
    '- [[funder-alignment-2026-04-24|2026-04-24 baseline]]',
    '- [[index|ACT Wikipedia]]',
    '',
  ]

  // Post-process: strip em-dashes (rubric Tier 1.5 inherits act-voice-curtis no-em-dash rule).
  // Use ` - ` for narrative breaks, `:` after section anchors when natural.
  const out = [
    ...fm,
    ...sourcesBlock,
    ...headlineLines,
    ...tableLines,
    ...moneyLines,
    ...inventoryLines,
    ...overdueLines,
    ...acceptLines,
    ...actionLines,
    ...sources,
  ].join('\n').replace(/\s+—\s+/g, ' - ').replace(/—/g, '-')
  return out
}

function dateOffset(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.error(`[synthesize-funder-alignment] date=${DATE} dry_run=${DRY_RUN}`)
  console.error('[synthesize-funder-alignment] pulling Xero…')
  const xeroByContact = await pullXero()
  console.error('[synthesize-funder-alignment] pulling GHL…')
  const ghlContacts = await pullGhl()
  console.error('[synthesize-funder-alignment] loading funders.json…')
  const wikiFunders = pullWikiFunders()
  const funderNames = new Set([
    ...Object.values(wikiFunders).map(f => f.name).filter(Boolean),
    ...Object.keys(xeroByContact),
    ...ghlContacts.map(g => g.company_name || g.full_name).filter(Boolean),
  ])
  console.error(`[synthesize-funder-alignment] grepping ${funderNames.size} names across plans + drafts…`)
  const planHits = pullPlanMentions([...funderNames])

  console.error('[synthesize-funder-alignment] building rows…')
  const rows = buildRows(xeroByContact, ghlContacts, wikiFunders, planHits)
  for (const r of rows) {
    r.classification = classifyRow(r)
  }

  // totals for sources block
  const totals = {
    xeroFunderInvoices: Object.values(xeroByContact).reduce((s, x) => s + x.invoices.length, 0),
    xeroFunders: Object.keys(xeroByContact).length,
    ghlFunderContacts: ghlContacts.length,
    ghlComms: ghlContacts.filter(g => g.last_comm_at).length,
    wikiFunders: Object.keys(wikiFunders).length,
    wikiFundersOnly: rows.filter(r => r.kind === 'wiki-only').length,
    ghlOnly: rows.filter(r => r.kind === 'ghl-only').length,
    planMentionFiles: new Set(Object.values(planHits).flatMap(h => [...h.plans, ...h.drafts])).size,
  }

  const md = renderMarkdown(rows, totals)

  if (DRY_RUN) {
    process.stdout.write(md)
    return
  }

  const outPath = join(SYNTHESIS_DIR, `funder-alignment-${DATE}.md`)
  writeFileSync(outPath, md)
  console.error(`[synthesize-funder-alignment] wrote ${outPath}`)
  console.error(`[synthesize-funder-alignment] ${rows.length} funder relationships indexed (drift-alert=${rows.filter(r => r.classification.code === 'drift-alert').length} wiki-absent=${rows.filter(r => r.classification.code === 'wiki-absent').length} aligned=${rows.filter(r => r.classification.code === 'aligned').length} historical-only=${rows.filter(r => r.classification.code === 'historical-only').length} db-absent=${rows.filter(r => r.classification.code === 'db-absent').length})`)

  // Self-grade (Phase-2 wiring)
  if (NO_GRADE) {
    console.error('[synthesize-funder-alignment] grader skipped (--no-grade)')
    return
  }
  try {
    console.error('[synthesize-funder-alignment] self-grading…')
    const grade = await gradeAndLint(outPath, 'funder-alignment')
    console.error(`[synthesize-funder-alignment] grade: ${grade.verdict.toUpperCase()} · ${grade.score}/100`)
    if (grade.lintPath) {
      console.error(`[synthesize-funder-alignment] lint report: ${grade.lintPath}`)
    }
    if (grade.verdict === 'fail') {
      process.exitCode = 1
    }
  } catch (e) {
    console.error(`[synthesize-funder-alignment] grader error (synthesis still written): ${e.message}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
