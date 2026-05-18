import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// For each distinct vendor in xero_transactions+xero_invoices, return the
// most-common project_code (and confidence). Used to suggest a tag for
// UNTAGGED rows.
export async function GET() {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        WITH unioned AS (
          SELECT contact_name, project_code FROM xero_transactions WHERE contact_name IS NOT NULL
          UNION ALL
          SELECT contact_name, project_code FROM xero_invoices WHERE contact_name IS NOT NULL AND type='ACCPAY'
        ),
        counted AS (
          SELECT contact_name, project_code, COUNT(*) AS n
          FROM unioned
          GROUP BY contact_name, project_code
        ),
        totals AS (
          SELECT contact_name, SUM(n) AS total FROM counted GROUP BY contact_name
        ),
        ranked AS (
          SELECT c.contact_name, c.project_code, c.n, t.total,
                 ROW_NUMBER() OVER (PARTITION BY c.contact_name ORDER BY c.n DESC) AS rn
          FROM counted c JOIN totals t ON t.contact_name = c.contact_name
          WHERE c.project_code IS NOT NULL
        )
        SELECT contact_name AS vendor, project_code, n, total,
               ROUND((n::numeric / NULLIF(total,0)) * 100, 0) AS confidence
        FROM ranked
        WHERE rn = 1
        ORDER BY total DESC
      `,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ suggestions: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
