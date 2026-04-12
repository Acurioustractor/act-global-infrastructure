import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface QueueItem {
  id: string
  vendor: string
  amount: number
  date: string
  type: 'invoice' | 'transaction'
  description: string | null
  hasReceipt: boolean
  suggestedProject: string | null
  currentProject: string | null
  confidence: number
  siblingCount: number
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') || 'untagged'
  const filterProject = request.nextUrl.searchParams.get('project') || null

  try {
    // Build invoice query
    let invQuery = supabase
      .from('xero_invoices')
      .select('id, contact_name, total, date, has_attachments, reference, invoice_number, project_code, line_items')
      .eq('type', 'ACCPAY')
      .in('status', ['DRAFT', 'SUBMITTED', 'AUTHORISED', 'PAID'])

    // Build transaction query
    let txQuery = supabase
      .from('xero_transactions')
      .select('id, contact_name, total, date, has_attachments, bank_account, project_code, line_items')
      .lt('total', 0)
      .gte('date', '2025-07-01')

    if (mode === 'untagged') {
      invQuery = invQuery.or('project_code.is.null,project_code.eq.')
      txQuery = txQuery.or('project_code.is.null,project_code.eq.')
    } else {
      invQuery = invQuery.not('project_code', 'is', null)
      txQuery = txQuery.not('project_code', 'is', null)
      if (filterProject) {
        invQuery = invQuery.eq('project_code', filterProject)
        txQuery = txQuery.eq('project_code', filterProject)
      }
    }

    const limit = mode === 'untagged' ? 500 : 200

    // Run ALL queries in parallel
    const [invResult, txResult, rulesResult, projectsResult] = await Promise.all([
      invQuery.order('date', { ascending: false }).limit(limit),
      txQuery.order('date', { ascending: false }).limit(limit),
      supabase.from('vendor_project_rules').select('vendor_name, project_code, aliases'),
      supabase.from('projects').select('code, name, tier, metadata').eq('status', 'active').order('tier').order('name'),
    ])

    const invoices = invResult.data || []
    const transactions = txResult.data || []
    const rules = rulesResult.data || []
    const allProjects = projectsResult.data || []
    const projects = mode === 'untagged'
      ? allProjects.filter((project: { metadata?: { legacy_wrapper?: boolean } | null }) => !project.metadata?.legacy_wrapper)
      : allProjects

    // Build rules lookup
    const rulesMap = new Map<string, string>()
    for (const rule of rules) {
      rulesMap.set(rule.vendor_name.toLowerCase(), rule.project_code)
      for (const alias of rule.aliases || []) {
        if (alias) rulesMap.set(alias.toLowerCase(), rule.project_code)
      }
    }

    // Sibling counts (untagged mode only)
    const vendorCounts = new Map<string, number>()
    if (mode === 'untagged') {
      for (const r of [...invoices, ...transactions]) {
        const v = (r.contact_name || '').toLowerCase()
        vendorCounts.set(v, (vendorCounts.get(v) || 0) + 1)
      }
    }

    // Extract first meaningful description from line_items JSONB
    function getLineDesc(lineItems: unknown): string | null {
      if (!Array.isArray(lineItems) || lineItems.length === 0) return null
      for (const li of lineItems) {
        const desc = li?.Description || li?.description
        if (desc && typeof desc === 'string' && desc.trim().length > 0) {
          return desc.trim().slice(0, 120)
        }
      }
      return null
    }

    // Build items
    const items: QueueItem[] = []

    for (const inv of invoices) {
      const vendor = inv.contact_name || 'Unknown'
      const vl = vendor.toLowerCase()
      const match = mode === 'untagged' ? rulesMap.get(vl) : undefined
      const lineDesc = getLineDesc(inv.line_items)
      items.push({
        id: inv.id, vendor,
        amount: Math.abs(inv.total || 0),
        date: inv.date, type: 'invoice',
        description: lineDesc || inv.reference || inv.invoice_number || null,
        hasReceipt: inv.has_attachments || false,
        suggestedProject: match || null,
        currentProject: inv.project_code || null,
        confidence: match ? 95 : 0,
        siblingCount: mode === 'untagged' ? (vendorCounts.get(vl) || 1) - 1 : 0,
      })
    }

    for (const tx of transactions) {
      const vendor = tx.contact_name || 'Unknown'
      const vl = vendor.toLowerCase()
      const match = mode === 'untagged' ? rulesMap.get(vl) : undefined
      const lineDesc = getLineDesc(tx.line_items)
      items.push({
        id: tx.id, vendor,
        amount: Math.abs(tx.total || 0),
        date: tx.date, type: 'transaction',
        description: lineDesc || tx.bank_account || null,
        hasReceipt: tx.has_attachments || false,
        suggestedProject: match || null,
        currentProject: tx.project_code || null,
        confidence: match ? 95 : 0,
        siblingCount: mode === 'untagged' ? (vendorCounts.get(vl) || 1) - 1 : 0,
      })
    }

    // Sort
    if (mode === 'untagged') {
      items.sort((a, b) => {
        if (a.suggestedProject && !b.suggestedProject) return -1
        if (!a.suggestedProject && b.suggestedProject) return 1
        return b.amount - a.amount
      })
    } else {
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    return NextResponse.json({
      items,
      projects: projects.map(p => ({ code: p.code, name: p.name, tier: p.tier })),
      vendorRules: rules.length,
      stats: {
        totalUntagged: mode === 'untagged' ? items.length : 0,
        totalValue: items.reduce((sum, i) => sum + i.amount, 0),
        totalItems: items.length,
      },
    })
  } catch (e) {
    console.error('Tagger queue error:', e)
    return NextResponse.json({ error: 'Failed to load tagger queue' }, { status: 500 })
  }
}
