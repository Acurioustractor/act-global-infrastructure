import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// --- Attribution maps (kept in sync with scripts/generate-project-financials.mjs) ---
const PROJECT_NAMES: Record<string, string> = {
  'ACT-10': '10x10 Retreat', 'ACT-BB': 'Barkly Backbone', 'ACT-BG': 'BG Fit',
  'ACT-BM': 'Bimberi', 'ACT-BR': 'ACT Bali Retreat', 'ACT-BV': 'Black Cockatoo Valley',
  'ACT-CA': 'Caring for those who care', 'ACT-CB': 'Marriage Celebrant',
  'ACT-CF': 'The Confessional', 'ACT-CN': 'Contained', 'ACT-DG': 'Diagrama',
  'ACT-DL': 'DadLab', 'ACT-DO': 'Designing for Obsolescence', 'ACT-EL': 'Empathy Ledger',
  'ACT-ER': 'PICC Elders Room', 'ACT-FA': 'Festival Activations',
  'ACT-FG': 'Feel Good Project', 'ACT-FM': 'The Farm', 'ACT-FO': 'Fishers Oysters',
  'ACT-FP': 'Fairfax PLACE Tech', 'ACT-GD': 'Goods', 'ACT-GL': 'Global Laundry Alliance',
  'ACT-GP': 'Gold Phone', 'ACT-HS': 'Project Her-Self', 'ACT-HV': 'The Harvest Witta',
  'ACT-IN': 'ACT Infrastructure', 'ACT-JH': 'JusticeHub', 'ACT-JP': "June's Patch",
  'ACT-MC': 'Cars and Microcontrollers', 'ACT-MD': 'ACT Monthly Dinners',
  'ACT-MM': 'MMEIC Justice', 'ACT-MR': 'MingaMinga Rangers', 'ACT-MY': 'Mounty Yarns',
  'ACT-OO': 'Oonchiumpa', 'ACT-PI': 'PICC', 'ACT-PS': 'PICC Photo Studio',
  'ACT-RA': 'Regional Arts Fellowship', 'ACT-SM': 'SMART', 'ACT-SS': 'Storm Stories',
  'ACT-TN': 'TOMNET', 'ACT-TR': 'Treacher', 'ACT-TW': "Travelling Women's Car",
  'ACT-UA': 'Uncle Allan Palm Island Art', 'ACT-WE': 'Westpac Summit 2025',
}

const PROJECT_TRACKING_VARIANTS: Record<string, string[]> = {
  'ACT-GD': ['ACT-GD — Goods', 'Goods.', 'Goods'],
  'ACT-HV': ['ACT-HV — The Harvest Witta', 'The Harvest'],
  'ACT-BG': ['ACT-BG — BG Fit', 'BG Fit'],
  'ACT-JH': ['ACT-JH — JusticeHub', 'JusticeHub'],
  'ACT-EL': ['ACT-EL — Empathy Ledger', 'Empathy Ledger'],
  'ACT-JP': ["ACT-JP — June's Patch", "June's Patch"],
  'ACT-MY': ['ACT-MY — Mounty Yarns', 'Mounty'],
  'ACT-PI': ['ACT-PI — PICC', 'PICC Centre'],
  'ACT-PS': ['ACT-PS — PICC Photo Studio', 'PICC Photo Studio'],
  'ACT-ER': ['ACT-ER — PICC Elders Room'],
  'ACT-IN': ['ACT-IN — ACT Infrastructure', 'ACT-IN — Infrastructure'],
  'ACT-FM': ['ACT-FM — The Farm'],
  'ACT-OO': ['ACT-OO — Oonchiumpa'],
}

const CONTACT_PROJECT_MAP: Record<string, { code: string; kind: 'earned' | 'grant' }> = {
  'Palm Island Community Company Limited (PICC)': { code: 'ACT-PI', kind: 'earned' },
  'Palm Island Community Company': { code: 'ACT-PI', kind: 'earned' },
  'GREEN FOX TRAINING STUDIO LIMITED': { code: 'ACT-BG', kind: 'earned' },
  'Brodie Germaine Fitness Aboriginal Corporation': { code: 'ACT-BG', kind: 'earned' },
  'Ingkerreke Services Aboriginal Corporation': { code: 'ACT-GD', kind: 'earned' },
  'Julalikari Council Aboriginal Corporation': { code: 'ACT-OO', kind: 'earned' },
  'Red Dust Role Models Limited': { code: 'ACT-GD', kind: 'earned' },
  'SMART Recovery Australia': { code: 'ACT-SM', kind: 'earned' },
  'Our Community Shed Incorporated': { code: 'ACT-FM', kind: 'earned' },
  'Sonas Properties Pty Ltd': { code: 'ACT-HV', kind: 'earned' },
  'Just Reinvest': { code: 'ACT-MY', kind: 'earned' },
  'Berry Obsession PTY LTD': { code: 'ACT-HV', kind: 'earned' },
  'Blue Gum Station': { code: 'ACT-FM', kind: 'earned' },
  'The Snow Foundation': { code: 'ACT-IN', kind: 'grant' },
  'Centrecorp Foundation': { code: 'ACT-GD', kind: 'grant' },
  'Vincent Fairfax Family Foundation': { code: 'ACT-FP', kind: 'grant' },
  'Regional Arts Australia': { code: 'ACT-RA', kind: 'grant' },
  'Social Impact Hub Foundation': { code: 'ACT-IN', kind: 'grant' },
  'Dusseldorp Forum': { code: 'ACT-IN', kind: 'grant' },
  'Brisbane Powerhouse Foundation': { code: 'ACT-IN', kind: 'grant' },
  'Aleisha J Keating': { code: 'ACT-IN', kind: 'earned' },
}

function attributeInvoice(invoice: { contact_name: string | null; line_items: unknown }) {
  // 1. Try tracking variants first (most authoritative)
  const liText = JSON.stringify(invoice.line_items || '').toLowerCase()
  for (const [code, variants] of Object.entries(PROJECT_TRACKING_VARIANTS)) {
    for (const v of variants) {
      if (liText.includes(v.toLowerCase())) {
        return { code, kind: 'earned', source: 'tracking' as const, variant: v }
      }
    }
  }
  // 2. Contact fallback
  const name = invoice.contact_name || ''
  if (CONTACT_PROJECT_MAP[name]) {
    const m = CONTACT_PROJECT_MAP[name]
    return { code: m.code, kind: m.kind, source: 'contact' as const, variant: name }
  }
  for (const [k, v] of Object.entries(CONTACT_PROJECT_MAP)) {
    if (name.toLowerCase().includes(k.toLowerCase())) {
      return { code: v.code, kind: v.kind, source: 'contact' as const, variant: k }
    }
  }
  return { code: 'UNATTRIBUTED', kind: 'unknown', source: 'none' as const, variant: '' }
}

function rollupCode(code: string) {
  if (code === 'ACT-ER' || code === 'ACT-PS') return 'ACT-PI'
  return code
}

export async function GET() {
  // --- Fetch all ACCREC invoices from FY26 YTD ---
  const { data: invoices, error: invErr } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, date, status, total, line_items')
    .eq('type', 'ACCREC')
    .in('status', ['AUTHORISED', 'PAID'])
    .gte('date', '2025-07-01')
    .order('date', { ascending: false })
    .limit(500)

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Load user overrides
  const { data: overrides } = await supabase.from('invoice_project_overrides').select('*')
  const overrideMap = new Map<string, { project_code: string; income_kind: string | null; note: string | null; tags: string[] | null }>()
  ;(overrides || []).forEach((o) => overrideMap.set(o.xero_invoice_id, o))

  // Load project commentary
  const { data: commentary } = await supabase.from('project_commentary').select('*')
  const commentaryMap: Record<string, string> = {}
  ;(commentary || []).forEach((c) => { commentaryMap[c.project_code] = c.commentary || '' })

  const invoicesAttributed = (invoices || []).map((inv) => {
    const attr = attributeInvoice(inv)
    const override = overrideMap.get(inv.xero_id)
    if (override) {
      return {
        ...inv,
        project_code: rollupCode(override.project_code),
        leaf_code: override.project_code,
        income_kind: override.income_kind || attr.kind,
        attribution_source: 'override' as const,
        attribution_variant: override.note || '',
        override_note: override.note,
        tags: override.tags || [],
      }
    }
    return {
      ...inv,
      project_code: rollupCode(attr.code),
      leaf_code: attr.code,
      income_kind: attr.kind,
      attribution_source: attr.source,
      attribution_variant: attr.variant,
      override_note: null,
      tags: [],
    }
  })

  // --- Project spending from bank_statement_lines ---
  const { data: cardSpend } = await supabase.rpc('exec_sql', {
    query: `
      SELECT project_code,
        COUNT(*)::int AS lines,
        ROUND(SUM(ABS(amount))::numeric, 0) AS spend,
        ROUND(SUM(CASE WHEN rd_eligible THEN ABS(amount) ELSE 0 END)::numeric, 0) AS rd_spend
      FROM bank_statement_lines
      WHERE direction = 'debit' AND project_code LIKE 'ACT-%' AND date >= '2025-07-01'
      GROUP BY project_code
    `,
  })

  // --- Roll up by project code ---
  const byProject: Record<string, {
    code: string; name: string;
    spend: number; rd_spend: number;
    earned: number; grant: number; revenue: number;
    invoice_count: number;
  }> = {}

  function ensure(code: string) {
    if (!byProject[code]) {
      byProject[code] = {
        code,
        name: PROJECT_NAMES[code] || code,
        spend: 0, rd_spend: 0, earned: 0, grant: 0, revenue: 0, invoice_count: 0,
      }
    }
    return byProject[code]
  }

  for (const row of cardSpend || []) {
    const p = ensure(rollupCode(row.project_code))
    p.spend += Number(row.spend) || 0
    p.rd_spend += Number(row.rd_spend) || 0
  }

  for (const inv of invoicesAttributed) {
    if (inv.project_code === 'UNATTRIBUTED') continue
    // Exclude kind='other' from revenue aggregates (non-ACT / personal / excluded)
    if (inv.income_kind === 'other') continue
    const p = ensure(inv.project_code)
    const v = Number(inv.total) || 0
    p.revenue += v
    if (inv.income_kind === 'grant') p.grant += v
    else if (inv.income_kind === 'earned') p.earned += v
    p.invoice_count += 1
  }

  const projects = Object.values(byProject).sort((a, b) => (b.spend + b.revenue) - (a.spend + a.revenue))

  // Totals
  const totals = projects.reduce((t, p) => ({
    spend: t.spend + p.spend,
    rd_spend: t.rd_spend + p.rd_spend,
    earned: t.earned + p.earned,
    grant: t.grant + p.grant,
    revenue: t.revenue + p.revenue,
  }), { spend: 0, rd_spend: 0, earned: 0, grant: 0, revenue: 0 })

  // Unattributed invoices (for the review list)
  const unattributed = invoicesAttributed.filter((i) => i.project_code === 'UNATTRIBUTED')

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    totals,
    projects,
    invoices: invoicesAttributed,
    commentary: commentaryMap,
    unattributed_count: unattributed.length,
    unattributed_total: unattributed.reduce((s, i) => s + (Number(i.total) || 0), 0),
  })
}

// PATCH: save invoice override OR project commentary
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    if (body.type === 'invoice_override') {
      const { xero_invoice_id, project_code, income_kind, note, tags } = body
      if (!xero_invoice_id || !project_code) {
        return NextResponse.json({ error: 'xero_invoice_id + project_code required' }, { status: 400 })
      }
      const { error } = await supabase.from('invoice_project_overrides').upsert({
        xero_invoice_id, project_code, income_kind: income_kind || null,
        note: note || null,
        tags: Array.isArray(tags) ? tags : [],
        updated_at: new Date().toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (body.type === 'commentary') {
      const { project_code, commentary } = body
      if (!project_code) return NextResponse.json({ error: 'project_code required' }, { status: 400 })
      const { error } = await supabase.from('project_commentary').upsert({
        project_code, commentary: commentary || '', updated_at: new Date().toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    if (body.type === 'clear_override') {
      const { xero_invoice_id } = body
      if (!xero_invoice_id) return NextResponse.json({ error: 'xero_invoice_id required' }, { status: 400 })
      const { error } = await supabase.from('invoice_project_overrides').delete().eq('xero_invoice_id', xero_invoice_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
