import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const FY_START = '2025-07-01'
const SNAPSHOT_DATE = '2026-05-01'
const SNAPSHOT_TO = '2026-04-30'

const REPORT_PATH = 'thoughts/shared/reports/act-money-alignment-2026-05-01.md'
const PROVENANCE_PATH = 'thoughts/shared/reports/act-money-alignment-2026-05-01.md.provenance.md'
const NOTION_HQ_URL = 'https://app.notion.com/p/298eb5c6335a4be6a6f428c1626a81f8'
const NOTION_GATE_URL = 'https://app.notion.com/p/99cac124177640e3943e353acbc7e4f7'

type CoverageRow = {
  source: string
  total: number
  tagged: number
  untagged: number
  coverage_pct: number
  min_date: string | null
  max_date: string | null
}

type RuleRow = {
  source: string
  total: number
  auto_apply: number | null
  project_codes: number
  rd_eligible: number | null
}

type FreshnessRow = {
  source: string
  latest_synced_at: string | null
  latest_updated_at: string | null
  latest_xero_date: string | null
  status: 'current' | 'usable' | 'stale'
  note: string
}

type ReviewQueueRow = {
  type: 'transaction' | 'invoice'
  contact_name: string
  item_count: number
  abs_total: number
  amount_due: number | null
  first_date: string | null
  last_date: string | null
}

type AllocationRow = {
  code: string
  name: string
  revenue: number
  expenses: number
  net: number
  lines: number
  gateStatus: 'fund-with-controls' | 'advice-needed' | 'pause' | 'clean-up'
  workspace: 'Goods' | 'Infrastructure' | 'Place' | 'Justice' | 'Platform' | 'Indigenous' | 'Studio' | 'Community' | 'Other'
  decision: string
}

const allocationSnapshot: AllocationRow[] = [
  {
    code: 'ACT-GD',
    name: 'Goods',
    revenue: 1028977.8,
    expenses: 374642.57,
    net: 654335.23,
    lines: 405,
    gateStatus: 'fund-with-controls',
    workspace: 'Goods',
    decision: 'Strongest enterprise engine. Fund growth only with margin, receivables, delivery, product liability and source-doc controls.',
  },
  {
    code: 'ACT-IN',
    name: 'Infrastructure / R&D',
    revenue: 0,
    expenses: 490611.61,
    net: -490611.61,
    lines: 1175,
    gateStatus: 'clean-up',
    workspace: 'Infrastructure',
    decision: 'Largest spend pool. Needs evidence ledger, R&D link and overhead/recharge policy so shared infrastructure is explainable.',
  },
  {
    code: 'ACT-CE',
    name: 'Capital / Enterprise',
    revenue: 3786.2,
    expenses: 151867.5,
    net: -148081.3,
    lines: 7,
    gateStatus: 'advice-needed',
    workspace: 'Other',
    decision: 'High-value negative allocation. Needs source-doc review before being treated as ordinary project spend.',
  },
  {
    code: 'ACT-FM',
    name: 'Farm',
    revenue: 24892.5,
    expenses: 130861.29,
    net: -105968.79,
    lines: 153,
    gateStatus: 'pause',
    workspace: 'Place',
    decision: 'Highest-risk place spend. Pause discretionary spend until lease, insurance, revenue bridge, break-even and stop-loss are explicit.',
  },
  {
    code: 'ACT-ER',
    name: 'PICC Elders Room',
    revenue: 70000,
    expenses: 0,
    net: 70000,
    lines: 4,
    gateStatus: 'fund-with-controls',
    workspace: 'Indigenous',
    decision: 'Archived funded PICC stream. Keep acquittal, cultural protocol and source evidence tied back to ACT-PI.',
  },
  {
    code: 'ACT-SM',
    name: 'SMART',
    revenue: 54218,
    expenses: 0,
    net: 54218,
    lines: 7,
    gateStatus: 'fund-with-controls',
    workspace: 'Community',
    decision: 'Positive satellite signal. Confirm contract/deliverable evidence and keep SMART variants under the umbrella code.',
  },
  {
    code: 'ACT-BG',
    name: 'BG Fit',
    revenue: 41000,
    expenses: 1079.64,
    net: 39920.36,
    lines: 36,
    gateStatus: 'fund-with-controls',
    workspace: 'Community',
    decision: 'Positive project signal. Keep partner obligations, delivery evidence and future margin separated from general ACT overhead.',
  },
  {
    code: 'ACT-HV',
    name: 'Harvest',
    revenue: 137900,
    expenses: 170615.9,
    net: -32715.9,
    lines: 186,
    gateStatus: 'advice-needed',
    workspace: 'Place',
    decision: 'Manageable launch loss only if lease, insurance, food/event/workshop model and dated break-even path are confirmed.',
  },
  {
    code: 'ACT-JH',
    name: 'JusticeHub',
    revenue: 36050,
    expenses: 798.95,
    net: 35251.05,
    lines: 22,
    gateStatus: 'fund-with-controls',
    workspace: 'Justice',
    decision: 'Positive management signal. Fund only against live contract/pitch milestones and clean Pty/charity/partner boundaries.',
  },
  {
    code: 'ACT-EL',
    name: 'Empathy Ledger',
    revenue: 32790,
    expenses: 1169.27,
    net: 31620.73,
    lines: 17,
    gateStatus: 'fund-with-controls',
    workspace: 'Platform',
    decision: 'Positive revenue and R&D proof signal. Needs evidence bundle, cyber/PI posture and product pathway.',
  },
  {
    code: 'ACT-CP',
    name: 'Community Capital',
    revenue: 24300,
    expenses: 11357.54,
    net: 12942.46,
    lines: 11,
    gateStatus: 'fund-with-controls',
    workspace: 'Community',
    decision: 'Positive prototype stream. Keep the caravan/community-capital evidence pack linked to revenue and delivery obligations.',
  },
  {
    code: 'ACT-MD',
    name: 'ACT Monthly Dinners',
    revenue: 0,
    expenses: 11727.1,
    net: -11727.1,
    lines: 7,
    gateStatus: 'advice-needed',
    workspace: 'Community',
    decision: 'Relationship-building spend needs a clear business purpose, host list and follow-on opportunity evidence.',
  },
  {
    code: 'UNASSIGNED',
    name: 'Unassigned Review Pool',
    revenue: 0,
    expenses: 10660.35,
    net: -10660.35,
    lines: 138,
    gateStatus: 'clean-up',
    workspace: 'Other',
    decision: 'Clean this before using the P&L for tax, R&D or project decisions. This is the first review queue.',
  },
  {
    code: 'ACT-DO',
    name: 'Designing for Obsolescence',
    revenue: 0,
    expenses: 10492.92,
    net: -10492.92,
    lines: 64,
    gateStatus: 'clean-up',
    workspace: 'Platform',
    decision: 'Sunsetting/legacy spend. Decide what is R&D evidence, reusable IP, or closed project cost.',
  },
  {
    code: 'ACT-CF',
    name: 'The Confessional',
    revenue: 6500,
    expenses: 0,
    net: 6500,
    lines: 1,
    gateStatus: 'fund-with-controls',
    workspace: 'Studio',
    decision: 'Small positive studio signal. Keep revenue evidence and project scope clean.',
  },
  {
    code: 'ACT-UA',
    name: 'Uncle Allan Palm Island Art',
    revenue: 0,
    expenses: 5886.21,
    net: -5886.21,
    lines: 56,
    gateStatus: 'advice-needed',
    workspace: 'Indigenous',
    decision: 'Cultural/studio spend needs source evidence, consent/cultural protocol notes and project outcome linkage.',
  },
  {
    code: 'ACT-PS',
    name: 'PICC Photo Studio',
    revenue: 0,
    expenses: 5823.43,
    net: -5823.43,
    lines: 8,
    gateStatus: 'advice-needed',
    workspace: 'Indigenous',
    decision: 'Treat as PICC storytelling infrastructure. Link equipment and travel to ACT-PI evidence.',
  },
  {
    code: 'ACT-MY',
    name: 'Mounty Yarns',
    revenue: 15000,
    expenses: 20740.12,
    net: -5740.12,
    lines: 19,
    gateStatus: 'advice-needed',
    workspace: 'Studio',
    decision: 'Manageable studio loss. Confirm delivery, rights, partner obligations and next revenue pathway.',
  },
  {
    code: 'ACT-PI',
    name: 'PICC',
    revenue: 0,
    expenses: 5676.46,
    net: -5676.46,
    lines: 18,
    gateStatus: 'advice-needed',
    workspace: 'Indigenous',
    decision: 'Parent PICC spend. Keep parent/project/sub-project coding consistent across ACT-PI, ACT-ER, ACT-PS and ACT-UA.',
  },
  {
    code: 'ACT-GP',
    name: 'Gold Phone',
    revenue: 5338.64,
    expenses: 180,
    net: 5158.64,
    lines: 8,
    gateStatus: 'fund-with-controls',
    workspace: 'Studio',
    decision: 'Positive studio signal. Confirm whether it is product, campaign, or reusable storytelling infrastructure.',
  },
  {
    code: 'ACT-CA',
    name: 'Caring for Those Who Care',
    revenue: 0,
    expenses: 2749.48,
    net: -2749.48,
    lines: 13,
    gateStatus: 'clean-up',
    workspace: 'Community',
    decision: 'Small spend pool. Backfill source docs and decide whether to continue, fold into another stream, or close.',
  },
  {
    code: 'ACT-CORE',
    name: 'Core overhead / IP',
    revenue: 2967.48,
    expenses: 5104.86,
    net: -2137.38,
    lines: 363,
    gateStatus: 'clean-up',
    workspace: 'Infrastructure',
    decision: 'Small direct loss but many lines. Needs clean ACT-CORE tracking option and policy for ACT-CORE vs ACT-IN.',
  },
  {
    code: 'ACT-10',
    name: '10x10 Retreat',
    revenue: 0,
    expenses: 1870.38,
    net: -1870.38,
    lines: 28,
    gateStatus: 'clean-up',
    workspace: 'Community',
    decision: 'Archived/small retreat spend. Keep only if it has clear evidence value or close the code.',
  },
  {
    code: 'ACT-BB',
    name: 'Barkly Backbone',
    revenue: 0,
    expenses: 615.99,
    net: -615.99,
    lines: 3,
    gateStatus: 'clean-up',
    workspace: 'Indigenous',
    decision: 'Tiny ideation spend. Keep source evidence and avoid expanding without a live opportunity gate.',
  },
  {
    code: 'ACT-BV',
    name: 'Black Cockatoo Valley',
    revenue: 0,
    expenses: 525,
    net: -525,
    lines: 1,
    gateStatus: 'clean-up',
    workspace: 'Place',
    decision: 'Clarify boundary with ACT-FM so farm/place costs do not split unpredictably.',
  },
  {
    code: 'ACT-OO',
    name: 'Oonchiumpa',
    revenue: 0,
    expenses: 519.3,
    net: -519.3,
    lines: 3,
    gateStatus: 'advice-needed',
    workspace: 'Indigenous',
    decision: 'Keep as its own partner stream with clear R&D/travel/partner evidence before expanding spend.',
  },
  {
    code: 'ACT-JP',
    name: "June's Patch",
    revenue: 0,
    expenses: 368.13,
    net: -368.13,
    lines: 4,
    gateStatus: 'clean-up',
    workspace: 'Place',
    decision: 'Small regenerative/place spend. Link to outcome evidence or close.',
  },
  {
    code: 'ACT-CB',
    name: 'Marriage Celebrant',
    revenue: 0,
    expenses: 265.06,
    net: -265.06,
    lines: 4,
    gateStatus: 'clean-up',
    workspace: 'Community',
    decision: 'Small community-service spend. Confirm business purpose before carrying forward.',
  },
  {
    code: 'ACT-RA',
    name: 'Regional Arts Fellowship',
    revenue: 0,
    expenses: 95.66,
    net: -95.66,
    lines: 1,
    gateStatus: 'clean-up',
    workspace: 'Studio',
    decision: 'Tiny studio spend. Keep source doc; no strategic decision needed unless activity resumes.',
  },
  {
    code: 'ACT-FG',
    name: 'Feel Good Project',
    revenue: 0,
    expenses: 70.5,
    net: -70.5,
    lines: 1,
    gateStatus: 'clean-up',
    workspace: 'Community',
    decision: 'Tiny active-project spend. Link to partner/outcome evidence as the project record matures.',
  },
]

async function runSql<T>(query: string): Promise<T[]> {
  const primary = await supabase.rpc('exec_sql', { query })
  if (!primary.error) return (primary.data || []) as T[]

  const fallback = await supabase.rpc('exec_sql', { sql: query })
  if (!fallback.error) return (fallback.data || []) as T[]

  throw new Error(primary.error.message || fallback.error.message || 'exec_sql failed')
}

function asNumber(value: unknown) {
  return Number(value || 0)
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function classifyFreshness(row: Omit<FreshnessRow, 'status' | 'note'>): FreshnessRow {
  if (row.source === 'xero_transactions') {
    return {
      ...row,
      status: 'current',
      note: 'Current enough for coverage and review queue.',
    }
  }

  if (row.source === 'xero_invoices') {
    return {
      ...row,
      status: 'usable',
      note: 'Usable for invoice coverage; refresh before accountant-ready packs.',
    }
  }

  if (row.source === 'xero_bank_transactions') {
    return {
      ...row,
      status: 'stale',
      note: 'Not current enough for live decisions. Use live Xero or xero_transactions instead.',
    }
  }

  return {
    ...row,
    status: 'stale',
    note: 'Stops at March 2026. Refresh after tagging cleanup.',
  }
}

export async function GET() {
  try {
    const [coverage, rules, freshnessRaw, projectCache, topTransactions, topInvoices] = await Promise.all([
      runSql<CoverageRow>(`
        WITH tx AS (
          SELECT *, NULLIF(TRIM(project_code), '') AS pc FROM public.xero_transactions
        ), inv AS (
          SELECT *, NULLIF(TRIM(project_code), '') AS pc FROM public.xero_invoices
        )
        SELECT 'xero_transactions_all' AS source,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE pc IS NOT NULL)::int AS tagged,
          COUNT(*) FILTER (WHERE pc IS NULL)::int AS untagged,
          ROUND((100.0 * COUNT(*) FILTER (WHERE pc IS NOT NULL) / NULLIF(COUNT(*), 0))::numeric, 1)::float AS coverage_pct,
          MIN(date)::text AS min_date,
          MAX(date)::text AS max_date
        FROM tx
        UNION ALL
        SELECT 'xero_transactions_fy26_ytd',
          COUNT(*)::int,
          COUNT(*) FILTER (WHERE pc IS NOT NULL)::int,
          COUNT(*) FILTER (WHERE pc IS NULL)::int,
          ROUND((100.0 * COUNT(*) FILTER (WHERE pc IS NOT NULL) / NULLIF(COUNT(*), 0))::numeric, 1)::float,
          MIN(date)::text,
          MAX(date)::text
        FROM tx WHERE date BETWEEN DATE '${FY_START}' AND DATE '${SNAPSHOT_TO}'
        UNION ALL
        SELECT 'xero_invoices_all',
          COUNT(*)::int,
          COUNT(*) FILTER (WHERE pc IS NOT NULL)::int,
          COUNT(*) FILTER (WHERE pc IS NULL)::int,
          ROUND((100.0 * COUNT(*) FILTER (WHERE pc IS NOT NULL) / NULLIF(COUNT(*), 0))::numeric, 1)::float,
          MIN(date)::text,
          MAX(date)::text
        FROM inv
        UNION ALL
        SELECT 'xero_invoices_fy26_ytd',
          COUNT(*)::int,
          COUNT(*) FILTER (WHERE pc IS NOT NULL)::int,
          COUNT(*) FILTER (WHERE pc IS NULL)::int,
          ROUND((100.0 * COUNT(*) FILTER (WHERE pc IS NOT NULL) / NULLIF(COUNT(*), 0))::numeric, 1)::float,
          MIN(date)::text,
          MAX(date)::text
        FROM inv WHERE date BETWEEN DATE '${FY_START}' AND DATE '${SNAPSHOT_TO}'
      `),

      runSql<RuleRow>(`
        SELECT 'vendor_project_rules' AS source,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE COALESCE(auto_apply, false))::int AS auto_apply,
          COUNT(DISTINCT project_code)::int AS project_codes,
          COUNT(*) FILTER (WHERE rd_eligible IS TRUE)::int AS rd_eligible
        FROM public.vendor_project_rules
        UNION ALL
        SELECT 'invoice_project_overrides',
          COUNT(*)::int,
          NULL::int,
          COUNT(DISTINCT project_code)::int,
          NULL::int
        FROM public.invoice_project_overrides
        UNION ALL
        SELECT 'location_project_rules',
          COUNT(*)::int,
          NULL::int,
          COUNT(DISTINCT project_code)::int,
          NULL::int
        FROM public.location_project_rules
      `),

      runSql<Omit<FreshnessRow, 'status' | 'note'>>(`
        SELECT 'xero_transactions' AS source,
          MAX(synced_at)::text AS latest_synced_at,
          MAX(updated_at)::text AS latest_updated_at,
          MAX(date)::text AS latest_xero_date
        FROM public.xero_transactions
        UNION ALL
        SELECT 'xero_invoices',
          MAX(synced_at)::text,
          MAX(updated_at)::text,
          MAX(date)::text
        FROM public.xero_invoices
        UNION ALL
        SELECT 'xero_bank_transactions',
          MAX(synced_at)::text,
          MAX(updated_at)::text,
          MAX(date)::text
        FROM public.xero_bank_transactions
      `),

      runSql<{
        rows: number
        min_month: string | null
        max_month: string | null
        latest_updated_at: string | null
        revenue: number
        expenses: number
        net: number
        transaction_count: number
        unmapped_count: number
      }>(`
        SELECT
          COUNT(*)::int AS rows,
          MIN(month)::text AS min_month,
          MAX(month)::text AS max_month,
          MAX(updated_at)::text AS latest_updated_at,
          ROUND(COALESCE(SUM(revenue), 0)::numeric, 2)::float AS revenue,
          ROUND(COALESCE(SUM(expenses), 0)::numeric, 2)::float AS expenses,
          ROUND(COALESCE(SUM(net), 0)::numeric, 2)::float AS net,
          SUM(COALESCE(transaction_count, 0))::int AS transaction_count,
          SUM(COALESCE(unmapped_count, 0))::int AS unmapped_count
        FROM public.project_monthly_financials
        WHERE month BETWEEN DATE '${FY_START}' AND DATE '${SNAPSHOT_TO}'
      `),

      runSql<ReviewQueueRow>(`
        SELECT
          'transaction'::text AS type,
          COALESCE(NULLIF(TRIM(contact_name), ''), '(blank)') AS contact_name,
          COUNT(*)::int AS item_count,
          ROUND(SUM(ABS(COALESCE(total, 0)))::numeric, 2)::float AS abs_total,
          NULL::float AS amount_due,
          MIN(date)::text AS first_date,
          MAX(date)::text AS last_date
        FROM public.xero_transactions
        WHERE date BETWEEN DATE '${FY_START}' AND DATE '${SNAPSHOT_TO}'
          AND NULLIF(TRIM(project_code), '') IS NULL
        GROUP BY 1, 2
        ORDER BY abs_total DESC
        LIMIT 12
      `),

      runSql<ReviewQueueRow>(`
        SELECT
          'invoice'::text AS type,
          COALESCE(NULLIF(TRIM(contact_name), ''), '(blank)') AS contact_name,
          COUNT(*)::int AS item_count,
          ROUND(SUM(ABS(COALESCE(total, 0)))::numeric, 2)::float AS abs_total,
          ROUND(SUM(COALESCE(amount_due, 0))::numeric, 2)::float AS amount_due,
          MIN(date)::text AS first_date,
          MAX(date)::text AS last_date
        FROM public.xero_invoices
        WHERE date BETWEEN DATE '${FY_START}' AND DATE '${SNAPSHOT_TO}'
          AND NULLIF(TRIM(project_code), '') IS NULL
        GROUP BY 1, 2
        ORDER BY abs_total DESC
        LIMIT 12
      `),
    ])

    const allocationTotals = allocationSnapshot.reduce(
      (acc, row) => ({
        revenue: acc.revenue + row.revenue,
        expenses: acc.expenses + row.expenses,
        net: acc.net + row.net,
        lines: acc.lines + row.lines,
      }),
      { revenue: 0, expenses: 0, net: 0, lines: 0 }
    )
    const roundedAllocationTotals = {
      revenue: roundMoney(allocationTotals.revenue),
      expenses: roundMoney(allocationTotals.expenses),
      net: roundMoney(allocationTotals.net),
      lines: allocationTotals.lines,
    }

    const freshness = [
      ...freshnessRaw.map(classifyFreshness),
      {
        source: 'project_monthly_financials',
        latest_synced_at: null,
        latest_updated_at: projectCache[0]?.latest_updated_at || null,
        latest_xero_date: projectCache[0]?.max_month || null,
        status: 'stale' as const,
        note: 'Cached monthly P&L stops before the current Xero snapshot.',
      },
    ]

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      period: { fy: 'FY26', start: FY_START, snapshotDate: SNAPSHOT_DATE, snapshotTo: SNAPSHOT_TO },
      sources: {
        reportPath: REPORT_PATH,
        provenancePath: PROVENANCE_PATH,
        notionHqUrl: NOTION_HQ_URL,
        notionGateUrl: NOTION_GATE_URL,
      },
      workspaceModel: [
        { name: 'Xero', role: 'Accounting ledger', owns: 'Invoices, bills, bank feeds, GST/BAS, receivables and payables.' },
        { name: 'Supabase', role: 'Automation layer', owns: 'Tagging coverage, vendor rules, invoice overrides, review queues and cached mirrors.' },
        { name: 'Command Center', role: 'Live operating dashboard', owns: 'This cockpit: source freshness, project allocations, gates and review queues.' },
        { name: 'Notion', role: 'Decision cockpit', owns: 'Gates, actions, owners, dates, secure pointers and adviser question packs.' },
        { name: 'Wiki', role: 'Strategy memory', owns: 'R&D framing, project meaning, long-term thesis and source-of-meaning synthesis.' },
        { name: 'Drive / LastPass', role: 'Secure evidence', owns: 'Documents in Drive; passwords and secrets in LastPass only.' },
      ],
      allocation: {
        rows: allocationSnapshot,
        totals: roundedAllocationTotals,
        source: 'Full live Xero management allocation snapshot from 2026-05-01 report across all project-code rows; not accountant-ready final truth.',
      },
      coverage: coverage.map(row => ({
        ...row,
        total: asNumber(row.total),
        tagged: asNumber(row.tagged),
        untagged: asNumber(row.untagged),
        coverage_pct: asNumber(row.coverage_pct),
      })),
      rules: rules.map(row => ({
        ...row,
        total: asNumber(row.total),
        auto_apply: row.auto_apply == null ? null : asNumber(row.auto_apply),
        project_codes: asNumber(row.project_codes),
        rd_eligible: row.rd_eligible == null ? null : asNumber(row.rd_eligible),
      })),
      freshness,
      projectMonthlyCache: projectCache[0] || null,
      reviewQueue: {
        topTransactions: topTransactions.map(row => ({ ...row, abs_total: asNumber(row.abs_total), item_count: asNumber(row.item_count) })),
        topInvoices: topInvoices.map(row => ({
          ...row,
          abs_total: asNumber(row.abs_total),
          amount_due: row.amount_due == null ? null : asNumber(row.amount_due),
          item_count: asNumber(row.item_count),
        })),
      },
      nextActions: [
        'Review the 69 FY26 untagged transactions and 175 FY26 untagged invoices, starting with high-value groups.',
        'Do not apply tagger writes until high-value lines are checked and Ben approves.',
        'Fix Xero Project Tracking on revenue lines, not only expense lines.',
        'Define ACT-CORE vs ACT-IN overhead policy.',
        'Refresh project_monthly_financials after tagging cleanup.',
        'Take the report and provenance packet to Standard Ledger before using numbers for tax, R&D or distributions.',
      ],
      verification: {
        verified: [
          'Supabase coverage and freshness are queried live from the ACT shared database when this API runs.',
          'The allocation table is the 1 May 2026 live Xero management snapshot captured in the report.',
          'This endpoint is read-only.',
        ],
        unverified: [
          'Accountant-ready P&L.',
          'GST treatment by line.',
          'Insurance, leases, contracts and signed source documents.',
          'Standard Ledger approval.',
          'Any write-back to Xero or Supabase.',
        ],
      },
    })
  } catch (error) {
    console.error('Money alignment API error:', error)
    return NextResponse.json({ error: 'Failed to load money alignment dashboard' }, { status: 500 })
  }
}
