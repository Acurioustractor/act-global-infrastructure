import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Fuzzy funder key — strip punctuation + org-suffix stopwords, keep the distinctive token.
// Used to match Xero funders against GHL opportunity names (which vary in suffixing).
const GHL_STOP = new Set(
  'the foundation inc incorporated limited ltd council aboriginal corporation corp company co pty service services health role models division australia outback eclub of and goods beds buyer demand'.split(' ')
)
function ghlKey(s: string | null | undefined): string {
  const toks = (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !GHL_STOP.has(w))
  return toks[0] || (s || '').toLowerCase()
}
function isPaidStage(stage?: string | null, status?: string | null): boolean {
  return /paid|won|steward|reporting|committed|renew/i.test(stage || '') || /won|paid/i.test(status || '')
}
function ghlVerdict(xeroPaid: number, g?: { paid: number; open: number }): 'MATCH' | 'DRIFT' | 'PROSPECT' | null {
  if (!g) return null
  if (g.paid === 0) return g.open > 0 ? 'PROSPECT' : null
  if (Math.abs(xeroPaid - g.paid) <= Math.max(50, xeroPaid * 0.02)) return 'MATCH'
  return 'DRIFT'
}

export async function GET() {
  try {
    // Warmth + invoice summary for every funder
    const { data: warmth, error: warmthErr } = await supabase
      .from('v_funder_next_move')
      .select('*')
      .order('warmth_score', { ascending: false })
    if (warmthErr) throw warmthErr

    // Allocation overlay — link funders that have a project_funding_allocations row
    const { data: allocations, error: allocErr } = await supabase
      .from('v_project_funding_position')
      .select('*')
    if (allocErr) throw allocErr

    const allocByFunder = new Map<string, any>()
    for (const a of allocations || []) {
      allocByFunder.set(a.funder_org_name, a)
    }

    // GHL overlay — live ghl_opportunities mirror, matched to funders by fuzzy name.
    // Surfaces where the CRM's claimed money disagrees with Xero truth.
    const funderKeys = new Set<string>((warmth || []).map((w: any) => ghlKey(w.funder_name)))
    let opps: any[] = []
    {
      let from = 0
      for (;;) {
        const { data, error } = await supabase
          .from('ghl_opportunities')
          .select('id,name,monetary_value,pipeline_name,stage_name,status')
          .order('id', { ascending: true })
          .range(from, from + 999)
        if (error) throw error
        opps = opps.concat(data || [])
        if (!data || data.length < 1000) break
        from += 1000
      }
    }
    const ghlByKey = new Map<string, { paid: number; open: number; pipelines: Set<string> }>()
    for (const o of opps) {
      const inGoods = /goods/i.test(o.pipeline_name || '')
      const key = ghlKey(o.name)
      if (!inGoods && !funderKeys.has(key)) continue   // ignore opps unrelated to Goods or any funder
      const g = ghlByKey.get(key) || { paid: 0, open: 0, pipelines: new Set<string>() }
      const v = Number(o.monetary_value || 0)
      if (isPaidStage(o.stage_name, o.status)) g.paid += v
      else g.open += v
      if (o.pipeline_name) g.pipelines.add(o.pipeline_name)
      ghlByKey.set(key, g)
    }
    // Phantoms: GHL claims paid, but no Xero funder backs it (e.g. TFN / FRRR / AMP).
    const phantom = [...ghlByKey.entries()].filter(([k, g]) => g.paid > 0 && !funderKeys.has(k))

    const rows = (warmth || []).map((w: any) => {
      const alloc = allocByFunder.get(w.funder_name)
      const g = ghlByKey.get(ghlKey(w.funder_name))
      return {
        funderName: w.funder_name,
        warmthBand: w.warmth_band,
        warmthScore: w.warmth_score,
        nextMove: w.next_move,
        invoiceCount: w.invoice_count,
        paidCount: w.paid_count,
        authorisedCount: w.authorised_count,
        grossRevenue: Number(w.gross_revenue || 0),
        paidRevenue: Number(w.paid_revenue || 0),
        outstanding: Number(w.outstanding || 0),
        firstInvoice: w.first_invoice,
        lastInvoice: w.last_invoice,
        daysSinceLast: w.days_since_last,
        yearsActive: w.years_active,
        projects: w.projects || [],
        ghl: g
          ? {
              paid: Math.round(g.paid),
              open: Math.round(g.open),
              pipelines: [...g.pipelines],
              verdict: ghlVerdict(Number(w.paid_revenue || 0), g),
            }
          : null,
        // From allocation table if seeded:
        allocationId: alloc?.allocation_id ?? null,
        committedAmount: alloc?.committed_amount != null ? Number(alloc.committed_amount) : null,
        drawnAmount: alloc?.drawn_amount != null ? Number(alloc.drawn_amount) : null,
        remainingAmount: alloc?.remaining_amount != null ? Number(alloc.remaining_amount) : null,
        drawnPct: alloc?.drawn_pct != null ? Number(alloc.drawn_pct) : null,
        allocationStatus: alloc?.status ?? null,
        grantRef: alloc?.grant_or_contract_ref ?? null,
        pileTag: alloc?.pile_tag ?? null,
        periodStart: alloc?.period_start ?? null,
        periodEnd: alloc?.period_end ?? null,
        notes: alloc?.notes ?? null,
        nextReportDue: (alloc as any)?.next_report_due ?? null,
        nextReportName: (alloc as any)?.next_report_name ?? null,
      }
    })

    return NextResponse.json({
      rows,
      summary: {
        total: rows.length,
        byBand: {
          HOT: rows.filter(r => r.warmthBand === 'HOT').length,
          WARM: rows.filter(r => r.warmthBand === 'WARM').length,
          STEADY: rows.filter(r => r.warmthBand === 'STEADY').length,
          COOLING: rows.filter(r => r.warmthBand === 'COOLING').length,
          COLD: rows.filter(r => r.warmthBand === 'COLD').length,
        },
        totalGross: rows.reduce((s, r) => s + r.grossRevenue, 0),
        totalOutstanding: rows.reduce((s, r) => s + r.outstanding, 0),
        totalCommitted: rows.reduce((s, r) => s + (r.committedAmount || 0), 0),
        ghl: {
          goodsPaidTotal: Math.round([...ghlByKey.values()].reduce((s, g) => s + g.paid, 0)),
          phantomCount: phantom.length,
          phantomPaid: Math.round(phantom.reduce((s, [, g]) => s + g.paid, 0)),
        },
      },
    })
  } catch (error: any) {
    console.error('GET /api/finance/funders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const required = ['project_code', 'funder_org_name', 'committed_amount']
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json({ error: `Missing required field: ${f}` }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('project_funding_allocations')
      .insert({
        project_code: body.project_code,
        funder_org_name: body.funder_org_name,
        committed_amount: Number(body.committed_amount),
        grant_or_contract_ref: body.grant_or_contract_ref || null,
        period_start: body.period_start || null,
        period_end: body.period_end || null,
        status: body.status || 'proposed',
        drawdown_method: body.drawdown_method || null,
        pile_tag: body.pile_tag || null,
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ allocation: data })
  } catch (error: any) {
    console.error('POST /api/finance/funders error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
