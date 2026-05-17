#!/usr/bin/env node
/**
 * Quarterly R&D Founder Discipline Checklist
 *
 * Auto-creates the 8-item founder R&D discipline checklist in the Notion
 * Action Items database, per founder (Ben + Nic), on the first of each
 * quarter (1 Jul / 1 Oct / 1 Jan / 1 Apr — Australian FY calendar).
 *
 * Source rubric: wiki/finance/founder-pay-and-rd-thesis-fy26-fy27.md §11
 * "Stakes & best practice — rules of the road for founder R&D"
 *
 * Stakes: $200-250K FY26 R&D refund + $70-100K/yr ongoing FY27+. Quarterly
 * discipline closes off the seven traps (PSI, Div 7A, sub-market related-
 * party, inadequate records, Harvest contamination, family trust as
 * service-provider, commercial < 50%).
 *
 * Usage:
 *   node scripts/create-quarterly-rd-checklist.mjs            # Auto-detect quarter
 *   node scripts/create-quarterly-rd-checklist.mjs --quarter 2026-Q4-FY26
 *   node scripts/create-quarterly-rd-checklist.mjs --dry-run  # Preview, no writes
 *   node scripts/create-quarterly-rd-checklist.mjs --verbose
 *
 * Cron entry (already added to ecosystem.config.cjs):
 *   0 9 1 1,4,7,10 *    # 9am AEST on 1 Jan / 1 Apr / 1 Jul / 1 Oct
 */

import { Client } from '@notionhq/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

await import(join(__dirname, '../lib/load-env.mjs')).catch(() => {
  // load-env not present in this layout — fall through to process.env
})

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const VERBOSE = args.includes('--verbose')
const quarterArg = args.find((_, i) => args[i - 1] === '--quarter')

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const notionDbIds = JSON.parse(
  readFileSync(join(__dirname, '..', 'config', 'notion-database-ids.json'), 'utf-8'),
)
const ACTION_ITEMS_DB = notionDbIds.actionItemsDataSource || notionDbIds.actionItems

const FOUNDERS = [
  { key: 'ben', label: 'Ben', notionOwner: 'Ben', rdAllocation: 95 },
  { key: 'nic', label: 'Nic', notionOwner: 'Nic', rdAllocation: 40 },
]

// The 8-item checklist, per founder. Tied to §11 of founder-pay thesis.
function checklistItems(founder, quarterLabel) {
  const allocationNote = `(${founder.rdAllocation}% R&D baseline)`
  return [
    {
      name: `[${quarterLabel}] ${founder.label} · Time + activity evidence ${allocationNote}`,
      description:
        `Calendar export for the quarter — every working day accounted for (R&D activity / operational / commercial / leave / personal). Git commit log export tied to R&D project codes. R&D activity diary entry per active project. R&D allocation % update if reality diverges from ${founder.rdAllocation}% baseline.`,
      priority: 'High',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Income + invoicing hygiene`,
      description:
        founder.key === 'ben'
          ? `Quarter's Knight Photography invoice raised. PSI tests pass-check — at least one client other than ACT-related entity OR results-test evidence (delivered to spec, own tools, defect liability). GST returns lodged. Invoice has ABN + GST broken out + project mix split.`
          : `Quarterly drawings reconciled vs $200K fair-market salary target (FY26) or against Pty payroll (FY27+). Any third-party contractor work invoiced under separate ABN with proper PSI defence. Director's loan account balance documented + within 7-year repayment ceiling.`,
      priority: 'High',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Trust hygiene`,
      description: `${founder.key === 'ben' ? 'Knight' : 'Marchesi'} Family Trust: no service invoices issued (passive only); dividends received properly franked + resolved. Trust resolutions for any income distributed filed.`,
      priority: 'High',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Pty cashflow + R&D maths`,
      description: `Pty commercial revenue % of total — green if ≥60%, watch if 50-60%, escalate if <50%. R&D-eligible spend running total + estimated 43.5% refund (use /finance/command R&D tracker). R&D pack grade (target PASS; WARN acceptable mid-FY; FAIL = escalate to SL).`,
      priority: 'Medium',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Receipts + evidence`,
      description: `R&D-eligible spend over $82.50 has tax invoice attached. R&D-eligible spend over $1,000 has detailed tax invoice with supplier ABN. Coverage % above 95% (live on /finance/reconciliation).`,
      priority: 'Medium',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Red flag scan`,
      description: `Check for: commit count drop >50% vs baseline without diary explanation; commercial revenue share <50%; transfers Pty → founder not tagged as payroll/loan/dividend/invoice; related-party transactions without written agreements (Farm, Harvest services, KP terms); KP invoicing ONLY ACT-related entities AND failing results test; director's loan approaching 7-year ceiling. Escalate any red flag to Standard Ledger immediately.`,
      priority: 'High',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Never-do compliance check`,
      description: `Confirm none of the 8 "never do" rules has been breached: (1) no service invoices from family trust, (2) all related-party rates at SL-confirmed market, (3) director's loans documented with commercial interest, (4) Harvest cafe/retail not running through Pty books, (5) no R&D claim lodged without SL sign-off, (6) no SL journal amended without telling SL, (7) no personal credit card used for R&D-eligible without tax invoice, (8) R&D activity diary entry per active project this quarter.`,
      priority: 'Critical',
    },
    {
      name: `[${quarterLabel}] ${founder.label} · Quarterly review submitted to Standard Ledger`,
      description: `Send Standard Ledger a one-paragraph quarterly summary: R&D allocation reality vs baseline, any red flags found, any "never do" near-misses, any related-party transaction changes. SL acknowledges receipt. Closes the feedback loop on R&D defensibility through the year, not just at lodgement.`,
      priority: 'Medium',
    },
  ]
}

function currentQuarterLabel() {
  if (quarterArg) return quarterArg
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12
  const year = now.getFullYear()
  // Australian FY runs Jul-Jun. Q1 = Jul-Sep, Q2 = Oct-Dec, Q3 = Jan-Mar, Q4 = Apr-Jun.
  let q, fyStart
  if (month >= 7) {
    q = month >= 10 ? 'Q2' : 'Q1'
    fyStart = year
  } else if (month >= 4) {
    q = 'Q4'
    fyStart = year - 1
  } else if (month >= 1) {
    q = 'Q3'
    fyStart = year - 1
  }
  const fyEndShort = String((fyStart + 1) % 100).padStart(2, '0')
  return `${q} FY${String(fyStart).slice(2)}-${fyEndShort}`
}

function quarterEndDate(quarterLabel) {
  // Best-effort parse of "Q3 FY25-26" etc.
  const m = quarterLabel.match(/Q([1-4])\s*FY(\d{2})-(\d{2})/)
  if (!m) return null
  const q = parseInt(m[1], 10)
  const fyEndYear = 2000 + parseInt(m[3], 10)
  // Q1 ends 30 Sep (FY-start year); Q2 ends 31 Dec (FY-start year);
  // Q3 ends 31 Mar (FY-end year); Q4 ends 30 Jun (FY-end year).
  const fyStartYear = fyEndYear - 1
  switch (q) {
    case 1:
      return `${fyStartYear}-09-30`
    case 2:
      return `${fyStartYear}-12-31`
    case 3:
      return `${fyEndYear}-03-31`
    case 4:
      return `${fyEndYear}-06-30`
  }
  return null
}

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

function verbose(msg) {
  if (VERBOSE) log(`  ${msg}`)
}

async function main() {
  const quarter = currentQuarterLabel()
  const dueDate = quarterEndDate(quarter)
  log(`Quarter: ${quarter} · due ${dueDate ?? '(could not parse)'}`)
  log(`Founders: ${FOUNDERS.map(f => f.label).join(' + ')}`)

  let created = 0
  let skipped = 0

  for (const founder of FOUNDERS) {
    const items = checklistItems(founder, quarter)
    log(`${founder.label}: ${items.length} items`)
    for (const item of items) {
      if (DRY_RUN) {
        verbose(`DRY: would create "${item.name}"`)
        created++
        continue
      }
      try {
        const props = {
          Name: { title: [{ text: { content: item.name } }] },
          Description: { rich_text: [{ text: { content: item.description } }] },
          Status: { select: { name: 'To do' } },
          Owner: { select: { name: founder.notionOwner } },
          Priority: { select: { name: item.priority } },
          Source: { select: { name: 'Cron alert' } },
        }
        if (dueDate) {
          props.Due = { date: { start: dueDate } }
        }
        await notion.pages.create({
          parent: { database_id: ACTION_ITEMS_DB },
          properties: props,
        })
        created++
        verbose(`✓ ${item.name}`)
        // Notion rate limit: 3 req/sec
        await new Promise(r => setTimeout(r, 350))
      } catch (err) {
        log(`✗ Failed: ${item.name} — ${err.message}`)
        skipped++
      }
    }
  }

  log(`Done. Created ${created}, skipped ${skipped}.`)
  if (DRY_RUN) log('(dry-run — no Notion writes made)')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
