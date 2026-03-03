import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Known SaaS/subscription vendors and their categories
const KNOWN_SUBSCRIPTIONS: Record<string, { category: string; is_essential: boolean }> = {
  'OpenAI': { category: 'ai_tools', is_essential: true },
  'Anthropic': { category: 'ai_tools', is_essential: true },
  'Cursor AI': { category: 'development', is_essential: true },
  'Midjourney Inc': { category: 'ai_tools', is_essential: false },
  'Notion Labs': { category: 'productivity', is_essential: true },
  'Webflow': { category: 'hosting_domains', is_essential: true },
  'Squarespace': { category: 'hosting_domains', is_essential: true },
  'Only Domains': { category: 'hosting_domains', is_essential: true },
  'Mighty Networks': { category: 'marketing_crm', is_essential: false },
  'HighLevel': { category: 'marketing_crm', is_essential: true },
  'LinkedIn Singapore': { category: 'marketing_crm', is_essential: false },
  'Linktree': { category: 'marketing_crm', is_essential: false },
  'Dialpad': { category: 'communication', is_essential: true },
  'Descript': { category: 'design_creative', is_essential: false },
  'Audible': { category: 'media_entertainment', is_essential: false },
  'Amazon Prime': { category: 'media_entertainment', is_essential: false },
  'Belong': { category: 'infrastructure', is_essential: true },
  'Garmin Australasia': { category: 'media_entertainment', is_essential: false },
  'AHM': { category: 'other', is_essential: true },
}

// Non-subscription vendors to exclude (irregular purchases, travel, food, etc.)
const EXCLUDED_VENDORS = new Set([
  'Uber', 'Uber Eats', 'Uber Amsterdam', 'Qantas', 'NAB', 'NAB Fee', 'NAB International Fee',
  'Nicholas Marchesi', 'Overseas Travel - Misc small expenses', '2Up Spending',
  'Flight Bar Witta', 'Amazon', 'Cabcharge', 'Woolworths', 'BP',
  'HelloFresh', 'GoPayID', 'Chris Witta', 'Little Florence Cafe',
  'La Macelleria Gelateria', 'Guzman Y Gomez',
])

// DB constraint: monthly | annual | usage | one_time
function detectBillingCycle(avgGapDays: number): string {
  if (avgGapDays <= 45) return 'monthly'
  if (avgGapDays <= 200) return 'monthly' // quarterly charges stored as monthly (DB doesn't support quarterly)
  return 'annual'
}

function calculateConfidence(payments: number, gapStddev: number, amountStddev: number, avgAmount: number): number {
  let confidence = 50
  // More payments = higher confidence
  if (payments >= 10) confidence += 20
  else if (payments >= 5) confidence += 10
  // Low payment gap variance = regular = higher confidence
  if (gapStddev < 10) confidence += 15
  else if (gapStddev < 20) confidence += 5
  // Low amount variance = subscription (not variable purchases)
  const amountCv = avgAmount > 0 ? amountStddev / avgAmount : 1
  if (amountCv < 0.1) confidence += 15
  else if (amountCv < 0.3) confidence += 5
  return Math.min(confidence, 100)
}

export async function POST() {
  try {
    // Find recurring vendors from Xero transactions
    const { data: recurring, error: recurringError } = await supabase.rpc('execute_sql', {
      query: `
        WITH payment_gaps AS (
          SELECT
            contact_name,
            date,
            ABS(total) as amount,
            LAG(date) OVER (PARTITION BY contact_name ORDER BY date) as prev_date,
            date - LAG(date) OVER (PARTITION BY contact_name ORDER BY date) as days_gap
          FROM xero_transactions
          WHERE type = 'SPEND'
            AND contact_name IS NOT NULL
            AND contact_name != ''
        )
        SELECT
          contact_name,
          COUNT(*) as payments,
          ROUND(AVG(days_gap)) as avg_gap_days,
          COALESCE(ROUND(STDDEV(days_gap)), 0) as gap_stddev,
          ROUND(AVG(amount)::numeric, 2) as avg_amount,
          COALESCE(ROUND(STDDEV(amount)::numeric, 2), 0) as amount_stddev,
          MAX(date) as last_payment
        FROM payment_gaps
        WHERE days_gap IS NOT NULL
        GROUP BY contact_name
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) DESC
      `
    })

    // Fallback: query directly if RPC doesn't exist
    let vendors: Array<{
      contact_name: string
      payments: number
      avg_gap_days: number
      gap_stddev: number
      avg_amount: number
      amount_stddev: number
      last_payment: string
    }> = []

    if (recurringError) {
      // Fallback: use direct query approach
      const { data: txns, error: txnError } = await supabase
        .from('xero_transactions')
        .select('contact_name, date, total, type, project_code')
        .eq('type', 'SPEND')
        .not('contact_name', 'is', null)
        .order('contact_name')
        .order('date')

      if (txnError) throw txnError

      // Group by contact and compute stats
      const byVendor = new Map<string, Array<{ date: string; amount: number; project_code: string | null }>>()
      for (const txn of txns || []) {
        if (!txn.contact_name) continue
        if (!byVendor.has(txn.contact_name)) byVendor.set(txn.contact_name, [])
        byVendor.get(txn.contact_name)!.push({
          date: txn.date,
          amount: Math.abs(txn.total || 0),
          project_code: txn.project_code,
        })
      }

      for (const [name, payments] of byVendor) {
        if (payments.length < 3) continue
        const gaps: number[] = []
        for (let i = 1; i < payments.length; i++) {
          const d1 = new Date(payments[i - 1].date)
          const d2 = new Date(payments[i].date)
          gaps.push(Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)))
        }
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
        const gapStd = Math.sqrt(gaps.reduce((sum, g) => sum + (g - avgGap) ** 2, 0) / gaps.length)
        const amounts = payments.map(p => p.amount)
        const avgAmt = amounts.reduce((a, b) => a + b, 0) / amounts.length
        const amtStd = Math.sqrt(amounts.reduce((sum, a) => sum + (a - avgAmt) ** 2, 0) / amounts.length)

        vendors.push({
          contact_name: name,
          payments: payments.length,
          avg_gap_days: Math.round(avgGap),
          gap_stddev: Math.round(gapStd),
          avg_amount: Math.round(avgAmt * 100) / 100,
          amount_stddev: Math.round(amtStd * 100) / 100,
          last_payment: payments[payments.length - 1].date,
        })
      }
    } else {
      vendors = recurring || []
    }

    // Get existing subscriptions to avoid duplicates
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('vendor_name')

    const existingNames = new Set((existing || []).map(s => s.vendor_name))

    // Get project codes from recent transactions for each vendor
    const { data: projectData } = await supabase
      .from('xero_transactions')
      .select('contact_name, project_code')
      .eq('type', 'SPEND')
      .not('project_code', 'is', null)

    const vendorProjects = new Map<string, Set<string>>()
    for (const row of projectData || []) {
      if (!row.contact_name || !row.project_code) continue
      if (!vendorProjects.has(row.contact_name)) vendorProjects.set(row.contact_name, new Set())
      vendorProjects.get(row.contact_name)!.add(row.project_code)
    }

    // Filter and create subscriptions
    const toInsert: Array<Record<string, unknown>> = []
    const discovered: Array<Record<string, unknown>> = []

    for (const v of vendors) {
      if (EXCLUDED_VENDORS.has(v.contact_name)) continue
      if (existingNames.has(v.contact_name)) continue

      const confidence = calculateConfidence(v.payments, v.gap_stddev, v.amount_stddev, v.avg_amount)
      const known = KNOWN_SUBSCRIPTIONS[v.contact_name]
      const billingCycle = detectBillingCycle(v.avg_gap_days)

      // Only auto-insert known subscriptions or high-confidence detections
      if (known || confidence >= 70) {
        const projects = vendorProjects.get(v.contact_name)
        const projectCodes = projects ? Array.from(projects) : []

        const sub = {
          vendor_name: v.contact_name,
          amount: v.avg_amount,
          currency: 'AUD',
          billing_cycle: billingCycle,
          category: known?.category || 'other',
          account_status: 'active',
          is_essential: known?.is_essential || false,
          project_codes: projectCodes,
          discovery_source: ['xero_transactions'],
          discovery_confidence: confidence,
          last_discovery_check: new Date().toISOString(),
          last_payment_date: v.last_payment,
          expected_amount: v.avg_amount,
        }

        toInsert.push(sub)
        discovered.push({ ...sub, payments: v.payments, avg_gap_days: v.avg_gap_days })
      }
    }

    // Insert discovered subscriptions
    let inserted = 0
    if (toInsert.length > 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('subscriptions')
        .insert(toInsert)
        .select()

      if (insertError) {
        console.error('Insert error:', insertError)
      } else {
        inserted = insertedData?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      discovered: discovered.length,
      inserted,
      subscriptions: discovered,
      message: `Discovered ${discovered.length} subscriptions, inserted ${inserted} new ones`,
    })
  } catch (e) {
    console.error('Discovery error:', e)
    return NextResponse.json({ error: (e as Error).message, success: false }, { status: 500 })
  }
}
