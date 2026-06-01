import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  getReconcileCockpit,
  RECONCILE_ACCOUNT,
  RECONCILE_FY_END,
  RECONCILE_FY_START,
  type ReconcileActionFilter,
  type ReconcileFilters,
  type ReconcileLineResult,
} from '@/lib/finance/reconcile'

export const dynamic = 'force-dynamic'

const ACTIONS: ReconcileActionFilter[] = ['all', 'duplicate', 'match_bill', 'approve_draft', 'match_txn', 'create']

function parseAction(value: string | null): ReconcileActionFilter {
  return ACTIONS.includes(value as ReconcileActionFilter) ? (value as ReconcileActionFilter) : 'all'
}

function parseLimit(value: string | null): number {
  return Math.min(Math.max(parseInt(value || '300', 10), 50), 500)
}

function parseMinAmount(value: string | null): number {
  const n = parseFloat(value || '0')
  return Number.isFinite(n) && n > 0 ? n : 0
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|bmp|tiff?)$/i

// Receipt attachment_url is a storage path inside the 'receipt-attachments' bucket
// (the 'dext-import/' folder lives there too). Mirrors signedUrlFor in
// api/finance/receipts-triage/route.ts.
async function signedUrlFor(path: string | null): Promise<string | null> {
  if (!path) return null
  const storagePath = path.startsWith('receipt-attachments/') ? path.replace('receipt-attachments/', '') : path
  try {
    const { data, error } = await supabase.storage.from('receipt-attachments').createSignedUrl(storagePath, 3600)
    if (error) return null
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}

interface ApiLineResult extends ReconcileLineResult {
  receiptSignedUrl: string | null
  receiptIsImage: boolean
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters: ReconcileFilters = {
    action: parseAction(params.get('action')),
    q: (params.get('q') || '').trim(),
    minAmount: parseMinAmount(params.get('minAmount')),
    limit: parseLimit(params.get('limit')),
  }
  const window = {
    start: params.get('start') || RECONCILE_FY_START,
    end: params.get('end') || RECONCILE_FY_END,
    account: params.get('account') || RECONCILE_ACCOUNT,
  }

  try {
    const cockpit = await getReconcileCockpit(filters, window)

    // Sign receipt images only for the returned (paged) lines that carry one.
    const results: ApiLineResult[] = await Promise.all(
      cockpit.results.map(async (r) => ({
        ...r,
        receiptSignedUrl: r.receiptUrl ? await signedUrlFor(r.receiptUrl) : null,
        receiptIsImage: r.receiptUrl ? IMAGE_EXT.test(r.receiptUrl) : false,
      }))
    )

    return NextResponse.json({ ...cockpit, results })
  } catch (error) {
    console.error('[finance/reconcile] GET failed:', error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
