import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Four-lane funding board — one read-only aggregation across every funding surface.
// GRANTS · PHILANTHROPY · CORPORATE/PROCUREMENT · BUYERS, plus a Rung-0 receivables strip
// (dollars already earned, not pipeline). All queries are read-only, sequential (never
// Promise.all — the shared pooler was exhausted by parallel probes on 2026-06-06), and
// explicitly .limit()-capped (supabase-js silently caps at 1000 even with .range()).
//
// Schema verified live 2026-06-07 against tednluwflfhxyucgwigh:
//   ghl_opportunities(name, monetary_value, pipeline_name, stage_name, status, ghl_id, last_stage_change_at)
//   foundation_relationship_signals(signal_type, strength, foundation_id, foundation_name, metadata)
//   foundations(name, website, total_giving_annual, avg_grant_size, grant_range_min/max)
//   v_act_procurement_buyers(buyer_name, total_relevant_spend, contracts_last_year, avg_topic_score, contract_count)
//   supporter_comms_summary(domain, last_touch_at, last_touch_subject, last_touch_direction, total_365d)
//   xero_invoices(type, status, invoice_number, contact_name, total, amount_due, date, due_date, xero_id)

const GHL_LOCATION_ID = process.env.NEXT_PUBLIC_GHL_LOCATION_ID || ''

/** GHL opportunity deep-link — falls back to the pipeline opportunities list (no reliable per-opp route). */
function ghlOpportunityUrl(): string | null {
  if (!GHL_LOCATION_ID) return null
  return `https://app.gohighlevel.com/v2/location/${GHL_LOCATION_ID}/opportunities/list`
}

/** Normalise a website to a bare host (strip scheme + www + path) so it can match comms-summary domains. */
function hostFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null
  const m = website
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
  return m || null
}

function daysSince(ts: string | null | undefined): number | null {
  if (!ts) return null
  const d = new Date(ts).getTime()
  if (Number.isNaN(d)) return null
  return Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24))
}

type Warmth = {
  lastTouchDays: number | null
  lastTouchSubject: string | null
  lastTouchDirection: string | null
  total365d: number | null
}

type Card = {
  id: string
  title: string
  value: number | null
  stage: string | null
  sub: string | null            // lane-specific secondary line
  badge: string | null          // honest status label
  link: string | null
  warmthRank: number            // higher = warmer = sorts first within lane
  warmth: Warmth | null
}

// ---- GRANTS stage ordering (warm → cold) -----------------------------------
const GRANT_STAGE_RANK: Record<string, number> = {
  'Grant Submitted': 40,
  'Application In Progress': 30,
  'Grant Declined': 10,
}

// ---- BUYER stage ordering — Invoiced/Proposed/Outreach Queued first (per spec) ----
const BUYER_STAGE_RANK: Record<string, number> = {
  Invoiced: 60,
  Proposed: 50,
  'Outreach Queued': 40,
  'In Conversation': 35,
  Qualified: 30,
  Cultivating: 28,
  'Ask made': 26,
  Renewing: 24,
  Delivering: 22,
  'Stewarding / Reporting': 20,
  Identified: 10,
}

export async function GET() {
  try {
    // Pull every GHL opportunity once (paginated, mirror only) — reused by GRANTS + BUYERS lanes.
    let opps: any[] = []
    {
      let from = 0
      for (;;) {
        const { data, error } = await supabase
          .from('ghl_opportunities')
          .select('ghl_id,name,monetary_value,pipeline_name,stage_name,status,last_stage_change_at')
          .order('ghl_id', { ascending: true })
          .range(from, from + 999)
          .limit(1000)
        if (error) throw error
        opps = opps.concat(data || [])
        if (!data || data.length < 1000) break
        from += 1000
      }
    }

    // === LANE 1: GRANTS ===
    // Pipeline 'Grants', EXCLUDING the 'Grant Opportunity Identified' discovery noise (259 rows).
    const grantCards: Card[] = (opps || [])
      .filter(
        o =>
          /grant/i.test(o.pipeline_name || '') &&
          (o.stage_name || '') !== 'Grant Opportunity Identified'
      )
      .map(o => {
        const stage = o.stage_name || '—'
        const rank = GRANT_STAGE_RANK[stage] ?? 5
        const moved = daysSince(o.last_stage_change_at)
        return {
          id: `grant-${o.ghl_id}`,
          title: o.name || 'Untitled grant',
          value: o.monetary_value != null ? Number(o.monetary_value) : null,
          stage,
          sub: moved != null ? `moved ${moved}d ago` : null,
          badge: o.status === 'lost' ? 'declined' : null,
          link: ghlOpportunityUrl(),
          warmthRank: rank * 1000 + Number(o.monetary_value || 0) / 1e6,
          warmth: null,
        }
      })
      .sort((a, b) => b.warmthRank - a.warmthRank)

    // === LANE 4: BUYERS ===
    // Goods buyer + supporter pipelines, OPEN/WON status, by stage (Invoiced/Proposed/Outreach first).
    const buyerCards: Card[] = (opps || [])
      .filter(o => {
        const p = o.pipeline_name || ''
        const isBuyer = /^goods.*buyer/i.test(p) || p === 'Goods Supporter Journey'
        const open = (o.status || '') !== 'lost' && (o.status || '') !== 'abandoned'
        return isBuyer && open
      })
      .map(o => {
        const stage = o.stage_name || '—'
        const rank = BUYER_STAGE_RANK[stage] ?? 5
        return {
          id: `buyer-${o.ghl_id}`,
          title: o.name || 'Untitled',
          value: o.monetary_value != null ? Number(o.monetary_value) : null,
          stage,
          sub: /supporter/i.test(o.pipeline_name || '') ? 'Supporter journey' : 'Buyer pipeline',
          badge: o.status === 'won' ? 'won' : null,
          link: ghlOpportunityUrl(),
          warmthRank: rank * 1000 + Number(o.monetary_value || 0) / 1e6,
          warmth: null,
        }
      })
      .sort((a, b) => b.warmthRank - a.warmthRank)

    // === LANE 2: PHILANTHROPY ===
    // foundation_relationship_signals (act_funded 100 / act_pipeline 10 / act_email_contact),
    // joined to foundations for giving capacity. Funded-already first (renewal moves), then pipeline.
    const { data: signals, error: sigErr } = await supabase
      .from('foundation_relationship_signals')
      .select('signal_type,strength,foundation_id,foundation_name,metadata')
      .in('signal_type', ['act_funded', 'act_pipeline', 'act_email_contact'])
      .limit(1000)
    if (sigErr) throw sigErr

    const { data: foundations, error: fErr } = await supabase
      .from('foundations')
      .select('id,name,website,total_giving_annual,avg_grant_size,grant_range_min,grant_range_max')
      .limit(1000)
    if (fErr) throw fErr
    const foundationById = new Map<string, any>()
    for (const f of foundations || []) foundationById.set(f.id, f)

    // Collapse to one card per foundation: keep the strongest signal, max total_paid.
    const SIGNAL_RANK: Record<string, number> = { act_funded: 100, act_pipeline: 10, act_email_contact: 1 }
    const philByFoundation = new Map<
      string,
      { name: string; foundationId: string | null; signalType: string; rank: number; totalPaid: number }
    >()
    for (const s of signals || []) {
      const key = s.foundation_id || `name:${(s.foundation_name || '').toLowerCase()}`
      const rank = SIGNAL_RANK[s.signal_type] ?? 0
      const paid = Number(s.metadata?.total_paid || 0)
      const existing = philByFoundation.get(key)
      if (!existing) {
        philByFoundation.set(key, {
          name: s.foundation_name || 'Unknown foundation',
          foundationId: s.foundation_id || null,
          signalType: s.signal_type,
          rank,
          totalPaid: paid,
        })
      } else {
        if (rank > existing.rank) {
          existing.rank = rank
          existing.signalType = s.signal_type
        }
        existing.totalPaid = Math.max(existing.totalPaid, paid)
      }
    }

    // === CROSS-LANE WARMTH: supporter_comms_summary keyed by domain ===
    const { data: comms, error: commsErr } = await supabase
      .from('supporter_comms_summary')
      .select('domain,last_touch_at,last_touch_subject,last_touch_direction,total_365d')
      .limit(1000)
    if (commsErr) throw commsErr
    const commsByDomain = new Map<string, any>()
    for (const c of comms || []) if (c.domain) commsByDomain.set(c.domain.toLowerCase(), c)

    function warmthFor(website: string | null | undefined): Warmth | null {
      const host = hostFromWebsite(website)
      if (!host) return null
      const c = commsByDomain.get(host)
      if (!c) return null
      return {
        lastTouchDays: daysSince(c.last_touch_at),
        lastTouchSubject: c.last_touch_subject ?? null,
        lastTouchDirection: c.last_touch_direction ?? null,
        total365d: c.total_365d ?? null,
      }
    }

    const philanthropyCards: Card[] = [...philByFoundation.values()]
      .map(p => {
        const f = p.foundationId ? foundationById.get(p.foundationId) : null
        const warmth = warmthFor(f?.website)
        const capacity =
          f?.avg_grant_size != null
            ? `avg grant ${Math.round(Number(f.avg_grant_size)).toLocaleString()}`
            : f?.total_giving_annual != null
            ? `gives ~$${Math.round(Number(f.total_giving_annual)).toLocaleString()}/yr`
            : f?.grant_range_max != null
            ? `up to $${Math.round(Number(f.grant_range_max)).toLocaleString()}`
            : null
        const funded = p.signalType === 'act_funded'
        // Warmer = funded-already (renewal) > pipeline; within, recency of last touch then $ given.
        const recencyBoost = warmth?.lastTouchDays != null ? Math.max(0, 365 - warmth.lastTouchDays) : 0
        return {
          id: `phil-${p.foundationId || p.name}`,
          title: p.name,
          value: p.totalPaid > 0 ? Math.round(p.totalPaid) : null,
          stage: funded ? 'Funded — renewal' : p.signalType === 'act_pipeline' ? 'Pipeline' : 'Email contact',
          sub: capacity,
          badge: funded ? 'funded before' : 'prospect',
          link: f?.website
            ? f.website.startsWith('http')
              ? f.website
              : `https://${f.website}`
            : null,
          warmthRank: p.rank * 1_000_000 + recencyBoost * 100 + p.totalPaid / 1e6,
          warmth,
        }
      })
      .sort((a, b) => b.warmthRank - a.warmthRank)

    // === LANE 3: CORPORATE / PROCUREMENT ===
    // v_act_procurement_buyers re-sorted for FIT not size: avg_topic_score >= 1.5 AND contracts_last_year > 0.
    // Honest label: these are prospects — ACT has no current contract with them.
    const { data: buyers, error: bErr } = await supabase
      .from('v_act_procurement_buyers')
      .select('buyer_name,total_relevant_spend,contracts_last_year,avg_topic_score,contract_count')
      .gte('avg_topic_score', 1.5)
      .gt('contracts_last_year', 0)
      .order('avg_topic_score', { ascending: false })
      .limit(1000)
    if (bErr) throw bErr

    const procurementCards: Card[] = (buyers || [])
      .map(b => ({
        id: `proc-${b.buyer_name}`,
        title: b.buyer_name,
        value: b.total_relevant_spend != null ? Number(b.total_relevant_spend) : null,
        stage: 'Prospect',
        sub: `${b.contracts_last_year} contract${Number(b.contracts_last_year) === 1 ? '' : 's'} last yr · topic fit ${Number(b.avg_topic_score).toFixed(1)}`,
        badge: 'no current contract',
        link: null,
        warmthRank: Number(b.avg_topic_score || 0) * 1000 + Number(b.contracts_last_year || 0),
        warmth: null,
      }))
      .sort((a, b) => b.warmthRank - a.warmthRank)

    // === RUNG-0 STRIP: in-flight receivables (dollars already earned) ===
    const { data: receivables, error: rErr } = await supabase
      .from('xero_invoices')
      .select('xero_id,invoice_number,contact_name,total,amount_due,date,due_date')
      .eq('type', 'ACCREC')
      .eq('status', 'AUTHORISED')
      .order('date', { ascending: true })
      .limit(1000)
    if (rErr) throw rErr

    const today = Date.now()
    const rung0 = (receivables || []).map(inv => {
      const dueRef = inv.due_date || inv.date
      const daysOutstanding = dueRef
        ? Math.floor((today - new Date(dueRef).getTime()) / (1000 * 60 * 60 * 24))
        : null
      return {
        id: inv.xero_id,
        invoiceNumber: inv.invoice_number,
        contactName: inv.contact_name,
        total: Number(inv.total || 0),
        amountDue: inv.amount_due != null ? Number(inv.amount_due) : Number(inv.total || 0),
        date: inv.date,
        dueDate: inv.due_date,
        daysOutstanding,
      }
    })
    const rung0Total = rung0.reduce((s, r) => s + r.amountDue, 0)

    const laneSum = (cards: Card[]) => cards.reduce((s, c) => s + (c.value || 0), 0)

    return NextResponse.json({
      rung0: {
        invoices: rung0,
        count: rung0.length,
        total: rung0Total,
      },
      lanes: {
        grants: { cards: grantCards, count: grantCards.length, total: laneSum(grantCards) },
        philanthropy: { cards: philanthropyCards, count: philanthropyCards.length, total: laneSum(philanthropyCards) },
        procurement: { cards: procurementCards, count: procurementCards.length, total: laneSum(procurementCards) },
        buyers: { cards: buyerCards, count: buyerCards.length, total: laneSum(buyerCards) },
      },
    })
  } catch (error: any) {
    console.error('GET /api/finance/opportunities error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
