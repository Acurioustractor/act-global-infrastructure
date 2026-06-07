#!/usr/bin/env node
/**
 * Close-the-books assistant (#4 of the ongoing-bookkeeping roadmap).
 *
 * Answers one question for a chosen period: "is this period ready to close?"
 * Rolls up seven lenses (reconciliation · receipt coverage · tagging ·
 * cleanliness/anomalies · P&L · indicative BAS · R&D-eligible) and applies a
 * 🟢/🟡/🔴 ready-to-close gate, then lists the prioritised actions to clear it.
 *
 * Deterministic core (numbers + gate are 100% computed). --narrate adds an
 * optional LLM plain-English close memo on top (off by default).
 *
 * Reads the SAME DB the command-center app reads (NEXT_PUBLIC_SUPABASE_URL) so
 * the numbers match /finance/mirror, the daily digest, and the anomaly scan.
 * Reuses scripts/detect-finance-anomalies.mjs (--json) for the cleanliness lens.
 *
 * DRY by default — console only; no writes, no external sends.
 *
 * Usage:
 *   node scripts/close-the-books.mjs FY26-Q3            # human close pack
 *   node scripts/close-the-books.mjs 2026-04            # a calendar month
 *   node scripts/close-the-books.mjs FY26               # full financial year
 *   node scripts/close-the-books.mjs Q3 --json          # machine output
 *   node scripts/close-the-books.mjs FY26-Q3 --save     # + dated .md + .provenance.md
 *   node scripts/close-the-books.mjs FY26-Q3 --narrate  # + AI close memo
 */
import { createClient } from '@supabase/supabase-js'
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync } from 'node:fs'

const args = process.argv.slice(2)
const JSON_OUT = args.includes('--json')
const SAVE = args.includes('--save')
const NARRATE = args.includes('--narrate')
const explicitPeriod = args.find((a) => !a.startsWith('--'))
// No period given (e.g. the monthly cron) → default to the last completed calendar month.
function lastCompletedMonth() { const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` }
const periodArg = explicitPeriod || lastCompletedMonth()

// Load env WITHOUT polluting stdout (the shared loader + dotenv v17 both print to
// stdout, which corrupts --json piping). Silence dotenv + route the loader's
// notices to stderr for the duration of the import only.
process.env.DOTENV_CONFIG_QUIET = 'true'
{ const _log = console.log; console.log = (...a) => process.stderr.write(a.join(' ') + '\n'); await import('../lib/load-env.mjs'); console.log = _log }

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY)

const ACT = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']

// Ready-to-close thresholds (tune here)
const TH = {
  recon: { green: 98, amber: 90 },
  receipts: { green: 95, amber: 80, bigItem: 1000 },
  tagging: { green: 98, amber: 90 },
}

const fmt0 = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })
const fmt2 = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (n) => `${Math.round(n)}%`
const abs = (n) => Math.abs(Number(n || 0))
const dot = { green: '🟢', amber: '🟡', red: '🔴' }

// ---------- period parsing (AU FY = Jul–Jun) ----------
function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate() } // m is 1-12
function currentFy(d) { const y = d.getUTCFullYear(), mo = d.getUTCMonth() + 1; return (mo >= 7 ? y + 1 : y) - 2000 } // 2-digit FY
function quarterWindow(fy, q) {
  const sy = 2000 + fy - 1 // FY26 starts Jul 2025
  const map = { 1: [7, 9, sy], 2: [10, 12, sy], 3: [1, 3, sy + 1], 4: [4, 6, sy + 1] }
  const [m1, m2, yr] = map[q]
  const pad = (m) => String(m).padStart(2, '0')
  return { start: `${yr}-${pad(m1)}-01`, end: `${yr}-${pad(m2)}-${lastDay(yr, m2)}` }
}
function parsePeriod(arg) {
  if (!arg) throw new Error('Period required. Use YYYY-MM, Q3, FY26-Q3, or FY26.')
  let m
  if ((m = arg.match(/^(\d{4})-(\d{2})$/))) {
    const y = +m[1], mo = +m[2]
    if (mo < 1 || mo > 12) throw new Error(`Bad month "${arg}"`)
    return { kind: 'month', label: `${y}-${m[2]}`, human: monthName(y, mo), start: `${y}-${m[2]}-01`, end: `${y}-${m[2]}-${String(lastDay(y, mo)).padStart(2, '0')}` }
  }
  if ((m = arg.match(/^FY(\d{2})$/i))) {
    const fy = +m[1], sy = 2000 + fy - 1
    return { kind: 'fy', label: `FY${m[1]}`, human: `FY${m[1]} (Jul ${sy} – Jun ${sy + 1})`, fy, start: `${sy}-07-01`, end: `${sy + 1}-06-30` }
  }
  if ((m = arg.match(/^(?:FY(\d{2})-)?Q([1-4])$/i))) {
    const fy = m[1] ? +m[1] : currentFy(new Date())
    const q = +m[2]
    const w = quarterWindow(fy, q)
    return { kind: 'quarter', label: `FY${String(fy).padStart(2, '0')}-Q${q}`, human: `FY${String(fy).padStart(2, '0')}-Q${q} (${qMonths(q)})`, fy, q, ...w }
  }
  throw new Error(`Unrecognised period "${arg}". Use YYYY-MM, Q3, FY26-Q3, or FY26.`)
}
function monthName(y, mo) { return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
function qMonths(q) { return { 1: 'Jul–Sep', 2: 'Oct–Dec', 3: 'Jan–Mar', 4: 'Apr–Jun' }[q] }

// ---------- data ----------
async function fetchAll(table, cols, build) {
  const PAGE = 1000
  let all = []
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(cols)
    q = build(q).range(from, from + PAGE - 1)
    const { data, error } = await q
    if (error) { console.error(`fetch ${table}: ${error.message}`); break }
    all = all.concat(data || [])
    if (!data || data.length < PAGE) break
  }
  return all
}
function gstFor(lineItems, taxTypes) {
  return (Array.isArray(lineItems) ? lineItems : []).reduce((s, li) => taxTypes.has(li?.tax_type) ? s + abs(li?.line_amount) / 11 : s, 0)
}
function freshness() {
  try {
    if (!existsSync('.xero-sync-state.json')) return null
    const j = JSON.parse(readFileSync('.xero-sync-state.json', 'utf8'))
    return j.lastSync || j.updatedAt || statSync('.xero-sync-state.json').mtime.toISOString()
  } catch { return null }
}
function detectorAnomalies() {
  try {
    const out = execSync('node scripts/detect-finance-anomalies.mjs --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 32 * 1024 * 1024 })
    const start = out.indexOf('{')
    if (start < 0) return null
    return JSON.parse(out.slice(start))
  } catch (e) { console.error(`detector: ${e.message?.slice(0, 120)}`); return null }
}

async function main() {
  const P = parsePeriod(periodArg)
  if (!explicitPeriod) process.stderr.write(`(no period given — defaulting to last completed month: ${P.label})\n`)
  const inWin = (d) => d >= P.start && d <= P.end

  const [bills, sales, txns] = await Promise.all([
    fetchAll('xero_invoices', 'xero_id,invoice_number,contact_name,total,date,status,has_attachments,line_items,project_code',
      (q) => q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).gte('date', P.start).lte('date', P.end)),
    fetchAll('xero_invoices', 'xero_id,contact_name,total,date,status,line_items,project_code',
      (q) => q.eq('type', 'ACCREC').in('status', ['AUTHORISED', 'PAID']).gte('date', P.start).lte('date', P.end)),
    fetchAll('xero_transactions', 'xero_transaction_id,contact_name,total,date,type,status,is_reconciled,has_attachments,line_items,project_code,rd_eligible,rd_category,bank_account',
      (q) => q.in('bank_account', ACT).not('status', 'in', '(VOIDED,DELETED)').gte('date', P.start).lte('date', P.end)),
  ])
  const spends = txns.filter((t) => t.type === 'SPEND' || t.type === 'SPEND-OVERPAYMENT')

  // 1. Reconciliation (all ACT bank txns in period)
  const reconDone = txns.filter((t) => t.is_reconciled).length
  const reconPct = txns.length ? (reconDone / txns.length) * 100 : 100

  // 2. Receipt coverage (bills + bank spends without attachment)
  const recItems = [
    ...bills.map((b) => ({ amt: abs(b.total), has: !!b.has_attachments, vendor: b.contact_name, date: b.date, kind: 'bill' })),
    ...spends.map((t) => ({ amt: abs(t.total), has: !!t.has_attachments, vendor: t.contact_name, date: t.date, kind: 'spend' })),
  ]
  const recTotal$ = recItems.reduce((s, i) => s + i.amt, 0)
  const noReceipt = recItems.filter((i) => !i.has)
  const gap$ = noReceipt.reduce((s, i) => s + i.amt, 0)
  const covPct = recTotal$ ? (1 - gap$ / recTotal$) * 100 : 100
  const bigUnreceipted = noReceipt.filter((i) => i.amt > TH.receipts.bigItem).sort((a, b) => b.amt - a.amt)

  // 3. Tagging (bills + spends carrying a project_code)
  const taggable = [...bills, ...spends]
  const tagTotal$ = taggable.reduce((s, i) => s + abs(i.total), 0)
  const untaggedItems = taggable.filter((i) => !i.project_code)
  const untag$ = untaggedItems.reduce((s, i) => s + abs(i.total), 0)
  const tagPct = tagTotal$ ? (1 - untag$ / tagTotal$) * 100 : 100

  // 4. Cleanliness (anomaly detector, period-scoped)
  const det = detectorAnomalies()
  const voidInWin = (det?.voidCandidates || []).filter((v) => inWin(v.date))
  const dupInWin = (det?.exactDups || []).filter((d) => inWin(d.date))
  const gePeriod = bills.filter((b) => (b.line_items || []).some((li) => String(li.account_code) === '429'))
  const ge$ = gePeriod.reduce((s, b) => s + (b.line_items || []).filter((li) => String(li.account_code) === '429').reduce((a, li) => a + abs(li.line_amount), 0), 0)
  const voidConfirmed = voidInWin.filter((v) => v.confidence !== 'review')

  // 5. P&L (honest split — no double-count of settled bills)
  const proj = new Map()
  const addP = (code, field, amt) => { const k = code || '(untagged)'; const r = proj.get(k) || { sales: 0, spend: 0, bills: 0 }; r[field] += amt; proj.set(k, r) }
  for (const s of sales) addP(s.project_code, 'sales', abs(s.total))
  for (const t of spends) addP(t.project_code, 'spend', abs(t.total))
  for (const b of bills) addP(b.project_code, 'bills', abs(b.total))
  const salesTotal = sales.reduce((s, r) => s + abs(r.total), 0)
  const spendTotal = spends.reduce((s, r) => s + abs(r.total), 0)
  const billsTotal = bills.reduce((s, r) => s + abs(r.total), 0)

  // 6. BAS (indicative, accruals) — quarter/FY only
  const showBas = P.kind !== 'month'
  const gst1A = sales.reduce((s, inv) => s + gstFor(inv.line_items, new Set(['OUTPUT'])), 0)
  const gst1B = bills.reduce((s, b) => s + gstFor(b.line_items, new Set(['INPUT', 'CAPEXINPUT'])), 0)

  // 7. R&D-eligible (from xero_transactions rd_eligible/rd_category)
  const rdClassified = txns.filter((t) => t.rd_eligible !== null && t.rd_eligible !== undefined).length
  const rdItems = txns.filter((t) => t.rd_eligible === true)
  const rdByCat = { core: 0, supporting: 0, review: 0 }
  for (const t of rdItems) rdByCat[t.rd_category || 'review'] = (rdByCat[t.rd_category || 'review'] || 0) + abs(t.total)
  const rdTotal$ = rdItems.reduce((s, t) => s + abs(t.total), 0)
  const rdReceipted$ = rdItems.filter((t) => t.has_attachments).reduce((s, t) => s + abs(t.total), 0)
  const rdRecPct = rdTotal$ ? (rdReceipted$ / rdTotal$) * 100 : 100

  // ---------- gate ----------
  const reconBand = reconPct >= TH.recon.green ? 'green' : reconPct >= TH.recon.amber ? 'amber' : 'red'
  const recBand = (covPct >= TH.receipts.green && !bigUnreceipted.length) ? 'green' : (covPct >= TH.receipts.amber && !bigUnreceipted.length) ? 'amber' : (covPct >= TH.receipts.amber ? 'amber' : 'red')
  const recBandFinal = bigUnreceipted.length ? (covPct < TH.receipts.amber ? 'red' : 'amber') : recBand
  const tagBand = tagPct >= TH.tagging.green ? 'green' : tagPct >= TH.tagging.amber ? 'amber' : 'red'
  const cleanBlockers = voidConfirmed.length + dupInWin.length + (gePeriod.length ? 1 : 0)
  const cleanBand = cleanBlockers ? 'red' : (voidInWin.length || (det?.vendorVariants || []).length) ? 'amber' : 'green'
  const bands = [reconBand, recBandFinal, tagBand, cleanBand]
  const worst = bands.includes('red') ? 'red' : bands.includes('amber') ? 'amber' : 'green'
  const verdict = worst === 'green' ? '🟢 READY TO CLOSE' : worst === 'amber' ? '🟡 CLOSE WITH NOTES' : '🔴 NOT READY TO CLOSE'

  // ---------- action list ----------
  const actions = []
  if (cleanBlockers) {
    if (voidConfirmed.length) actions.push(`Void/clear ${voidConfirmed.length} in-period duplicate bill(s) (${fmt0(voidConfirmed.reduce((s, v) => s + v.amount, 0))}) → review the dup worklist, use the void-duplicate-bills pattern`)
    if (dupInWin.length) actions.push(`Investigate ${dupInWin.length} same-day exact duplicate group(s) in period`)
    if (gePeriod.length) actions.push(`Recode ${gePeriod.length} GE-429 bill(s) (${fmt0(ge$)}) out of General Expenses → scripts/apply-ge-recode-to-xero.mjs`)
  }
  if (recBandFinal !== 'green') actions.push(`Chase ${fmt0(gap$)} across ${noReceipt.length} unreceipted item(s)${bigUnreceipted.length ? ` (${bigUnreceipted.length} over ${fmt0(TH.receipts.bigItem)}, biggest: ${(bigUnreceipted[0].vendor || '?').slice(0, 24)} ${fmt0(bigUnreceipted[0].amt)})` : ''} → ${P.kind === 'quarter' ? `scripts/bas-gap-sweep.mjs Q${P.q}` : 'attach in /finance/mirror'}`)
  if (tagBand !== 'green') actions.push(`Tag ${untaggedItems.length} untagged item(s) (${fmt0(untag$)}) → /finance/mirror`)
  if (reconBand !== 'green') actions.push(`Reconcile ${txns.length - reconDone} unreconciled ACT transaction(s) → Xero`)

  const result = {
    period: P.label, human: P.human, window: { start: P.start, end: P.end }, freshness: freshness(),
    scope: 'ACT (NAB Visa #8815 + Everyday)',
    counts: { bills: bills.length, sales: sales.length, txns: txns.length, spends: spends.length },
    lenses: {
      recon: { pct: round1(reconPct), done: reconDone, total: txns.length, band: reconBand },
      receipts: { coveragePct: round1(covPct), gap: round2(gap$), unreceipted: noReceipt.length, overThreshold: bigUnreceipted.length, top: bigUnreceipted.slice(0, 5).map((i) => ({ vendor: i.vendor, amount: round2(i.amt), kind: i.kind })), band: recBandFinal },
      tagging: { pct: round1(tagPct), untagged: untaggedItems.length, untaggedDollars: round2(untag$), band: tagBand },
      cleanliness: { voidCandidates: voidInWin.length, voidConfirmed: voidConfirmed.length, sameDayDups: dupInWin.length, ge429Bills: gePeriod.length, ge429Dollars: round2(ge$), vendorVariants: (det?.vendorVariants || []).length, detectorRan: !!det, band: cleanBand },
      pnl: { salesInvoiced: round2(salesTotal), bankSpend: round2(spendTotal), billsRaised: round2(billsTotal), netCash: round2(salesTotal - spendTotal), byProject: [...proj.entries()].map(([k, v]) => ({ project: k, sales: round2(v.sales), spend: round2(v.spend), bills: round2(v.bills) })).sort((a, b) => (b.sales + b.spend + b.bills) - (a.sales + a.spend + a.bills)) },
      bas: showBas ? { indicative: true, gstOnSales1A: round2(gst1A), gstCredits1B: round2(gst1B), netGst: round2(gst1A - gst1B), note: `indicative accruals — run prepare-bas.mjs ${P.kind === 'quarter' ? `Q${P.q}` : ''} for the cash-basis lodgement worksheet` } : null,
      rd: { classified: rdClassified, eligibleDollars: round2(rdTotal$), byCategory: { core: round2(rdByCat.core), supporting: round2(rdByCat.supporting), review: round2(rdByCat.review) }, receiptCoveragePct: round1(rdRecPct), note: rdClassified === 0 ? 'rd_eligible not populated in this DB — run tag-rd-eligibility.mjs --apply' : 'bank-txn R&D only; see thoughts/shared/rd-pack-fy26/ for full registers' },
    },
    gate: { verdict, worst, blockers: actions },
  }

  if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); return }

  const report = renderHuman(result)
  console.log(report)

  if (NARRATE) {
    const memo = await narrate(result)
    if (memo) console.log(`\n🤖 AI close memo (generated — numbers above are the source of truth)\n${memo}\n`)
    else console.log(`\n🤖 AI close memo unavailable (LLM returned empty / errored — see stderr). Deterministic pack above stands.\n`)
    result.memo = memo
  }

  if (SAVE) {
    mkdirSync('thoughts/shared/reports', { recursive: true })
    const today = new Date().toISOString().slice(0, 10)
    const base = `thoughts/shared/reports/close-pack-${P.label}-${today}`
    let md = `# Close pack — ${P.human}\n\n_Generated ${today} · scope ${result.scope} · Xero data as of ${result.freshness || 'unknown'}_\n\n\`\`\`\n${report}\n\`\`\`\n`
    if (result.memo) md += `\n## AI close memo (generated)\n\n${result.memo}\n`
    writeFileSync(`${base}.md`, md)
    writeFileSync(`${base}.md.provenance.md`, provenanceSidecar(result, today, base))
    console.log(`\n  saved: ${base}.md  (+ .provenance.md)\n`)
  }
}

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100

function bar(label, value, band, detail) {
  return `${dot[band]} ${label.padEnd(20)} ${value.padEnd(8)} ${detail || ''}`.trimEnd()
}
function renderHuman(r) {
  const L = r.lenses
  const lines = []
  lines.push(`\n📕 Close pack — ${r.human}`)
  lines.push(`   Xero data as of ${r.freshness || 'unknown'}  ·  scope: ${r.scope}`)
  lines.push(`   ${r.counts.bills} bills · ${r.counts.sales} sales · ${r.counts.txns} bank txns in window\n`)
  lines.push(bar('Reconciliation', pct(L.recon.pct), L.recon.band, `(${L.recon.done}/${L.recon.total} ACT txns reconciled)`))
  lines.push(bar('Receipt coverage', pct(L.receipts.coveragePct), L.receipts.band, `(${fmt0(L.receipts.gap)} unreceipted · ${L.receipts.unreceipted} items${L.receipts.overThreshold ? ` · ${L.receipts.overThreshold} over ${fmt0(TH.receipts.bigItem)}` : ''})`))
  lines.push(bar('Tagging', pct(L.tagging.pct), L.tagging.band, `(${L.tagging.untagged} untagged · ${fmt0(L.tagging.untaggedDollars)})`))
  lines.push(bar('Cleanliness', L.cleanliness.detectorRan ? `${L.cleanliness.voidCandidates + L.cleanliness.sameDayDups + L.cleanliness.ge429Bills} flags` : 'n/a', L.cleanliness.band, `(${L.cleanliness.voidCandidates} void-cand · ${L.cleanliness.sameDayDups} same-day dup · GE-429: ${L.cleanliness.ge429Bills} bills/${fmt0(L.cleanliness.ge429Dollars)})`))
  lines.push('')
  lines.push(`💰 P&L (cash)         in ${fmt0(L.pnl.salesInvoiced)} · out ${fmt0(L.pnl.bankSpend)} · net ${fmt0(L.pnl.netCash)}   (bills raised ${fmt0(L.pnl.billsRaised)})`)
  if (L.bas) lines.push(`🧾 BAS (indicative)   1A ${fmt0(L.bas.gstOnSales1A)} − 1B ${fmt0(L.bas.gstCredits1B)} = net GST ${fmt0(L.bas.netGst)}   → ${L.bas.note}`)
  lines.push(`🔬 R&D-eligible       ${fmt0(L.rd.eligibleDollars)}  (core ${fmt0(L.rd.byCategory.core)} / supporting ${fmt0(L.rd.byCategory.supporting)} / review ${fmt0(L.rd.byCategory.review)}) · receipts ${pct(L.rd.receiptCoveragePct)}`)
  if (L.rd.classified === 0) lines.push(`                      ⚠️  ${L.rd.note}`)
  // top projects
  const tp = L.pnl.byProject.filter((p) => p.project !== '(untagged)').slice(0, 6)
  if (tp.length) {
    lines.push(`\n   By project (sales / spend / bills):`)
    for (const p of tp) lines.push(`     ${String(p.project).padEnd(10)} ${fmt0(p.sales).padStart(10)} / ${fmt0(p.spend).padStart(10)} / ${fmt0(p.bills).padStart(10)}`)
  }
  lines.push(`\n${'─'.repeat(58)}`)
  lines.push(`${r.gate.verdict}${r.gate.blockers.length ? ` — ${r.gate.blockers.length} item(s) to clear` : ''}`)
  if (r.gate.blockers.length) {
    lines.push(`\nTo close ${r.period}:`)
    r.gate.blockers.forEach((a, i) => lines.push(`  ${i + 1}. ${a}`))
  }
  return lines.join('\n')
}

async function narrate(r) {
  try {
    const { trackedAgentCompletionWithFallback } = await import('./lib/llm-client.mjs')
    const prompt = `You are ACT's bookkeeping assistant. Write ONE short paragraph (no preamble, no headings) for Ben + the accountant (Standard Ledger): is ${r.human} ready to close? State plainly what is clean, what is blocking, and the top 2-3 actions. Be concrete with the figures given. Do NOT invent any numbers. Data:\n${JSON.stringify(r.lenses)}\nVerdict: ${r.gate.verdict}. Actions: ${JSON.stringify(r.gate.blockers)}.`
    // Force Anthropic: the default agent provider (minimax) returns verbose
    // reasoning / empty strings for this task; Anthropic returns a clean memo.
    // The fallback wrapper still covers rate-limit/5xx.
    const res = await trackedAgentCompletionWithFallback(prompt, 'close-the-books', { forceProvider: 'anthropic', task: 'generate', maxTokens: 400 })
    return (typeof res === 'string' ? res : (res?.text ?? res?.content ?? res?.completion ?? '')).trim() || null
  } catch (e) { console.error(`narrate: ${e.message?.slice(0, 120)}`); return null }
}

function provenanceSidecar(r, today, base) {
  return `---
title: "Close pack ${r.period} Provenance"
status: Generated
date: ${today}
type: provenance
tags: [provenance, finance, close-the-books, audit]
---

# Close pack ${r.period} — Provenance

## Purpose
- Output: period close pack (ready-to-close gate across 7 lenses)
- Intended destination: ${base}.md → Standard Ledger handoff / Pty cutover prep
- Why generated: close-the-books assistant (#4 ongoing-bookkeeping roadmap)

## Data Sources Queried
| Source | Type | Range | How used |
|---|---|---|---|
| xero_invoices (ACCPAY) | app DB (NEXT_PUBLIC) | ${r.window.start}–${r.window.end} | bills: receipts, tagging, GE-429, 1B GST, bills-raised |
| xero_invoices (ACCREC) | app DB | ${r.window.start}–${r.window.end} | sales: income, 1A GST |
| xero_transactions | app DB | ${r.window.start}–${r.window.end} | recon%, bank spend, tagging, R&D (rd_eligible) |
| detect-finance-anomalies.mjs --json | script | all-time, filtered to window | void/dup candidates (cleanliness lens) |
| .xero-sync-state.json | sync cursor | ${r.freshness || 'n/a'} | data-freshness stamp |

## Verification Status
- \`Verified:\` reconciliation %, receipt coverage, tagging %, GE-429 $, anomaly counts, R&D-eligible $ — all computed directly from the app DB (same DB as /finance/mirror).
- \`Inferred:\` BAS 1A/1B are INDICATIVE accruals (line_amount/11 on tax_type) — NOT the cash-basis lodgement figures (run prepare-bas.mjs). P&L "net cash" excludes unpaid bills.
- \`Unverified:\` R&D bank-txn classification depends on tag-rd-eligibility.mjs having been applied to this DB (${r.lenses.rd.classified === 0 ? 'NOT populated here' : `${r.lenses.rd.classified} txns classified`}); bills carry no R&D flag.

## Known Gaps And Assumptions
- BAS slice is invoice/accruals-based and single-sourced (bills only for 1B) to avoid double-counting settled-bill payments — will differ from the cash-basis BAS worksheet.
- P&L shows sales / bank-spend / bills-raised separately; it does NOT net bills against their bank payments (memory: bill payments often sit outside xero_transactions).
- Cleanliness GE-429 is period-scoped from bills; void/dup candidates come from the all-time detector filtered to the window.

## Reproduction Steps
1. \`node scripts/close-the-books.mjs ${r.period}\` (human) or \`--json\` (machine)
2. \`node scripts/close-the-books.mjs ${r.period} --save\` regenerates this pack + sidecar
3. Cross-check: recon%/untagged vs \`finance-daily-digest.mjs\`; anomalies vs \`detect-finance-anomalies.mjs\`; BAS vs \`prepare-bas.mjs ${r.lenses.bas ? `Q${r.period.slice(-1)}` : ''}\`

## Linked Artifacts
- Output artifact: ${base}.md
- Gate verdict: ${r.gate.verdict}
`
}

main().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
