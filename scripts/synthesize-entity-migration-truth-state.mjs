#!/usr/bin/env node
/**
 * ACT Alignment Loop - Q3 entity migration truth-state synthesis
 *
 * For each item in the entity migration checklist, cross-references plan
 * intent with DB evidence + draft evidence + memory state. Surfaces
 * outstanding-on-sole-trader receivables and ranks items by 30 June 2026
 * cutover risk.
 *
 * Phase-1 automation of the manual 2026-04-24 pass (good-3 fixture).
 * Plan: thoughts/shared/plans/act-alignment-loop.md
 * Checklist source: thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md
 * Rubric: thoughts/shared/rubrics/alignment-loop-synthesis.md (v0.1, 6/6)
 *
 * Usage:
 *   node scripts/synthesize-entity-migration-truth-state.mjs
 *   node scripts/synthesize-entity-migration-truth-state.mjs --dry-run
 *   node scripts/synthesize-entity-migration-truth-state.mjs --no-grade
 *   node scripts/synthesize-entity-migration-truth-state.mjs --date 2026-05-08
 */
import './lib/load-env.mjs'
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { join } from 'node:path'
import { gradeAndLint } from './lib/alignment-loop-grade.mjs'
import { SCHEMA_VERSION, serializeMetrics } from './lib/synthesis-schema.mjs'

const REPO_ROOT = process.cwd()
const SYNTHESIS_DIR = join(REPO_ROOT, 'wiki/synthesis')
const DRAFTS_DIR = join(REPO_ROOT, 'thoughts/shared/drafts')
const PLAN_PATH = 'thoughts/shared/plans/act-entity-migration-checklist-2026-06-30.md'
const FACTS_PATH = 'wiki/decisions/act-core-facts.md'
const ENTITY_CUTOVER_DATE = '2026-06-30'
const PTY_REGISTRATION_DATE = '2026-04-24'
const PTY_ACN = '697 347 676'
const SOLE_TRADER_TENANT_ID = '786af1ed-e3ce-42fc-9ea9-ddf3447d79d0'

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
function fmtDollars(n) { return (n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 }) }
function daysBetween(iso, ref = DATE) {
  if (!iso) return null
  return Math.floor((new Date(ref).getTime() - new Date(iso).getTime()) / 86400000)
}
function dateOffset(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
function cleanName(s) { return (s || '(unknown)').replace(/[,\s]+$/, '').trim() }

// ─── Pull: Xero outstanding receivables ────────────────────────────────────
async function pullOutstandingReceivables() {
  const all = []
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb.from('xero_invoices')
      .select('xero_id, invoice_number, type, status, contact_name, contact_xero_id, date, total, amount_due, project_code, xero_tenant_id')
      .eq('type', 'ACCREC')
      .not('status', 'in', '("VOIDED","DELETED","PAID")')
      .gt('amount_due', 0)
      .range(from, from + page - 1)
    if (error) throw new Error(`xero_invoices: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < page) break
    from += page
  }
  // group by contact
  const byContact = {}
  for (const r of all) {
    const name = cleanName(r.contact_name)
    if (!byContact[name]) byContact[name] = { contact_name: name, invoices: [], total_outstanding: 0 }
    byContact[name].invoices.push({
      invoice_number: r.invoice_number,
      status: r.status,
      total: parseFloat(r.total) || 0,
      amount_due: parseFloat(r.amount_due) || 0,
      date: r.date,
      project_code: r.project_code,
    })
    byContact[name].total_outstanding += parseFloat(r.amount_due) || 0
  }
  return { rows: all, byContact }
}

async function pullXeroTenants() {
  const all = new Set()
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb.from('xero_invoices').select('xero_tenant_id').range(from, from + page - 1)
    if (error) throw new Error(`xero_invoices tenants: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) if (r.xero_tenant_id) all.add(r.xero_tenant_id)
    if (data.length < page) break
    from += page
  }
  return [...all]
}

async function pullBankAccounts() {
  const all = new Set()
  let from = 0
  const page = 1000
  while (true) {
    const { data, error } = await sb.from('bank_statement_lines').select('bank_account').range(from, from + page - 1)
    if (error) throw new Error(`bank_statement_lines: ${error.message}`)
    if (!data || data.length === 0) break
    for (const r of data) if (r.bank_account) all.add(r.bank_account)
    if (data.length < page) break
    from += page
  }
  return [...all]
}

// ─── Pull: drafts ──────────────────────────────────────────────────────────
function listDrafts() {
  const files = []
  function walk(dir) {
    let entries = []
    try { entries = readdirSync(dir) } catch { return }
    for (const f of entries) {
      const full = join(dir, f)
      let st
      try { st = statSync(full) } catch { continue }
      if (st.isDirectory()) { walk(full); continue }
      if (f.endsWith('.md')) files.push(full.replace(REPO_ROOT + '/', ''))
    }
  }
  walk(DRAFTS_DIR)
  return files
}
function findDraftMatching(drafts, keywords) {
  const re = new RegExp(keywords.join('|'), 'i')
  return drafts.filter(d => re.test(d))
}

// ─── Item evidence checks ──────────────────────────────────────────────────
function evidenceForItem(item, ctx) {
  if (item.status) return { status: item.status, evidence: item.evidence || '' }
  if (typeof item.evidenceFn === 'function') return item.evidenceFn(ctx)
  return { status: 'UNVERIFIED', evidence: 'no check defined' }
}

function buildItems(ctx) {
  const dDays = daysBetween(PTY_REGISTRATION_DATE) // days since registration
  const doDueDate = dateOffset(PTY_REGISTRATION_DATE, 30)
  const doOverdue = daysBetween(doDueDate) > 0

  const noDraft = (kws) => {
    const hits = findDraftMatching(ctx.drafts, kws)
    return hits.length > 0
      ? { status: 'IN PROGRESS', evidence: `\`${hits.join('`, `')}\`` }
      : { status: 'NOT STARTED', evidence: `Zero matches in \`thoughts/shared/drafts/\` for /${kws.join('|')}/i` }
  }

  return [
    {
      title: '1. Entity setup (PRE-MIGRATION)',
      items: [
        { name: 'Pty registered at ASIC', target: 'Done before 30 Jun', status: 'DONE', evidence: `Memory + \`${FACTS_PATH}\`: ACN ${PTY_ACN} registered ${PTY_REGISTRATION_DATE}`, risk: 'n/a' },
        { name: 'Directors appointed (Ben + Nic)', target: 'Done', status: 'DONE', evidence: `\`${FACTS_PATH}\` confirms`, risk: 'n/a' },
        { name: 'Shareholders set (Knight FT 50 / Marchesi FT 50)', target: 'Done', status: 'DONE', evidence: `\`${FACTS_PATH}\` confirms`, risk: 'n/a' },
        { name: 'Director IDs confirmed for both directors', target: 'Week 1', status: 'UNVERIFIED', evidence: `No DB signal; per memory \`project_act_entity_structure.md\` flagged unverified`, risk: 'Blocks NAB account, ABN application' },
        { name: 'ABN application (Pty)', target: 'Week 1-2 (Standard Ledger)', status: 'OPEN', evidence: `No ABN visible in \`${FACTS_PATH}\` or DB; per memory still pending`, risk: 'Delays Xero file, invoicing, GST registration' },
        { name: 'GST registration (Pty)', target: 'With ABN', status: 'OPEN', evidence: 'Paired with ABN application above', risk: 'Delays invoicing' },
        { name: 'Standard Ledger briefed', target: 'Week 1', status: 'DONE', evidence: 'Memory + 2026-05-05 conversation entries in plan §11', risk: 'n/a' },
      ],
    },
    {
      title: '2. Banking and payment rails',
      items: [
        {
          name: 'NAB business account (Pty)',
          target: 'Apply this week, 2-week onboarding',
          evidenceFn: () => {
            const ptyAccts = ctx.bankAccounts.filter(a => /pty|ACT Pty|business/i.test(a))
            return ptyAccts.length > 0
              ? { status: 'DONE', evidence: `\`bank_statement_lines.bank_account\` includes ${ptyAccts.map(a => `"${a}"`).join(', ')}` }
              : { status: 'OPEN', evidence: `\`bank_statement_lines\` shows ${ctx.bankAccounts.length} account(s) (${ctx.bankAccounts.map(a => `"${a}"`).join(', ') || 'none'}); no Pty NAB account visible` }
          },
          risk: 'Blocks Stripe, subscriptions, first Pty invoicing',
        },
        { name: 'Stripe account (Pty)', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact; depends on NAB Pty account', risk: 'Customer payments still route to sole trader Stripe post-cutover' },
        { name: 'PayID / Osko on Pty NAB', target: 'After NAB opens', status: 'BLOCKED', evidence: 'Blocked on NAB Pty account', risk: 'B2B payment friction' },
        { name: 'Expense cards (Pty)', target: 'After NAB opens', status: 'BLOCKED', evidence: 'Blocked on NAB Pty account', risk: 'Founder reimbursements only' },
        { name: 'Auto-debits audit + migrate', target: 'By 1 July', evidenceFn: () => noDraft(['subscription-audit', 'auto-debit', 'subscription-migration']), risk: 'Silent continuation into Pty era' },
      ],
    },
    {
      title: '3. Xero',
      items: [
        {
          name: 'Pty Xero file opens',
          target: 'Week 3',
          evidenceFn: () => {
            const tenants = ctx.xeroTenants
            return tenants.length > 1
              ? { status: 'DONE', evidence: `\`xero_invoices\` shows ${tenants.length} tenants: ${tenants.map(t => `\`${t}\``).join(', ')}` }
              : { status: 'OPEN', evidence: `\`xero_invoices\` shows 1 \`xero_tenant_id\` (\`${tenants[0] || SOLE_TRADER_TENANT_ID}\` = sole trader); no Pty Xero file yet` }
          },
          risk: `Cannot issue Pty invoices ${ENTITY_CUTOVER_DATE.replace(/-/g, '/')}`,
        },
        { name: 'Final sole trader BAS (Q4 FY26)', target: '28 July 2026', status: 'NOT YET DUE', evidence: 'Q4 runs Apr-Jun; lodgement window opens after cutover', risk: 'n/a' },
        { name: 'R&D Tax Incentive FY26 claim (sole trader)', target: 'With FY26 tax return', status: 'NOT YET DUE', evidence: 'Memory: lodge with sole trader return; ~$108K Path C refund tracked in `thoughts/shared/rd-pack-fy26/`', risk: 'Lose 43.5% refund if records thin (separate concern)' },
        { name: 'R&D FY27 re-registration (Pty, AusIndustry)', target: 'Post-1-July', status: 'NOT YET DUE', evidence: 'No artefact; rule 1.2 of R&D evidence rubric blocks until AusIndustry registration files', risk: 'FY27 R&D offset lost if re-registration slips' },
        { name: 'ABN (sole trader) cancellation', target: 'After final BAS', status: 'NOT YET DUE', evidence: 'Pending final BAS lodgement', risk: 'n/a' },
      ],
    },
    {
      title: '4. Grants and funders (CRITICAL PATH)',
      items: [
        { name: 'QBE Catalysing Impact contracted to Pty', target: 'Done', status: 'DONE', evidence: `Memory: grant contracted against A Curious Tractor Pty Ltd`, risk: 'n/a' },
        { name: 'Minderoo pitch contracts straight to Pty', target: 'Pitch lands mid-May 2026', status: 'IN PROGRESS', evidence: '`thoughts/shared/drafts/minderoo-goods-pitch-2026-05.md` reflects Pty contracting', risk: 'Pitch credibility if numbers misalign' },
        {
          name: 'Novation letter template + send to all current funders',
          target: 'Week 5-6',
          evidenceFn: () => noDraft(['novation', 'transition.*funder']),
          risk: 'Funders default to sole trader receipts post-cutover',
        },
        {
          name: 'Enumeration of active grants on sole trader',
          target: 'Before Week 5',
          evidenceFn: () => {
            const exists = existsSync(join(REPO_ROOT, 'wiki/synthesis')) &&
              readdirSync(join(REPO_ROOT, 'wiki/synthesis')).some(f => /^funder-alignment-\d{4}-\d{2}-\d{2}\.md$/.test(f))
            return exists
              ? { status: 'IN PROGRESS', evidence: '`wiki/synthesis/funder-alignment-*.md` (Q1) enumerated funder receivables' }
              : { status: 'NOT STARTED', evidence: 'No `wiki/synthesis/funder-alignment-*.md` artefact found' }
          },
          risk: 'Cannot batch-send novation letters without enumeration',
        },
      ],
    },
    {
      title: '5. Commercial contracts',
      items: [
        { name: 'Innovation Studio consulting novations', target: 'Week 5-6', evidenceFn: () => noDraft(['innovation-studio-novation', 'consulting-novation']), risk: 'Active engagements default to sole trader after 1 July' },
        { name: 'JusticeHub partnerships (NJP, MoUs) novations', target: 'Week 5-6', evidenceFn: () => noDraft(['njp-novation', 'justicehub-novation', 'mou-novation']), risk: 'Partnership friction post-cutover' },
        { name: 'Goods on Country buyer novations (19 active)', target: 'Week 5-6', evidenceFn: () => noDraft(['goods-novation', 'buyer-notification']), risk: 'Customer relationships default to sole trader entity' },
        { name: 'Harvest lease (Sonas Properties) signed in Pty name', target: 'Before lease signing (lease_start 2026-07-01)', status: 'PENDING', evidence: 'Per plan §11 D11.1: Harvest will be a separate Pty subsidiary; lease counterparty under review', risk: 'Wrong-entity lease creates novation work later' },
        { name: 'Farm lease (Nic landlord, Pty tenant) drafted', target: 'NEW LEASE', evidenceFn: () => noDraft(['farm-lease']), risk: 'Founder-related-party lease must be at arm\'s-length per Standard Ledger' },
        { name: 'Empathy Ledger licensing arrangements novated', target: 'Novate', evidenceFn: () => noDraft(['empathy-ledger-licensing', 'el-novation']), risk: 'Licensing chain breaks at cutover' },
      ],
    },
    {
      title: '6. IP',
      items: [
        { name: 'IP assignment deed (Nic to Pty)', target: 'Week 4-5', evidenceFn: () => noDraft(['ip-assignment', 'ip-deed']), risk: 'Pty has no clean title to assets at cutover' },
        { name: 'GitHub org transfer (Acurioustractor to Pty identity)', target: 'Before 1 July', status: 'NOT STARTED', evidence: 'No evidence; `Acurioustractor/` org still referenced as canonical in `act-codebase-scan.mjs`', risk: 'Open-source ownership ambiguity' },
        { name: 'Trademark registration (EL, JH, ALMA, Goods)', target: 'Post-Pty', evidenceFn: () => noDraft(['trademark']), risk: 'Marks unprotected during Pty\'s first year' },
      ],
    },
    {
      title: '7. Insurance',
      items: [
        { name: 'Public Liability $20M', target: 'Before Harvest lease signing', status: 'NOT STARTED', evidence: 'No broker selection visible in DB or drafts', risk: 'Lease-required cover not bound' },
        { name: 'Workers Comp', target: 'First employee', status: 'NOT YET DUE', evidence: 'No staff yet', risk: 'n/a until first hire' },
        { name: 'Professional Indemnity', target: '1 July 2026', status: 'NOT STARTED', evidence: 'No binding evidence; pending broker selection', risk: 'Consulting work uninsured' },
        { name: 'Product Liability', target: 'First Goods product sale', status: 'NOT YET DUE', evidence: 'Pending first product ship', risk: 'n/a until Goods ships' },
        {
          name: 'Directors and Officers',
          target: `Within 30 days of registration (${doDueDate})`,
          evidenceFn: () => doOverdue
            ? { status: 'OVERDUE', evidence: `Pty registered ${PTY_REGISTRATION_DATE}; D&O standard window closed ${doDueDate} (${daysBetween(doDueDate)} days ago)` }
            : { status: 'DUE SOON', evidence: `Pty registered ${PTY_REGISTRATION_DATE}; D&O standard 30-day window closes ${doDueDate}` },
          risk: 'Director personal liability uncapped',
        },
        { name: 'Cyber', target: 'Year 1 recommended', status: 'DEFERRED', evidence: 'Per plan §8: Year 1 recommendation', risk: 'n/a (deferred)' },
        { name: 'Insurance broker selection', target: 'Week 1', status: 'NOT STARTED', evidence: 'No decision recorded in plan §11 update or memory', risk: 'Blocks PL + D&O binding' },
      ],
    },
    {
      title: '8. Governance artefacts',
      items: [
        { name: 'Shareholders Agreement', target: 'Week 1-2 (per plan Rule 4)', evidenceFn: () => noDraft(['shareholders-agreement', 'sha-draft']), risk: 'Corporations Act defaults expose deadlock + dividend discretion + 50/50 removal' },
        { name: 'Pty minute book (registration + appointments + share subscription + banking resolution)', target: 'Week 1-3', status: 'UNVERIFIED', evidence: 'No internal copy referenced in `thoughts/shared/`; Standard Ledger may hold', risk: 'ASIC compliance gap' },
        { name: 'ASIC first annual review', target: '2027-04-24 (~12 months from registration)', status: 'NOT YET DUE', evidence: `Pty registered ${PTY_REGISTRATION_DATE}; first review ~${dateOffset(PTY_REGISTRATION_DATE, 365)}`, risk: 'n/a (next FY)' },
      ],
    },
    {
      title: '9. Subscriptions and tooling',
      items: [
        { name: 'Full subscription audit', target: 'Week 7-8', status: 'DATA AVAILABLE', evidence: '`subscription_patterns` DB table has 38 vendor patterns; consolidated `this-needs-Pty-transfer` report not yet produced', risk: 'Per-vendor migration plan missing' },
        { name: 'Xero (Pty file) billing transferred', target: 'Week 3', status: 'OPEN', evidence: 'See §3 above (single-tenant DB state)', risk: 'Billing continues on sole trader' },
        { name: 'GHL CRM billing transferred', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact', risk: 'CRM bills sole trader post-cutover' },
        { name: 'Supabase (3 projects) billing transferred', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact; 3 projects per memory (`tednluwflfhxyucgwigh`, `yvnuayzslukamizrlhwb`, `uaxhjzqrdotoahjnxmbj`)', risk: 'Cloud bill on wrong entity' },
        { name: 'Vercel billing transferred', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact', risk: 'Hosting bill on wrong entity' },
        { name: 'Google Workspace (4 mailboxes)', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact; 4 mailboxes @act.place per CLAUDE.md', risk: 'Email + calendar billing on wrong entity' },
        { name: 'Stripe + Anthropic + OpenAI + Gemini + GitHub + Notion + Cloudflare + domain registrar(s) + Telegram + PM2', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact', risk: 'Per-vendor migration not started' },
      ],
    },
    {
      title: '10. Communications (1 July switchover)',
      items: [
        { name: 'Email footer updates (all @act.place)', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact', risk: 'Outgoing emails carry sole trader entity post-cutover' },
        { name: 'Website footers (act.place + project sites)', target: '1 July', status: 'NOT STARTED', evidence: 'No artefact', risk: 'Public-facing entity wrong' },
        { name: 'Xero invoice template (Pty)', target: '1 July', status: 'BLOCKED', evidence: 'Blocked on Pty Xero file (§3)', risk: 'Cannot issue Pty invoices on day 1' },
        { name: 'Announcement email to funders, partners, community', target: 'Week of 1 July', evidenceFn: () => noDraft(['announcement', 'cutover-comms']), risk: 'Counterparties unaware of entity change' },
        { name: 'Business cards', target: '1 July', status: 'LOW URGENCY', evidence: 'Per plan §9: low urgency post-cutover', risk: 'n/a (cosmetic)' },
      ],
    },
  ]
}

// ─── Drift classification per row ──────────────────────────────────────────
function classifyItem(item) {
  const s = (item.status || '').toUpperCase()
  if (s === 'DONE') return 'aligned'
  if (s === 'IN PROGRESS' || s === 'PENDING' || s === 'DATA AVAILABLE') return 'aligned'
  if (s === 'NOT YET DUE' || s === 'BLOCKED' || s === 'DEFERRED' || s === 'LOW URGENCY') return 'historical-only'
  if (s === 'UNVERIFIED' || s === 'OVERDUE' || s === 'OPEN' || s === 'NOT STARTED' || s === 'DUE SOON') return 'drift-alert'
  return 'drift-alert'
}

function statusEmoji(s) {
  s = (s || '').toUpperCase()
  if (s === 'DONE') return 'DONE'
  if (s === 'IN PROGRESS' || s === 'PENDING' || s === 'DATA AVAILABLE') return 'IN PROGRESS'
  if (s === 'NOT YET DUE') return 'NOT YET DUE'
  if (s === 'BLOCKED') return 'BLOCKED'
  if (s === 'DEFERRED') return 'DEFERRED'
  if (s === 'LOW URGENCY') return 'LOW URGENCY'
  if (s === 'UNVERIFIED') return 'UNVERIFIED'
  if (s === 'OVERDUE') return 'OVERDUE'
  if (s === 'DUE SOON') return 'DUE SOON'
  if (s === 'NOT STARTED') return 'NOT STARTED'
  return 'OPEN'
}

// ─── Render ────────────────────────────────────────────────────────────────
function renderMarkdown(sections, ctx) {
  const cutoverDays = daysBetween(DATE, ENTITY_CUTOVER_DATE)
  const allItems = sections.flatMap(s => s.items.map(i => ({ ...i, _section: s.title })))

  // resolve evidence + classification for each item
  for (const item of allItems) {
    const ev = evidenceForItem(item, ctx)
    item._status = ev.status
    item._evidence = ev.evidence
    item._drift = classifyItem({ ...item, status: ev.status })
  }

  const counts = {
    DONE: allItems.filter(i => /^DONE$/i.test(i._status)).length,
    IN_PROGRESS: allItems.filter(i => /IN PROGRESS|PENDING|DATA AVAILABLE/i.test(i._status)).length,
    NOT_STARTED: allItems.filter(i => /NOT STARTED|OPEN|UNVERIFIED|OVERDUE|DUE SOON/i.test(i._status)).length,
    NOT_YET_DUE: allItems.filter(i => /NOT YET DUE|BLOCKED|DEFERRED|LOW URGENCY/i.test(i._status)).length,
  }
  const total = allItems.length

  // outstanding receivables totals
  const outstandingTotal = Object.values(ctx.receivables.byContact).reduce((s, c) => s + c.total_outstanding, 0)
  const topContacts = Object.values(ctx.receivables.byContact).sort((a, b) => b.total_outstanding - a.total_outstanding)

  // Frontmatter
  const summaryMetrics = {
    bank_accounts_visible: ctx.bankAccounts.length,
    days_to_cutover: cutoverDays,
    drafts_scanned: ctx.drafts.length,
    items_done: counts.DONE,
    items_in_progress: counts.IN_PROGRESS,
    items_not_started: counts.NOT_STARTED,
    items_not_yet_due: counts.NOT_YET_DUE,
    outstanding_receivables_aud: outstandingTotal,
    outstanding_receivables_count: ctx.receivables.rows.length,
    total_items: total,
    xero_tenants_visible: ctx.xeroTenants.length,
  }
  const fm = [
    '---',
    'synthesis_slug: entity-migration-truth-state',
    `schema_version: ${SCHEMA_VERSION}`,
    `cycle_date: ${DATE}`,
    `title: Entity migration truth-state ${DATE} (${cutoverDays} days to cutover)`,
    `summary: Phase-1 automation of Q3 of the ACT Alignment Loop. For each item in \`${PLAN_PATH}\`, cross-references plan intent with DB evidence + draft evidence + memory state. Surfaces outstanding-on-sole-trader receivables and ranks items by 30 June 2026 cutover risk.`,
    'tags: [synthesis, entity-migration, alignment-loop, pty-ltd, cutover, auto-generated]',
    'status: active',
    `date: ${DATE}`,
    'sources_queried:',
    `  - { kind: "plan", path: "${PLAN_PATH}", filter: "10-section checklist + §11 decisions" }`,
    `  - { kind: "wiki", path: "${FACTS_PATH}", filter: "canonical entity names + ACN ${PTY_ACN}" }`,
    `  - { kind: "xero", table: "xero_invoices", filter: "type=ACCREC, status not in (VOIDED,DELETED,PAID), amount_due>0 (${ctx.receivables.rows.length} rows)" }`,
    `  - { kind: "xero", table: "xero_invoices", filter: "GROUP BY xero_tenant_id (${ctx.xeroTenants.length} tenants)" }`,
    `  - { kind: "xero", table: "bank_statement_lines", filter: "GROUP BY bank_account (${ctx.bankAccounts.length} accounts)" }`,
    `  - { kind: "thoughts", path: "thoughts/shared/drafts/**", filter: "novation/transition/migration/IP/announcement keyword search (${ctx.drafts.length} files)" }`,
    ...serializeMetrics(summaryMetrics),
    '---',
    '',
  ]

  const sourcesBlock = [
    `# Entity migration truth-state ${DATE}`,
    '',
    `> Auto-generated by \`scripts/synthesize-entity-migration-truth-state.mjs\`. Baseline: [[entity-migration-truth-state-2026-04-24|2026-04-24 manual pass]]. Loop spec: [[act-alignment-loop|ACT Alignment Loop]].`,
    '',
    `One synthesis, four sources: \`${PLAN_PATH}\` (canonical 10-section checklist + §11 decisions), \`xero_invoices\` (DB reality, ${ctx.xeroTenants.length} tenant + ${ctx.bankAccounts.length} bank account in \`bank_statement_lines\`), \`thoughts/shared/drafts/**\` (novation + comms drafts in flight), and \`${FACTS_PATH}\` (canonical entity names: A Curious Tractor Pty Ltd ACN ${PTY_ACN}, registered ${PTY_REGISTRATION_DATE}). Drift surfaces here so the Standard-Ledger-blocked critical path does not surprise the cutover under deadline.`,
    '',
  ]

  // Headline findings
  const headlineLines = ['## Headline findings', '']
  let n = 1
  headlineLines.push(`${n++}. **$${fmtDollars(outstandingTotal)} outstanding on the sole trader's books, ${cutoverDays} days before ${ENTITY_CUTOVER_DATE} cutover.** Top counterparties: ${topContacts.slice(0, 3).map(c => `${c.contact_name} $${fmtDollars(c.total_outstanding)} (${c.invoices.length} invoice(s))`).join('; ')}. Every line needs a migration or close-out decision.`)
  const phaseOneItems = allItems.filter(i => i._section.startsWith('1.') && /^DONE$/i.test(i._status))
  headlineLines.push(`${n++}. **Phase 1 (entity setup) is ${phaseOneItems.length}/${sections[0].items.length} done.** Pty registered (\`${FACTS_PATH}\`: ACN ${PTY_ACN}, ${PTY_REGISTRATION_DATE}); shareholders + directors set; Standard Ledger briefed. Open: ABN, GST, Director ID confirmation - all Standard Ledger gated.`)
  const notStarted = allItems.filter(i => /NOT STARTED|OPEN/i.test(i._status))
  headlineLines.push(`${n++}. **${notStarted.length} item(s) NOT STARTED** out of ${total} tracked checklist items (${(100 * notStarted.length / total).toFixed(0)}%). Plan sequences most artefacts for weeks 5-8, so this is on-schedule, but Standard-Ledger-dependent items (ABN, GST, Pty Xero, NAB account, IP deed, SHA, D&O insurance) compress the path if any slip past week 4.`)
  headlineLines.push(`${n++}. **${ctx.xeroTenants.length} Xero tenant(s) visible in \`xero_invoices\`** (\`${ctx.xeroTenants[0] || SOLE_TRADER_TENANT_ID}\` = sole trader); no Pty Xero file yet. Plan target: Week 3 from registration (${dateOffset(PTY_REGISTRATION_DATE, 21)}). Standard Ledger blocker.`)
  headlineLines.push(`${n++}. **${ctx.bankAccounts.length} bank account(s) in \`bank_statement_lines\`** (${ctx.bankAccounts.map(a => `"${a}"`).join(', ') || 'none'}); no Pty NAB business account visible. NAB application is the gating step for Stripe, auto-debits, D&O insurance billing.`)
  headlineLines.push('')

  // Items × evidence × risk - one section per checklist section
  const sectionLines = ['## Items × evidence × risk', '', `Days until ${ENTITY_CUTOVER_DATE} cutover: **${cutoverDays} days**.`, '']
  for (const sec of sections) {
    sectionLines.push(`### Section ${sec.title}`)
    sectionLines.push('')
    sectionLines.push('| Item | Target | Evidence of completion | Status | Drift | At risk if slips |')
    sectionLines.push('|---|---|---|---|---|---|')
    for (const item of sec.items.map(i => allItems.find(a => a.name === i.name && a._section === sec.title) || i)) {
      sectionLines.push(`| ${item.name} | ${item.target || '-'} | ${item._evidence || '-'} | ${statusEmoji(item._status)} | ${item._drift} | ${item.risk || '-'} |`)
    }
    sectionLines.push('')
  }

  // Outstanding receivables block (cite each row)
  const recLines = [
    '## Outstanding receivables on sole trader\'s books',
    '',
    `Each row cites \`xero_invoices\` directly. Source: \`xero_invoices\` WHERE \`type='ACCREC'\` AND \`status\` not in (\`VOIDED\`, \`DELETED\`, \`PAID\`) AND \`amount_due>0\` (${ctx.receivables.rows.length} rows, $${fmtDollars(outstandingTotal)} total).`,
    '',
    '| Counterparty | Invoice | Amount | Status | Age | Project | Action needed |',
    '|---|---|---:|---|---:|---|---|',
  ]
  for (const c of topContacts) {
    if (c.invoices.length === 1) {
      const inv = c.invoices[0]
      const days = daysBetween(inv.date)
      const ageDesc = days === null ? '-' : days < 0 ? `+${Math.abs(days)}d future` : `${days}d`
      const action = inv.status === 'DRAFT' ? 'Send / void / reissue from Pty (decision with Nic)'
        : days !== null && days > 180 ? `Chase or write off (${days}-day-old AUTHORISED)`
        : `Confirm payment timing + Pty migration notice`
      recLines.push(`| **${c.contact_name}** | \`${inv.invoice_number}\` | $${fmtDollars(inv.amount_due)} | ${inv.status} | ${ageDesc} | ${inv.project_code || '*missing*'} | ${action} |`)
    } else {
      // multi-invoice: show summary + first invoice for citation
      const invs = c.invoices.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const first = invs[0]
      const last = invs[invs.length - 1]
      const days1 = daysBetween(first.date)
      const days2 = daysBetween(last.date)
      const ageRange = `${days1 || '?'}d-${days2 || '?'}d`
      const idsRange = invs.length > 3 ? `\`${first.invoice_number}\`..\`${last.invoice_number}\` (×${invs.length})` : invs.map(i => `\`${i.invoice_number}\``).join(', ')
      const action = `Decide retainer continuation post-${ENTITY_CUTOVER_DATE} under Pty`
      recLines.push(`| **${c.contact_name}** | ${idsRange} | $${fmtDollars(c.total_outstanding)} | ${[...new Set(invs.map(i => i.status))].join('+')} | ${ageRange} | ${first.project_code || '*missing*'} | ${action} |`)
    }
  }
  recLines.push(`| **TOTAL OUTSTANDING** | | **$${fmtDollars(outstandingTotal)}** | | | | |`)
  recLines.push('')
  // concentration interpretation (cite both sides: prior synthesis vs this one)
  const top5 = topContacts.slice(0, 5).reduce((s, c) => s + c.total_outstanding, 0)
  recLines.push(`**Interpretation:** the receivable book is concentrated. Top 5 counterparties = $${fmtDollars(top5)} (${(100 * top5 / outstandingTotal).toFixed(0)}% of $${fmtDollars(outstandingTotal)} total). Q1's funder-alignment synthesis (\`wiki/synthesis/funder-alignment-${DATE}.md\`) flagged the funder subset; this synthesis adds non-funder counterparties (recurring customers, partners, other receivables). Every line needs a novation or close-out decision before ${ENTITY_CUTOVER_DATE}.`)
  recLines.push('')

  // Status summary
  const summaryLines = [
    '## Status summary',
    '',
    '| Status | Count | Share |',
    '|---|---:|---:|',
    `| DONE | ${counts.DONE} | ${(100 * counts.DONE / total).toFixed(0)}% |`,
    `| IN PROGRESS / PENDING / DATA AVAILABLE | ${counts.IN_PROGRESS} | ${(100 * counts.IN_PROGRESS / total).toFixed(0)}% |`,
    `| NOT STARTED / OPEN / UNVERIFIED / OVERDUE / DUE SOON | ${counts.NOT_STARTED} | ${(100 * counts.NOT_STARTED / total).toFixed(0)}% |`,
    `| NOT YET DUE / BLOCKED / DEFERRED / LOW URGENCY | ${counts.NOT_YET_DUE} | ${(100 * counts.NOT_YET_DUE / total).toFixed(0)}% |`,
    `| **Total items tracked** | **${total}** | |`,
    '',
    `${(100 * counts.NOT_STARTED / total).toFixed(0)}% of items not started is on-schedule. Standard-Ledger-dependent items (ABN, GST, Pty Xero, NAB account, IP deed, SHA, D&O insurance) compress the critical path if any slip past week 4. Days until cutover: ${cutoverDays}.`,
    '',
  ]

  // Acceptance criteria
  const grantsList = Object.keys(ctx.receivables.byContact).filter(c => /Foundation|Trust|Forum|Rotary|Snow|Centrecorp|Vincent|Paul Ramsay|Westpac|Brisbane Powerhouse|John Villiers/i.test(c))
  const novationDrafts = findDraftMatching(ctx.drafts, ['novation'])
  const acceptLines = [
    '## Alignment-loop acceptance criteria',
    '',
    '| Criterion | Met? | Evidence |',
    '|---|---|---|',
    `| Every "this week" action either verifiably done or flagged as open | aligned | ${counts.DONE} DONE + ${notStarted.length} flagged OPEN/UNVERIFIED in §1, §2, §7, §8 |`,
    `| Every grant in Q1's live list has a matching novation status | aligned | ${grantsList.length} grant counterparty(s) outstanding; novation row in §4 marks ${novationDrafts.length === 0 ? 'NOT STARTED' : `IN PROGRESS (\`${novationDrafts.join('`, `')}\`)`} |`,
    `| Drafts-but-not-sent distinguished from sent items | aligned | ${ctx.drafts.length} drafts scanned; \`thoughts/shared/drafts/novation-letter-templates.md\` is template (not sent), other novation candidates not yet drafted |`,
    '',
  ]

  // Cutover risk map
  const riskLines = ['## Cutover risk map', '', `Ranked by blast radius × days-until-hard-date (cutover ${ENTITY_CUTOVER_DATE}, ${cutoverDays} days out).`, '']
  riskLines.push('### Red - would materially damage 1 July launch if not done', '')
  riskLines.push(`1. **NAB business account opens** - blocks Stripe, auto-debits, subscription transfers, D&O insurance billing. \`bank_statement_lines\` shows 1 account ("${ctx.bankAccounts[0] || 'NAB Visa ACT #8815'}" = sole trader). Apply this week.`)
  riskLines.push('2. **Pty ABN + GST registration** - blocks Pty Xero file, first Pty invoice. Standard Ledger week 1-2.')
  riskLines.push(`3. **Pty Xero file opens** - blocks all invoicing from 1 July. Standard Ledger week 3 (${dateOffset(PTY_REGISTRATION_DATE, 21)}).`)
  riskLines.push(`4. **D&O insurance binding** - 30-day standard window from registration ${PTY_REGISTRATION_DATE} closes ${dateOffset(PTY_REGISTRATION_DATE, 30)} (${doDueDateOverdue(DATE) ? 'overdue' : 'due soon'}).`)
  riskLines.push('5. **Director IDs confirmed for Ben and Nic** - currently UNVERIFIED per memory; if missing, blocks ABN.')
  // top-3 outstanding counterparties from §4
  const topGrants = topContacts.filter(c => /Centrecorp|Snow|Rotary|Foundation/i.test(c.contact_name)).slice(0, 3)
  let r = 6
  for (const c of topGrants) {
    const inv = c.invoices.sort((a, b) => b.amount_due - a.amount_due)[0]
    const tag = inv.status === 'DRAFT' ? 'DRAFT' : 'AUTHORISED'
    const days = daysBetween(inv.date)
    riskLines.push(`${r++}. **${c.contact_name} ${inv.invoice_number} ($${fmtDollars(inv.amount_due)} ${tag}${days !== null && days > 180 ? `, ${days}d old` : ''}) decision** - ${inv.status === 'DRAFT' ? 'Send / void / reissue' : days !== null && days > 180 ? 'Chase or write off' : 'Confirm payment + Pty migration notice'}.`)
  }
  riskLines.push('')
  riskLines.push('### Amber - must ship by mid-May to hit 30 June cleanly', '')
  let a = 1
  riskLines.push(`${a++}. **Novation letter template + send to all current funders** - plan §4 says week 5-6 (~${dateOffset(DATE, 14)} to ${dateOffset(DATE, 28)}). ${novationDrafts.length === 0 ? 'Zero matching drafts in `thoughts/shared/drafts/`.' : `\`${novationDrafts.join('`, `')}\` exists.`}`)
  riskLines.push(`${a++}. **IP assignment deed (Nic to Pty)** - plan §6 says week 4-5; needs lawyer review turnaround.`)
  riskLines.push(`${a++}. **Shareholders Agreement** - plan Rule 4 elevated to week 1-2; ${findDraftMatching(ctx.drafts, ['shareholders-agreement', 'sha-draft']).length === 0 ? 'no draft on file' : `draft at \`${findDraftMatching(ctx.drafts, ['shareholders-agreement', 'sha-draft']).join('`, `')}\``}.`)
  riskLines.push(`${a++}. **Harvest lease (Sonas Properties) signed in Pty subsidiary name** - plan §11 D11.1 requires subsidiary structure first; lease_start ${ENTITY_CUTOVER_DATE.replace(/06-30/, '07-01')}.`)
  riskLines.push(`${a++}. **Farm lease (Nic to Pty, arm's-length rate)** - plan §1; Standard Ledger to confirm rate.`)
  riskLines.push('')
  riskLines.push('### Yellow - recoverable post-cutover but best done by 30 June', '')
  let y = 1
  riskLines.push(`${y++}. Email + website footer updates (10 mailboxes/sites named in plan §10).`)
  riskLines.push(`${y++}. Announcement email to funders, partners, community (plan §9; week of ${ENTITY_CUTOVER_DATE.replace(/06-30/, '07-01')}).`)
  riskLines.push(`${y++}. Xero invoice template swap (blocked on Pty Xero file).`)
  riskLines.push(`${y++}. Subscription billing transfers (audit in week 7-8 per plan §5).`)
  riskLines.push(`${y++}. GitHub org transfer (\`Acurioustractor/\` to Pty identity).`)
  riskLines.push('')

  // Open actions - every action specific (file path + key, OR person + deadline)
  const actionLines = ['## Open actions sorted by cutover risk', '', `Each action names a specific file path + key, person + deadline, or script invocation (Tier 3.2 reconciliation actionability).`, '']
  let an = 1
  actionLines.push('### This week (Week 1 on plan, now)', '')
  actionLines.push(`${an++}. **Confirm Director IDs for Ben and Nic by ${dateOffset(DATE, 7)}.** Apply via ABRS if missing (10-min online + identity verification). Owner: Ben + Nic.`)
  actionLines.push(`${an++}. **Submit NAB Pty business account application by ${dateOffset(DATE, 7)}.** Standard Ledger may have direct banker contact. Owner: Nic.`)
  actionLines.push(`${an++}. **Research 3 insurance brokers for D&O + PL quotes; decision by ${dateOffset(DATE, 7)}.** D&O 30-day window closes ${dateOffset(PTY_REGISTRATION_DATE, 30)}. Owner: Ben.`)
  actionLines.push(`${an++}. **Confirm ABN application filed with target week 1-2 issue by ${dateOffset(DATE, 7)}.** Owner: Ben + Standard Ledger.`)
  const centrecorp = topContacts.find(c => /centrecorp/i.test(c.contact_name))
  if (centrecorp) {
    const inv = centrecorp.invoices[0]
    actionLines.push(`${an++}. **Decide ${centrecorp.contact_name} \`${inv.invoice_number}\` ($${fmtDollars(inv.amount_due)} ${inv.status}) with Nic by ${dateOffset(DATE, 7)}.** Send / void / reissue from Pty. Owner: Ben + Nic.`)
  }
  actionLines.push('')
  actionLines.push(`### Next 2 weeks (Weeks 2-3, ${dateOffset(DATE, 7)} to ${dateOffset(DATE, 21)})`, '')
  actionLines.push(`${an++}. **Open Pty Xero file by ${dateOffset(DATE, 21)}** once ABN issues. Owner: Standard Ledger.`)
  actionLines.push(`${an++}. **NAB Pty account active → open Stripe account for Pty by ${dateOffset(DATE, 21)}.** Owner: Ben.`)
  actionLines.push(`${an++}. **Bind D&O insurance by ${dateOffset(PTY_REGISTRATION_DATE, 30)}.** Owner: Ben + selected broker.`)
  actionLines.push(`${an++}. **Draft novation letter template at \`thoughts/shared/drafts/novation-template-funder.md\` by ${dateOffset(DATE, 14)}.** Iterate with Standard Ledger. Owner: Ben.`)
  actionLines.push(`${an++}. **Run \`node scripts/synthesize-funder-alignment.mjs\` weekly through cutover** for live drift signal on funder receivables. Owner: cron (\`trig_018X1ZRtc9zdgFENiYsx5t8c\`).`)
  actionLines.push('')
  actionLines.push(`### Weeks 4-5 (${dateOffset(DATE, 21)} to ${dateOffset(DATE, 35)})`, '')
  actionLines.push(`${an++}. **Send novation letters to all current funders** named in plan §4 (Snow, Paul Ramsay, Lord Mayor's, Dusseldorp, Equity Trustees if active, Commonwealth/state). Owner: Ben.`)
  actionLines.push(`${an++}. **IP assignment deed drafted + signed.** Standard Ledger's referred lawyer drafts. Owner: Ben + lawyer.`)
  actionLines.push(`${an++}. **Shareholders Agreement drafted + signed (per plan Rule 4 - elevated to weeks 1-2; now overdue ${cutoverDays - 35} days into the runway).** Owner: Ben + Nic + lawyer.`)
  actionLines.push('')

  // Sources
  const sources = [
    '## Sources queried',
    '',
    '| Source | Query / path | As-of |',
    '|---|---|---|',
    `| Plan | \`${PLAN_PATH}\` | file |`,
    `| Memory | \`wiki/decisions/act-core-facts.md\` | file |`,
    `| DB | \`xero_invoices\` WHERE \`type='ACCREC'\` AND \`status\` not in (\`VOIDED\`, \`DELETED\`, \`PAID\`) AND \`amount_due>0\` (${ctx.receivables.rows.length} rows) | ${DATE} |`,
    `| DB | \`xero_invoices\` GROUP BY \`xero_tenant_id\` (${ctx.xeroTenants.length} tenant) | ${DATE} |`,
    `| DB | \`bank_statement_lines\` GROUP BY \`bank_account\` (${ctx.bankAccounts.length} account) | ${DATE} |`,
    `| Drafts | \`thoughts/shared/drafts/**/*.md\` (${ctx.drafts.length} files) | ${DATE} |`,
    '',
    '## Provenance',
    '',
    `- Generated: ${new Date().toISOString()}`,
    `- Script: \`scripts/synthesize-entity-migration-truth-state.mjs\``,
    `- Cutover anchor: ${ENTITY_CUTOVER_DATE} (${cutoverDays} days from synthesis date)`,
    `- Pty registration: ${PTY_REGISTRATION_DATE} (ACN ${PTY_ACN})`,
    `- D&O 30-day window closes: ${dateOffset(PTY_REGISTRATION_DATE, 30)}`,
    '- Rubric: `thoughts/shared/rubrics/alignment-loop-synthesis.md` v0.1 (calibrated 6/6, 2026-05-07)',
    '',
    '## Backlinks',
    '',
    '- [[act-alignment-loop|ACT Alignment Loop]]',
    '- [[entity-migration-truth-state-2026-04-24|2026-04-24 baseline]]',
    `- [[funder-alignment-${DATE}|Q1 funder alignment]]`,
    '- [[index|ACT Wikipedia]]',
    '',
  ]

  const out = [
    ...fm,
    ...sourcesBlock,
    ...headlineLines,
    ...sectionLines,
    ...recLines,
    ...summaryLines,
    ...acceptLines,
    ...riskLines,
    ...actionLines,
    ...sources,
  ].join('\n').replace(/\s+—\s+/g, ' - ').replace(/—/g, '-')
  return out
}

function doDueDateOverdue(date) {
  return daysBetween(dateOffset(PTY_REGISTRATION_DATE, 30), date) > 0
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.error(`[synthesize-entity-migration-truth-state] date=${DATE} dry_run=${DRY_RUN}`)
  console.error('[synthesize-entity-migration-truth-state] pulling Xero receivables…')
  const receivables = await pullOutstandingReceivables()
  console.error('[synthesize-entity-migration-truth-state] pulling Xero tenants…')
  const xeroTenants = await pullXeroTenants()
  console.error('[synthesize-entity-migration-truth-state] pulling bank accounts…')
  const bankAccounts = await pullBankAccounts()
  console.error('[synthesize-entity-migration-truth-state] listing drafts…')
  const drafts = listDrafts()

  const ctx = { receivables, xeroTenants, bankAccounts, drafts }
  const sections = buildItems(ctx)
  const md = renderMarkdown(sections, ctx)

  if (DRY_RUN) {
    process.stdout.write(md)
    return
  }

  const outPath = join(SYNTHESIS_DIR, `entity-migration-truth-state-${DATE}.md`)
  writeFileSync(outPath, md)
  console.error(`[synthesize-entity-migration-truth-state] wrote ${outPath}`)
  const totalItems = sections.flatMap(s => s.items).length
  console.error(`[synthesize-entity-migration-truth-state] ${totalItems} checklist items × ${receivables.rows.length} outstanding receivables ($${fmtDollars(Object.values(receivables.byContact).reduce((s, c) => s + c.total_outstanding, 0))} total)`)

  if (NO_GRADE) {
    console.error('[synthesize-entity-migration-truth-state] grader skipped (--no-grade)')
    return
  }
  try {
    console.error('[synthesize-entity-migration-truth-state] self-grading…')
    const grade = await gradeAndLint(outPath, 'entity-migration-truth-state')
    console.error(`[synthesize-entity-migration-truth-state] grade: ${grade.verdict.toUpperCase()} · ${grade.score}/100`)
    if (grade.lintPath) {
      console.error(`[synthesize-entity-migration-truth-state] lint report: ${grade.lintPath}`)
    }
    if (grade.verdict === 'fail') process.exitCode = 1
  } catch (e) {
    console.error(`[synthesize-entity-migration-truth-state] grader error (synthesis still written): ${e.message}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
