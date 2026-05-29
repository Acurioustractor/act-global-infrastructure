#!/usr/bin/env node
/**
 * Finance anomaly/dup watch (#3 of the ongoing-bookkeeping roadmap).
 *
 * Detects the recurring messes so they can't re-accumulate:
 *   1. VOID candidates — an AUTHORISED bill that duplicates a PAID bill
 *      (same vendor + amount, close date). The Carla/Kirmos/Clearview pattern.
 *   2. Same-day exact duplicates — vendor + amount + date appearing >1.
 *   3. GE-429 creep — bills still coded to General Expenses (429).
 *   4. Vendor-name variants — near-identical contact names (split spend).
 *
 * Reads the app's DB (NEXT_PUBLIC_SUPABASE_URL). Console by default; --json.
 *
 * Usage: node scripts/detect-finance-anomalies.mjs [--json]
 */
import '../lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY)

const SINCE = '2024-07-01'
const JSON_OUT = process.argv.includes('--json')
const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const days = (a, b) => Math.abs((new Date(a) - new Date(b)) / 86400000)
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

async function fetchAllBills() {
  const PAGE = 1000
  let all = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('xero_invoices')
      .select('xero_id, invoice_number, contact_name, total, date, status, has_attachments, line_items')
      .eq('type', 'ACCPAY')
      .in('status', ['AUTHORISED', 'PAID'])
      .gte('date', SINCE)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) { console.error('fetch bills:', error.message); break }
    all = all.concat(data || [])
    if (!data || data.length < PAGE) break
  }
  return all
}

function xeroLink(id) { return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${id}` }

async function main() {
  const bills = await fetchAllBills()

  // 1. VOID candidates: same vendor+amount, a PAID one exists, AUTHORISED is the dup
  const byVendorAmt = new Map()
  for (const b of bills) {
    const k = `${norm(b.contact_name)}|${Number(b.total).toFixed(2)}`
    if (!byVendorAmt.has(k)) byVendorAmt.set(k, [])
    byVendorAmt.get(k).push(b)
  }
  const voidCandidates = []
  for (const group of byVendorAmt.values()) {
    if (Number(group[0].total) <= 50) continue
    const paid = group.filter((b) => b.status === 'PAID')
    const auth = group.filter((b) => b.status === 'AUTHORISED')
    if (!paid.length || !auth.length) continue
    for (const a of auth) {
      const near = paid.find((p) => days(p.date, a.date) <= 60)
      if (!near) continue
      voidCandidates.push({
        vendor: a.contact_name, amount: Number(a.total), date: a.date,
        authInvoice: a.invoice_number || '(no #)', authId: a.xero_id, authHasAttach: !!a.has_attachments,
        paidInvoice: near.invoice_number || '(no #)', paidId: near.xero_id, paidDate: near.date,
        xeroLink: xeroLink(a.xero_id),
      })
    }
  }

  // 2. Same-day exact dups (vendor+amount+date >1)
  const byExact = new Map()
  for (const b of bills) {
    if (Number(b.total) <= 50) continue
    const k = `${norm(b.contact_name)}|${Number(b.total).toFixed(2)}|${b.date}`
    if (!byExact.has(k)) byExact.set(k, [])
    byExact.get(k).push(b)
  }
  const exactDups = [...byExact.values()].filter((g) => g.length > 1)
    .map((g) => ({ vendor: g[0].contact_name, amount: Number(g[0].total), date: g[0].date, count: g.length }))

  // 3. GE-429 creep
  const ge = bills.filter((b) => (b.line_items || []).some((li) => String(li.account_code) === '429'))
  const geAmount = ge.reduce((s, b) => s + (b.line_items || []).filter((li) => String(li.account_code) === '429').reduce((a, li) => a + Number(li.line_amount || 0), 0), 0)

  // 4. Vendor-name variants (same normalised name, different raw spellings)
  const byNorm = new Map()
  for (const b of bills) {
    const n = norm(b.contact_name)
    if (!n) continue
    if (!byNorm.has(n)) byNorm.set(n, new Set())
    byNorm.get(n).add((b.contact_name || '').trim())
  }
  const variants = [...byNorm.entries()].filter(([, names]) => names.size > 1).map(([, names]) => [...names])

  const result = {
    date: new Date().toISOString().slice(0, 10),
    billsScanned: bills.length,
    voidCandidates: voidCandidates.sort((a, b) => b.amount - a.amount),
    exactDups,
    ge429: { bills: ge.length, amount: Math.round(geAmount) },
    vendorVariants: variants,
  }

  if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); return }

  console.log(`\n🔍 Finance anomaly scan — ${result.date}  (${bills.length} ACCPAY bills)\n`)
  console.log(`⚠️  VOID candidates (AUTHORISED dup of a PAID bill): ${voidCandidates.length}`)
  for (const v of voidCandidates) {
    console.log(`    ${v.date}  ${fmt(v.amount).padStart(12)}  ${(v.vendor || '').slice(0, 28).padEnd(28)}  ${v.authInvoice} [AUTH${v.authHasAttach ? '' : ', no-attach'}] ↔ ${v.paidInvoice} [PAID ${v.paidDate}]`)
  }
  console.log(`\n👯 Same-day exact dups: ${exactDups.length}`)
  for (const d of exactDups.slice(0, 15)) console.log(`    ${d.date}  ${fmt(d.amount).padStart(12)}  ${(d.vendor || '').slice(0, 28)}  ×${d.count}`)
  console.log(`\n💸 GE-429 creep: ${ge.length} bills · ${fmt(geAmount)}`)
  console.log(`\n🔤 Vendor-name variants: ${variants.length} groups`)
  for (const g of variants.slice(0, 10)) console.log(`    ${g.join('  |  ')}`)
  console.log('')
}
main().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
