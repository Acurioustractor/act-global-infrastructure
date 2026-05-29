#!/usr/bin/env node
/**
 * Finance daily digest (#2 of the ongoing-bookkeeping roadmap).
 *
 * Computes the day's bookkeeping delta + outstanding actions and prints a
 * concise digest. DRY-RUN by default (console only). Sending to Telegram/Notion
 * + the PM2 cron are gated separately (Tier-3 external send) — pass --json for
 * machine output.
 *
 * Reads the SAME DB the command-center app reads (NEXT_PUBLIC_SUPABASE_URL),
 * not SUPABASE_SHARED_URL — so the numbers match /finance/mirror.
 *
 * Usage:
 *   node scripts/finance-daily-digest.mjs            # human digest
 *   node scripts/finance-daily-digest.mjs --json     # JSON
 */
import '../lib/load-env.mjs'
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(URL, KEY)

const ACT = ['NAB Visa ACT #8815', 'NJ Marchesi T/as ACT Everyday']
const SINCE_FY = '2024-07-01'
const JSON_OUT = process.argv.includes('--json')
const fmt = (n) => '$' + Number(n || 0).toLocaleString('en-AU', { maximumFractionDigits: 0 })
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)

async function count(table, build) {
  let q = sb.from(table).select('id', { count: 'exact', head: true })
  q = build(q)
  const { count, error } = await q
  if (error) { console.error(`count ${table}: ${error.message}`); return 0 }
  return count || 0
}

async function main() {
  const last7 = ago(7)

  // --- Action items (outstanding) ---
  const untaggedTxns = await count('xero_transactions', (q) =>
    q.in('type', ['SPEND', 'SPEND-OVERPAYMENT', 'RECEIVE']).in('bank_account', ACT).is('project_code', null).gte('date', SINCE_FY))
  const untaggedBills = await count('xero_invoices', (q) =>
    q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).is('project_code', null).gte('date', SINCE_FY))
  const billsNoReceipt = await count('xero_invoices', (q) =>
    q.eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).or('has_attachments.is.null,has_attachments.eq.false').gte('date', SINCE_FY))

  // --- Reconciliation % (ACT bank txns) ---
  const reconTotal = await count('xero_transactions', (q) => q.in('bank_account', ACT).gte('date', SINCE_FY))
  const reconDone = await count('xero_transactions', (q) => q.in('bank_account', ACT).eq('is_reconciled', true).gte('date', SINCE_FY))
  const reconPct = reconTotal ? Math.round((reconDone / reconTotal) * 100) : 0

  // --- Delta: new in last 7 days ---
  const newTxns = await count('xero_transactions', (q) => q.in('bank_account', ACT).gte('date', last7))
  const newBills = await count('xero_invoices', (q) => q.eq('type', 'ACCPAY').gte('date', last7))

  // --- Possible duplicates: recent (60d) bills + ACT spends, same contact+amount+date ---
  const since60 = ago(60)
  const [{ data: recentBills }, { data: recentTxns }] = await Promise.all([
    sb.from('xero_invoices').select('contact_name,total,date,status').eq('type', 'ACCPAY').in('status', ['AUTHORISED', 'PAID']).gte('date', since60).limit(1000),
    sb.from('xero_transactions').select('contact_name,total,date').eq('type', 'SPEND').in('bank_account', ACT).gte('date', since60).limit(1000),
  ])
  const dupKey = new Map()
  for (const r of [...(recentBills || []), ...(recentTxns || [])]) {
    if (Number(r.total) <= 100) continue
    const k = `${(r.contact_name || '').toLowerCase()}|${Number(r.total).toFixed(2)}|${r.date}`
    dupKey.set(k, (dupKey.get(k) || 0) + 1)
  }
  const dupGroups = [...dupKey.values()].filter((n) => n > 1).length

  const digest = {
    date: new Date().toISOString().slice(0, 10),
    untagged: untaggedTxns + untaggedBills,
    untaggedTxns, untaggedBills,
    billsNoReceipt,
    reconPct, reconDone, reconTotal,
    newLast7: newTxns + newBills,
    possibleDuplicates: dupGroups,
  }

  if (JSON_OUT) { console.log(JSON.stringify(digest, null, 2)); return }

  console.log(`\n📊 ACT finance daily digest — ${digest.date}\n`)
  console.log(`  🆕 New in last 7 days:     ${digest.newLast7} transactions/bills`)
  console.log(`  🏷  Untagged to clear:      ${digest.untagged}  (${untaggedTxns} txns · ${untaggedBills} bills)`)
  console.log(`  🧾 Bills missing a receipt: ${billsNoReceipt}`)
  console.log(`  👯 Possible duplicates:     ${dupGroups}`)
  console.log(`  ✅ Reconciliation:          ${reconPct}%  (${reconDone}/${reconTotal} ACT spend)`)
  console.log(`\n  → Clear at command.act.place/finance/mirror\n`)
}
main().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
