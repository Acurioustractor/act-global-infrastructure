import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Aggregate every vendor across xero_invoices (ACCPAY) + xero_transactions (SPEND/SPEND-OVERPAYMENT).
// Returns: vendor, total_count, total_sum, untagged_count, untagged_sum, last_date, top_project, confidence.
export async function GET() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        WITH unioned AS (
          SELECT contact_name, project_code, total, date
          FROM xero_transactions
          WHERE contact_name IS NOT NULL AND type IN ('SPEND','SPEND-OVERPAYMENT','RECEIVE')
          UNION ALL
          SELECT contact_name, project_code, total, date
          FROM xero_invoices
          WHERE contact_name IS NOT NULL AND type='ACCPAY' AND status IN ('AUTHORISED','PAID')
        ),
        agg AS (
          SELECT
            contact_name AS vendor,
            COUNT(*) AS total_count,
            SUM(total) AS total_sum,
            COUNT(*) FILTER (WHERE project_code IS NULL OR project_code='') AS untagged_count,
            COALESCE(SUM(total) FILTER (WHERE project_code IS NULL OR project_code=''), 0) AS untagged_sum,
            MAX(date) AS last_date,
            MIN(date) AS first_date
          FROM unioned
          GROUP BY contact_name
        ),
        by_project AS (
          SELECT contact_name, project_code, COUNT(*) AS n
          FROM unioned
          WHERE project_code IS NOT NULL AND project_code <> ''
          GROUP BY contact_name, project_code
        ),
        ranked AS (
          SELECT contact_name, project_code, n,
            ROW_NUMBER() OVER (PARTITION BY contact_name ORDER BY n DESC) AS rn,
            SUM(n) OVER (PARTITION BY contact_name) AS tagged_total
          FROM by_project
        ),
        top_project AS (
          SELECT contact_name, project_code AS top_project, n AS top_count,
            ROUND((n::numeric / NULLIF(tagged_total,0)) * 100, 0) AS confidence
          FROM ranked WHERE rn = 1
        )
        SELECT
          a.vendor,
          a.total_count,
          a.total_sum,
          a.untagged_count,
          a.untagged_sum,
          a.last_date,
          a.first_date,
          t.top_project,
          t.confidence
        FROM agg a
        LEFT JOIN top_project t ON t.contact_name = a.vendor
        ORDER BY a.total_sum DESC
      `,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ vendors: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
