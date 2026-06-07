#!/usr/bin/env node
/**
 * Auto-stub wiki/narrative/funders.json with Xero customers not yet documented.
 *
 * Implements action #3 from the 2026-05-16 "lifetime ledger" finding:
 *   "Wire funders.json to Xero — auto-stub any Xero contact_name that isn't
 *    in funders.json so the narrative tool surfaces a 'needs Nic/Ben write-up' stub."
 *
 * Behaviour:
 *   - For each Xero ACCREC customer with paid+authorised >= $5K NOT in funders.json:
 *     Append a minimal stub with stage='needs-writeup' and a xero_summary block
 *     (paid total, AR, last invoice). Slug derived from the contact name.
 *   - Existing funders are NEVER touched (the file is hand-curated narrative).
 *   - Marker for cleanup: stub entries have `needs_writeup: true` AND `xero_summary` block.
 *
 * Idempotent. Cleanup: grep for `"needs_writeup": true` and delete those keys.
 *
 * Usage:
 *   node scripts/backfill-funders-json-from-xero.mjs --dry-run
 *   node scripts/backfill-funders-json-from-xero.mjs --apply
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') })
loadEnv({ path: path.resolve(__dirname, '..', '.env') })

const APPLY = process.argv.includes('--apply')
const MIN_AMOUNT = 5000
const FUNDERS_PATH = path.resolve(__dirname, '..', 'wiki', 'narrative', 'funders.json')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
    .slice(0, 60)
}

async function fetchXeroCustomers() {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('contact_name, status, total, amount_due, date')
    .eq('type', 'ACCREC')
    .not('contact_name', 'is', null)
  if (error) throw error
  const m = new Map()
  for (const inv of data ?? []) {
    const name = inv.contact_name.trim()
    if (!name) continue
    let row = m.get(name)
    if (!row) {
      row = { name, paid: 0, authorised: 0, lastDate: null }
      m.set(name, row)
    }
    const total = Number(inv.total ?? 0)
    const due = Number(inv.amount_due ?? 0)
    if (inv.status === 'PAID') row.paid += total
    else if (inv.status === 'AUTHORISED' || inv.status === 'SUBMITTED') row.authorised += due
    if (inv.date && (!row.lastDate || inv.date > row.lastDate)) row.lastDate = inv.date
  }
  return [...m.values()]
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Threshold: paid + authorised ≥ $${MIN_AMOUNT.toLocaleString()}`)

  const funders = JSON.parse(readFileSync(FUNDERS_PATH, 'utf8'))
  const existingSlugs = new Set(Object.keys(funders.funders ?? {}))
  const existingNames = new Set(
    Object.values(funders.funders ?? {}).map(f => String(f.name ?? '').toLowerCase().trim()),
  )

  const customers = await fetchXeroCustomers()
  const eligible = customers
    .filter(c => c.paid + c.authorised >= MIN_AMOUNT)
    .sort((a, b) => (b.paid + b.authorised) - (a.paid + a.authorised))

  console.log(`\n${eligible.length} Xero customers above threshold`)
  console.log(`${existingSlugs.size} funders already in funders.json`)

  const toAdd = []
  for (const c of eligible) {
    if (existingNames.has(c.name.toLowerCase().trim())) continue
    let slug = slugify(c.name)
    if (!slug) continue
    if (existingSlugs.has(slug)) {
      // collision — try a numeric suffix
      let n = 2
      while (existingSlugs.has(`${slug}-${n}`)) n++
      slug = `${slug}-${n}`
    }
    existingSlugs.add(slug)
    toAdd.push({
      slug,
      name: c.name,
      paid: c.paid,
      authorised: c.authorised,
      lastDate: c.lastDate,
    })
  }

  console.log(`\nWill add ${toAdd.length} stubs:`)
  for (const a of toAdd.slice(0, 20)) {
    console.log(`  + ${a.slug.padEnd(45)} ${a.name}  paid=$${a.paid.toFixed(0)} ar=$${a.authorised.toFixed(0)}`)
  }
  if (toAdd.length > 20) console.log(`  ... and ${toAdd.length - 20} more`)

  if (!APPLY) {
    console.log('\nDRY-RUN. Re-run with --apply.')
    return
  }

  for (const a of toAdd) {
    funders.funders[a.slug] = {
      name: a.name,
      stage: 'needs-writeup',
      needs_writeup: true,
      themes: [],
      tone: 'TBD — write narrative based on existing Xero relationship history',
      claims_to_lead_with: [],
      framing_notes: `Auto-stubbed from xero_invoices on ${new Date().toISOString().slice(0, 10)}. Replace this stub with a hand-written brief: who this is, what we have done together, what we should ask for next. See xero_summary for the relationship financials.`,
      xero_summary: {
        paid_total_aud: Number(a.paid.toFixed(2)),
        outstanding_ar_aud: Number(a.authorised.toFixed(2)),
        last_invoice_date: a.lastDate,
      },
    }
  }
  funders.updated = new Date().toISOString().slice(0, 10)

  writeFileSync(FUNDERS_PATH, JSON.stringify(funders, null, 2) + '\n', 'utf8')
  console.log(`\nWrote ${toAdd.length} stubs to ${path.relative(process.cwd(), FUNDERS_PATH)}`)
  console.log(`funders.json now has ${Object.keys(funders.funders).length} entries`)
}

main().catch(e => { console.error(e); process.exit(1) })
