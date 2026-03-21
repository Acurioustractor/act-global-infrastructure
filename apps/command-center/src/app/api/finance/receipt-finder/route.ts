import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface ReceiptMatch {
  source: 'gmail' | 'calendar' | 'xero_transaction' | 'xero_invoice' | 'receipt_match'
  confidence: 'high' | 'medium' | 'low'
  summary: string
  date?: string
  amount?: number
  project_code?: string
  details: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const { vendor, amount, date, project_code, transaction_id } = (await request.json()) as {
      vendor?: string
      amount?: number
      date?: string
      project_code?: string
      transaction_id?: string
    }

    if (!vendor && !amount && !date && !transaction_id) {
      return NextResponse.json({ error: 'Provide at least one of: vendor, amount, date, transaction_id' }, { status: 400 })
    }

    const matches: ReceiptMatch[] = []
    const dateRange = getDateRange(date)

    // Run all searches in parallel
    const [gmailResults, calendarResults, txResults, invoiceResults, receiptResults] = await Promise.all([
      searchGmail(vendor, amount, dateRange),
      searchCalendar(vendor, dateRange),
      searchTransactions(vendor, amount, dateRange, project_code, transaction_id),
      searchInvoices(vendor, amount, dateRange),
      searchReceiptMatches(vendor, amount, dateRange),
    ])

    matches.push(...gmailResults, ...calendarResults, ...txResults, ...invoiceResults, ...receiptResults)

    // Sort by confidence then date
    const confidenceOrder = { high: 0, medium: 1, low: 2 }
    matches.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence])

    return NextResponse.json({
      query: { vendor, amount, date, project_code, transaction_id },
      matches,
      total: matches.length,
      sources: {
        gmail: gmailResults.length,
        calendar: calendarResults.length,
        xero_transaction: txResults.length,
        xero_invoice: invoiceResults.length,
        receipt_match: receiptResults.length,
      },
    })
  } catch (error) {
    console.error('Receipt finder error:', error)
    return NextResponse.json({ error: 'Failed to search for receipts' }, { status: 500 })
  }
}

function getDateRange(date?: string): { from: string; to: string } | null {
  if (!date) return null
  const d = new Date(date)
  const from = new Date(d)
  from.setDate(from.getDate() - 7)
  const to = new Date(d)
  to.setDate(to.getDate() + 7)
  return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] }
}

async function searchGmail(vendor?: string, amount?: number, dateRange?: { from: string; to: string } | null): Promise<ReceiptMatch[]> {
  if (!vendor) return []

  let query = supabase
    .from('communications')
    .select('id, subject, from_address, to_address, date, snippet, project_code')
    .or(`subject.ilike.%${vendor}%,from_address.ilike.%${vendor}%,snippet.ilike.%${vendor}%`)
    .order('date', { ascending: false })
    .limit(10)

  if (dateRange) {
    query = query.gte('date', dateRange.from).lte('date', dateRange.to)
  }

  const { data } = await query

  return (data || []).map(email => {
    // Check if the email likely contains a receipt/invoice
    const subject = (email.subject || '').toLowerCase()
    const isReceipt = /receipt|invoice|order|confirm|payment|tax\s*invoice|statement/.test(subject)
    const hasAmount = amount ? (email.snippet || '').includes(String(amount)) || (email.snippet || '').includes(amount.toFixed(2)) : false

    let confidence: 'high' | 'medium' | 'low' = 'low'
    if (isReceipt && hasAmount) confidence = 'high'
    else if (isReceipt || hasAmount) confidence = 'medium'

    return {
      source: 'gmail' as const,
      confidence,
      summary: `Email: "${email.subject}" from ${email.from_address}`,
      date: email.date,
      project_code: email.project_code,
      details: { id: email.id, subject: email.subject, from: email.from_address, snippet: email.snippet?.slice(0, 200) },
    }
  })
}

async function searchCalendar(vendor?: string, dateRange?: { from: string; to: string } | null): Promise<ReceiptMatch[]> {
  if (!dateRange) return []

  let query = supabase
    .from('calendar_events')
    .select('id, title, description, start_time, end_time, location')
    .gte('start_time', dateRange.from)
    .lte('start_time', dateRange.to)
    .order('start_time', { ascending: false })
    .limit(20)

  const { data } = await query

  if (!data || data.length === 0) return []

  // Look for travel/meeting events that might generate receipts
  const travelKeywords = /flight|hotel|accommodation|travel|airport|qantas|virgin|jetstar|uber|taxi|palm island|darwin|yarrabah|cairns|brisbane|sydney|melbourne/i
  const mealKeywords = /lunch|dinner|breakfast|coffee|meeting|workshop|event/i

  return (data || [])
    .filter(event => {
      const text = `${event.title} ${event.description || ''} ${event.location || ''}`
      if (vendor && text.toLowerCase().includes(vendor.toLowerCase())) return true
      if (travelKeywords.test(text) || mealKeywords.test(text)) return true
      return false
    })
    .map(event => {
      const text = `${event.title} ${event.description || ''} ${event.location || ''}`
      const isTravel = travelKeywords.test(text)
      const vendorMatch = vendor && text.toLowerCase().includes(vendor.toLowerCase())

      return {
        source: 'calendar' as const,
        confidence: vendorMatch ? 'high' as const : isTravel ? 'medium' as const : 'low' as const,
        summary: `Calendar: "${event.title}"${event.location ? ` at ${event.location}` : ''} on ${new Date(event.start_time).toLocaleDateString('en-AU')}`,
        date: event.start_time,
        details: { id: event.id, title: event.title, location: event.location, description: event.description?.slice(0, 200) },
      }
    })
}

async function searchTransactions(vendor?: string, amount?: number, dateRange?: { from: string; to: string } | null, projectCode?: string, transactionId?: string): Promise<ReceiptMatch[]> {
  let query = supabase
    .from('xero_transactions')
    .select('id, contact_name, total, date, bank_account, project_code, type, reference')
    .order('date', { ascending: false })
    .limit(20)

  if (transactionId) {
    query = query.eq('id', transactionId)
  } else {
    if (vendor) query = query.ilike('contact_name', `%${vendor}%`)
    if (amount) {
      // Search for both positive and negative amounts (within 10% tolerance)
      const tolerance = Math.abs(amount) * 0.1
      const absAmount = Math.abs(amount)
      query = query.gte('total', -(absAmount + tolerance)).lte('total', absAmount + tolerance)
    }
    if (dateRange) query = query.gte('date', dateRange.from).lte('date', dateRange.to)
    if (projectCode) query = query.eq('project_code', projectCode)
  }

  const { data } = await query

  return (data || []).map(tx => ({
    source: 'xero_transaction' as const,
    confidence: 'high' as const,
    summary: `Bank: ${tx.type} $${Math.abs(tx.total).toFixed(2)} — ${tx.contact_name || 'Unknown'} on ${tx.date}`,
    date: tx.date,
    amount: tx.total,
    project_code: tx.project_code,
    details: { id: tx.id, contact_name: tx.contact_name, total: tx.total, bank_account: tx.bank_account, reference: tx.reference },
  }))
}

async function searchInvoices(vendor?: string, amount?: number, dateRange?: { from: string; to: string } | null): Promise<ReceiptMatch[]> {
  let query = supabase
    .from('xero_invoices')
    .select('id, invoice_number, contact_name, total, date, due_date, status, type, project_code, has_attachments')
    .eq('type', 'ACCPAY') // Bills only — these ARE the receipts
    .order('date', { ascending: false })
    .limit(20)

  if (vendor) query = query.ilike('contact_name', `%${vendor}%`)
  if (amount) {
    const tolerance = Math.abs(amount) * 0.1
    query = query.gte('total', Math.abs(amount) - tolerance).lte('total', Math.abs(amount) + tolerance)
  }
  if (dateRange) query = query.gte('date', dateRange.from).lte('date', dateRange.to)

  const { data } = await query

  return (data || []).map(inv => ({
    source: 'xero_invoice' as const,
    confidence: inv.has_attachments ? 'high' as const : 'medium' as const,
    summary: `Bill ${inv.invoice_number}: $${inv.total.toFixed(2)} from ${inv.contact_name} [${inv.status}]${inv.has_attachments ? ' (has attachment)' : ' (NO attachment)'}`,
    date: inv.date,
    amount: inv.total,
    project_code: inv.project_code,
    details: { id: inv.id, invoice_number: inv.invoice_number, contact_name: inv.contact_name, status: inv.status, has_attachments: inv.has_attachments },
  }))
}

async function searchReceiptMatches(vendor?: string, amount?: number, dateRange?: { from: string; to: string } | null): Promise<ReceiptMatch[]> {
  let query = supabase
    .from('receipt_matches')
    .select('id, vendor_name, amount, transaction_date, category, status, project_code, match_confidence')
    .order('transaction_date', { ascending: false })
    .limit(20)

  if (vendor) query = query.ilike('vendor_name', `%${vendor}%`)
  if (amount) {
    const tolerance = Math.abs(amount) * 0.1
    query = query.gte('amount', Math.abs(amount) - tolerance).lte('amount', Math.abs(amount) + tolerance)
  }
  if (dateRange) query = query.gte('transaction_date', dateRange.from).lte('transaction_date', dateRange.to)

  const { data } = await query

  return (data || []).map(rm => ({
    source: 'receipt_match' as const,
    confidence: rm.status === 'resolved' ? 'high' as const : 'medium' as const,
    summary: `Receipt pipeline: $${rm.amount?.toFixed(2)} ${rm.vendor_name} [${rm.status}]`,
    date: rm.transaction_date,
    amount: rm.amount,
    project_code: rm.project_code,
    details: { id: rm.id, vendor_name: rm.vendor_name, status: rm.status, category: rm.category, match_confidence: rm.match_confidence },
  }))
}
