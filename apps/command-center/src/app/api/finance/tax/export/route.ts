import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const quarter = searchParams.get('quarter') || ''

    // Parse quarter to date range
    const match = quarter.match(/(\d{4})-Q(\d)/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid quarter format. Use YYYY-QN' }, { status: 400 })
    }

    const year = parseInt(match[1])
    const q = parseInt(match[2])
    const qStartMonth = (q - 1) * 3
    const start = `${year}-${String(qStartMonth + 1).padStart(2, '0')}-01`
    const endMonth = qStartMonth + 3
    const endYear = endMonth > 12 ? year + 1 : year
    const endM = endMonth > 12 ? endMonth - 12 : endMonth
    const end = `${endYear}-${String(endM).padStart(2, '0')}-01`

    // Fetch transactions
    const { data: transactions } = await supabase
      .from('xero_transactions')
      .select('date, contact_name, description, total, type, account_code, project_code, line_items')
      .gte('date', start)
      .lt('date', end)
      .order('date', { ascending: true })

    // Build CSV
    const headers = ['Date', 'Contact', 'Description', 'Amount', 'Type', 'Account Code', 'Project Code', 'GST Amount']
    const rows = (transactions || []).map((tx: any) => {
      // Extract GST from line items
      let gst = 0
      if (Array.isArray(tx.line_items)) {
        tx.line_items.forEach((li: any) => {
          gst += Math.abs(li.tax_amount || li.TaxAmount || 0)
        })
      }

      return [
        tx.date,
        `"${(tx.contact_name || '').replace(/"/g, '""')}"`,
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.total || 0,
        tx.type,
        tx.account_code || '',
        tx.project_code || '',
        gst.toFixed(2),
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tax-export-${quarter}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error in tax export:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
