import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { daysBack = 90 } = await request.json()

    // Get existing pending receipts to avoid duplicates
    const { data: existing } = await supabase
      .from('receipt_matches')
      .select('source_id')
      .in('status', ['pending', 'email_suggested', 'deferred', 'resolved'])

    const existingIds = new Set((existing || []).map((e) => e.source_id))

    // Get SPEND transactions without attachments from the last N days
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('*')
      .eq('type', 'SPEND')
      .eq('has_attachments', false)
      .gte('date', since)
      .order('date', { ascending: false })

    const newItems = (transactions || []).filter(
      (t) => !existingIds.has(t.xero_transaction_id)
    )

    // Categorize and save new items
    let saved = 0
    for (const txn of newItems) {
      const vendor = txn.contact_name || 'Unknown'
      const category = categorizeVendor(vendor)

      // Skip bank fees and transfers
      if (category === 'bank_fee' || category === 'transfer') continue

      const { error } = await supabase.from('receipt_matches').insert({
        source_type: 'transaction',
        source_id: txn.xero_transaction_id,
        vendor_name: vendor,
        amount: Math.abs(txn.total),
        transaction_date: txn.date,
        category,
        status: 'pending',
        week_start: getWeekStart(txn.date),
      })

      if (!error) saved++
    }

    return NextResponse.json({
      success: true,
      detected: newItems.length,
      saved,
      skipped: newItems.length - saved,
    })
  } catch (e) {
    console.error('Receipt scan error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}

function categorizeVendor(vendor: string): string {
  const v = vendor.toLowerCase()
  if (/uber|qantas|virgin|jetstar|airbnb|booking\.com/.test(v)) return 'travel'
  if (
    /webflow|notion|openai|cursor|descript|amazon prime|audible|mighty|highlevel|railway|apple|xero/.test(
      v
    )
  )
    return 'subscription'
  if (/nab.*fee|bank.*fee|interest|merchant fee/.test(v)) return 'bank_fee'
  if (/transfer/.test(v)) return 'transfer'
  return 'other'
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}
