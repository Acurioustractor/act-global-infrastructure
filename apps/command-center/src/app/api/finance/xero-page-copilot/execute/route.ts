import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { supabase } from '@/lib/supabase'

// Server-side dynamic import to avoid bundling node libs in client.
// xero-client lives in scripts/lib so we import it relative.
import { createXeroClient } from '../../../../../../../../scripts/lib/finance/xero-client.mjs'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Action =
  | 'attach_evidence'        // upload receipt file to existing Xero BankTransaction
  | 'find_match_bill'        // create a Payment matching a bank line to an existing Bill
  | 'transfer'               // create a BankTransfer between two accounts

interface ExecuteRequestRow {
  action: Action
  // For attach_evidence:
  xeroBankTransactionId?: string
  receiptStoragePath?: string
  receiptUrl?: string
  receiptFilename?: string
  // For find_match_bill:
  xeroInvoiceId?: string
  xeroInvoiceNumber?: string
  amount?: number
  date?: string
  bankAccountCode?: string
  // For transfer:
  fromAccountCode?: string
  toAccountCode?: string
  reference?: string
  // Bookkeeping
  bankLineId?: string
}

interface ExecuteRequest {
  rows: ExecuteRequestRow[]
  dryRun?: boolean
}

interface RowResult {
  index: number
  action: Action
  ok: boolean
  message: string
  xeroId?: string | null
  dryRun?: boolean
}

function isHttpUrl(value: unknown) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

async function loadReceiptBytes(row: ExecuteRequestRow): Promise<{ buffer: Buffer; filename: string; mime: string } | null> {
  // Prefer storage path (signed URL won't work cross-region for Xero PUT).
  if (row.receiptStoragePath) {
    const cleaned = row.receiptStoragePath.replace(/^receipt-attachments\//, '')
    const { data, error } = await supabase.storage.from('receipt-attachments').download(cleaned)
    if (error || !data) return null
    const arrayBuffer = await data.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: row.receiptFilename || cleaned.split('/').pop() || 'receipt.pdf',
      mime: data.type || 'application/pdf',
    }
  }
  if (row.receiptUrl && isHttpUrl(row.receiptUrl)) {
    const res = await fetch(row.receiptUrl)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return {
      buffer: Buffer.from(arrayBuffer),
      filename: row.receiptFilename || row.receiptUrl.split('/').pop() || 'receipt.pdf',
      mime: res.headers.get('content-type') || 'application/pdf',
    }
  }
  return null
}

async function executeAttachEvidence(
  xero: Awaited<ReturnType<typeof createXeroClient>>,
  row: ExecuteRequestRow,
  dryRun: boolean,
): Promise<RowResult> {
  if (!row.xeroBankTransactionId) {
    return {
      index: 0,
      action: 'attach_evidence',
      ok: false,
      message: 'Missing xeroBankTransactionId',
    }
  }
  if (!row.receiptStoragePath && !row.receiptUrl) {
    return {
      index: 0,
      action: 'attach_evidence',
      ok: false,
      message: 'Missing receiptStoragePath or receiptUrl',
    }
  }

  if (dryRun) {
    return {
      index: 0,
      action: 'attach_evidence',
      ok: true,
      message: `Would PUT receipt to BankTransactions/${row.xeroBankTransactionId}/Attachments/${row.receiptFilename || 'receipt.pdf'}`,
      xeroId: row.xeroBankTransactionId,
      dryRun: true,
    }
  }

  const bytes = await loadReceiptBytes(row)
  if (!bytes) {
    return {
      index: 0,
      action: 'attach_evidence',
      ok: false,
      message: 'Failed to load receipt bytes from storage',
    }
  }

  try {
    await xero.uploadAttachment(
      'BankTransactions',
      row.xeroBankTransactionId,
      bytes.filename,
      bytes.buffer,
      bytes.mime,
    )

    // Mark the bank txn mirror as having an attachment so future runs skip.
    await supabase
      .from('xero_transactions')
      .update({ has_attachments: true })
      .eq('xero_transaction_id', row.xeroBankTransactionId)

    return {
      index: 0,
      action: 'attach_evidence',
      ok: true,
      message: `Attached ${bytes.filename} to BankTransactions/${row.xeroBankTransactionId}`,
      xeroId: row.xeroBankTransactionId,
    }
  } catch (err) {
    return {
      index: 0,
      action: 'attach_evidence',
      ok: false,
      message: (err as Error).message?.slice(0, 300) || 'Upload failed',
    }
  }
}

async function executeFindMatchBill(
  xero: Awaited<ReturnType<typeof createXeroClient>>,
  row: ExecuteRequestRow,
  dryRun: boolean,
): Promise<RowResult> {
  if (!row.xeroInvoiceId || !row.amount || !row.date || !row.bankAccountCode) {
    return {
      index: 0,
      action: 'find_match_bill',
      ok: false,
      message: 'Missing xeroInvoiceId / amount / date / bankAccountCode',
    }
  }

  if (dryRun) {
    return {
      index: 0,
      action: 'find_match_bill',
      ok: true,
      message: `Would POST Payment to Invoice ${row.xeroInvoiceNumber || row.xeroInvoiceId} for $${row.amount} dated ${row.date} from account ${row.bankAccountCode}`,
      xeroId: row.xeroInvoiceId,
      dryRun: true,
    }
  }

  try {
    const response = await xero.post('Payments', {
      Payments: [
        {
          Invoice: { InvoiceID: row.xeroInvoiceId },
          Account: { Code: row.bankAccountCode },
          Date: row.date,
          Amount: row.amount,
          Reference: row.reference || `Match ${row.xeroInvoiceNumber || ''}`.trim(),
        },
      ],
    })
    const paymentId = response?.Payments?.[0]?.PaymentID || null

    return {
      index: 0,
      action: 'find_match_bill',
      ok: true,
      message: `Created Payment ${paymentId} for Invoice ${row.xeroInvoiceNumber || row.xeroInvoiceId}`,
      xeroId: paymentId,
    }
  } catch (err) {
    return {
      index: 0,
      action: 'find_match_bill',
      ok: false,
      message: (err as Error).message?.slice(0, 300) || 'Payment creation failed',
    }
  }
}

async function executeTransfer(
  xero: Awaited<ReturnType<typeof createXeroClient>>,
  row: ExecuteRequestRow,
  dryRun: boolean,
): Promise<RowResult> {
  if (!row.fromAccountCode || !row.toAccountCode || !row.amount || !row.date) {
    return {
      index: 0,
      action: 'transfer',
      ok: false,
      message: 'Missing fromAccountCode / toAccountCode / amount / date',
    }
  }

  if (dryRun) {
    return {
      index: 0,
      action: 'transfer',
      ok: true,
      message: `Would POST BankTransfer ${row.fromAccountCode} → ${row.toAccountCode} for $${row.amount} dated ${row.date}`,
      dryRun: true,
    }
  }

  try {
    const response = await xero.post('BankTransfers', {
      BankTransfers: [
        {
          FromBankAccount: { Code: row.fromAccountCode },
          ToBankAccount: { Code: row.toAccountCode },
          Amount: row.amount,
          Date: row.date,
          Reference: row.reference || 'Internal transfer',
        },
      ],
    })
    const transferId = response?.BankTransfers?.[0]?.BankTransferID || null

    return {
      index: 0,
      action: 'transfer',
      ok: true,
      message: `Created BankTransfer ${transferId}`,
      xeroId: transferId,
    }
  } catch (err) {
    return {
      index: 0,
      action: 'transfer',
      ok: false,
      message: (err as Error).message?.slice(0, 300) || 'Transfer creation failed',
    }
  }
}

export async function POST(request: NextRequest) {
  let body: ExecuteRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const rows = Array.isArray(body.rows) ? body.rows : []
  const dryRun = Boolean(body.dryRun)

  if (!rows.length) {
    return NextResponse.json({ error: 'Empty rows[] payload' }, { status: 400 })
  }

  let xero
  try {
    xero = await createXeroClient(supabase)
  } catch (err) {
    return NextResponse.json(
      { error: `Xero client init failed: ${(err as Error).message}` },
      { status: 500 },
    )
  }

  const results: RowResult[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    let res: RowResult

    if (row.action === 'attach_evidence') {
      res = await executeAttachEvidence(xero, row, dryRun)
    } else if (row.action === 'find_match_bill') {
      res = await executeFindMatchBill(xero, row, dryRun)
    } else if (row.action === 'transfer') {
      res = await executeTransfer(xero, row, dryRun)
    } else {
      res = {
        index: i,
        action: row.action,
        ok: false,
        message: `Unsupported action "${row.action}" — only attach_evidence, find_match_bill, transfer are wired. Use Xero UI for the rest.`,
      }
    }

    res.index = i
    results.push(res)
  }

  const summary = results.reduce(
    (acc, r) => {
      acc.total += 1
      if (r.ok) acc.ok += 1
      else acc.failed += 1
      return acc
    },
    { total: 0, ok: 0, failed: 0 },
  )

  return NextResponse.json({
    dryRun,
    summary,
    results,
    note: dryRun
      ? 'Dry run — no Xero writes. Pass dryRun=false to execute.'
      : 'Executed against Xero. Check results[] for per-row status.',
  })
}
