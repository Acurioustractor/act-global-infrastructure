/**
 * Drift Detector — surfaces money items needing project_code attention.
 *
 * Two flavours of drift:
 *   1. Untagged — project_code IS NULL or empty in xero_invoices / xero_transactions / ghl_opportunities
 *   2. Mismatched — xero_invoices.project_code disagrees with tracking_option_1 (where both exist)
 *
 * Output: unified queue sorted by absolute $ amount, suitable for the /finance/command
 * MIDDLE layer "drift queue" widget and the workbench deep-link.
 */

export async function getDriftQueue(supabase, { limit = 10, fyStart = '2025-07-01' } = {}) {
  const [untaggedInvoices, mismatchedInvoices, untaggedOpps, untaggedTransactions] = await Promise.all([
    fetchUntaggedInvoices(supabase, fyStart),
    fetchMismatchedInvoices(supabase, fyStart),
    fetchUntaggedOpportunities(supabase),
    fetchUntaggedTransactions(supabase, fyStart),
  ])

  const items = [
    ...untaggedInvoices.map(row => ({
      kind: 'invoice',
      reason: 'untagged',
      id: row.xero_id,
      label: `${row.contact_name ?? 'Unknown'} · ${row.invoice_number ?? ''}`.trim(),
      amount: Number(row.total ?? 0),
      meta: { type: row.type, status: row.status, date: row.date, due_date: row.due_date },
      workbenchUrl: buildWorkbenchUrl({ source: 'xero_invoices', status: 'needs_project' }),
    })),
    ...mismatchedInvoices.map(row => ({
      kind: 'invoice',
      reason: 'mismatch',
      id: row.xero_id,
      label: `${row.contact_name ?? 'Unknown'} · ${row.invoice_number ?? ''}`.trim(),
      amount: Number(row.total ?? 0),
      meta: {
        project_code: row.project_code,
        tracking_option_1: row.tracking_option_1,
        date: row.date,
      },
      workbenchUrl: buildWorkbenchUrl({ source: 'xero_invoices', status: 'project_review' }),
    })),
    ...untaggedOpps.map(row => ({
      kind: 'opportunity',
      reason: 'untagged',
      id: row.ghl_id,
      label: `${row.name ?? 'Unnamed'} · ${row.pipeline_name ?? ''}`.trim(),
      amount: Number(row.monetary_value ?? 0),
      meta: { pipeline: row.pipeline_name, stage: row.stage_name, last_change: row.last_stage_change_at },
      workbenchUrl: null,
    })),
    ...untaggedTransactions.map(row => ({
      kind: 'transaction',
      reason: 'untagged',
      id: row.xero_transaction_id,
      label: `${row.contact_name ?? 'Unknown'} · ${row.type}`.trim(),
      amount: Number(row.total ?? 0),
      meta: { type: row.type, status: row.status, date: row.date, bank_account: row.bank_account },
      workbenchUrl: buildWorkbenchUrl({ source: 'xero_transactions', status: 'needs_project' }),
    })),
  ]

  items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
  return items.slice(0, limit)
}

async function fetchUntaggedInvoices(supabase, fyStart) {
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, type, status, date, due_date, total, project_code')
    .gte('date', fyStart)
    .is('project_code', null)
    .order('total', { ascending: false })
    .limit(25)
  if (error) throw error
  return data ?? []
}

async function fetchMismatchedInvoices(supabase, fyStart) {
  // Invoices where Xero tracking says X but project_code says Y.
  // Pull candidates first (both populated), filter in JS.
  const { data, error } = await supabase
    .from('xero_invoices')
    .select('xero_id, invoice_number, contact_name, type, status, date, total, project_code, tracking_option_1')
    .gte('date', fyStart)
    .not('project_code', 'is', null)
    .not('tracking_option_1', 'is', null)
    .order('total', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []).filter(r => {
    const code = (r.project_code ?? '').toUpperCase().trim()
    const tracking = (r.tracking_option_1 ?? '').toUpperCase().trim()
    if (!code || !tracking) return false
    return code !== tracking && !tracking.includes(code) && !code.includes(tracking)
  }).slice(0, 25)
}

async function fetchUntaggedOpportunities(supabase) {
  const { data, error } = await supabase
    .from('ghl_opportunities')
    .select('ghl_id, name, pipeline_name, stage_name, monetary_value, last_stage_change_at')
    .eq('status', 'open')
    .is('project_code', null)
    .order('monetary_value', { ascending: false, nullsFirst: false })
    .limit(25)
  if (error) throw error
  return data ?? []
}

async function fetchUntaggedTransactions(supabase, fyStart) {
  const { data, error } = await supabase
    .from('xero_transactions')
    .select('xero_transaction_id, contact_name, type, status, date, total, bank_account, project_code')
    .gte('date', fyStart)
    .is('project_code', null)
    .order('total', { ascending: false })
    .limit(25)
  if (error) throw error
  return data ?? []
}

function buildWorkbenchUrl({ source, status }) {
  const params = new URLSearchParams({ source, status })
  return `/finance/workbench?${params.toString()}`
}
