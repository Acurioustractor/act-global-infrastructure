import assert from 'node:assert/strict'
import test from 'node:test'
import {
  accountClass,
  buildFinanceWorkbenchResponse,
  type BankEvidenceRow,
  type FinanceWorkbenchFilters,
  type WorkbenchSummary,
  type XeroInvoiceRow,
  type XeroTransactionRow,
} from './workbench'

const baseFilters: FinanceWorkbenchFilters = {
  source: 'all',
  direction: 'all',
  status: 'needs_action',
  project: 'all',
  q: '',
  limit: 10,
}

const summary: WorkbenchSummary = {
  bankLines: 3,
  receiptGaps: 1,
  receiptGapValue: 120,
  candidateReceipts: 1,
  xeroDraftCandidates: 1,
  xeroDraftCandidateValue: 120,
  unreconciledBankLines: 1,
  unreconciledValue: 120,
  bankProjectGaps: 1,
  xeroProjectGaps: 1,
  invoiceProjectGaps: 1,
  actInReview: 1,
  rdReview: 1,
  rdEligibleSpend: 500,
}

const bankRows: BankEvidenceRow[] = [
  {
    id: 'bank-1',
    date: '2026-01-15',
    direction: 'debit',
    payee: 'Supplier A',
    particulars: 'Workshop tools',
    reference: 'INV-1',
    amount: 120,
    status: 'unreconciled',
    bank_account: 'NAB Visa ACT #8815',
    project_code: null,
    project_source: null,
    rd_eligible: true,
    receipt_match_status: 'unmatched',
    evidence_status: 'uncovered',
    candidate_count: 0,
    best_confidence: null,
    best_source: null,
    best_vendor_name: null,
    has_approved_link: false,
    xero_transaction_id: null,
    matched_xero_transaction_id: null,
  },
  {
    id: 'bank-2',
    date: '2026-01-20',
    direction: 'credit',
    payee: 'Grant Partner',
    particulars: 'Payment',
    reference: 'PAY-1',
    amount: 1000,
    status: 'reconciled',
    bank_account: 'ACT Everyday',
    project_code: 'ACT-GD',
    project_source: 'manual',
    rd_eligible: false,
    receipt_match_status: 'matched',
    evidence_status: 'matched',
    candidate_count: 0,
    best_confidence: null,
    best_source: null,
    best_vendor_name: null,
    has_approved_link: true,
    xero_transaction_id: 'xero-bank-2',
    matched_xero_transaction_id: null,
  },
]

const txRows: XeroTransactionRow[] = [
  {
    id: 'txn-1',
    xero_transaction_id: 'xero-txn-1',
    type: 'SPEND',
    contact_name: 'Supplier B',
    bank_account: 'NAB Visa ACT #8815',
    project_code: 'ACT-IN',
    project_code_source: 'vendor_rule',
    total: 300,
    status: 'AUTHORISED',
    date: '2026-01-18',
    line_items: [{ description: 'R&D review item' }],
    has_attachments: false,
    is_reconciled: false,
    rd_eligible: false,
    rd_category: 'review',
  },
]

const invoiceRows: XeroInvoiceRow[] = [
  {
    id: 'invoice-1',
    xero_id: 'xero-invoice-1',
    invoice_number: 'INV-1',
    type: 'ACCPAY',
    status: 'AUTHORISED',
    contact_name: 'Supplier C',
    date: '2026-01-10',
    total: 90,
    amount_due: 90,
    amount_paid: 0,
    line_items: [{ Description: 'Missing receipt invoice' }],
    has_attachments: false,
    reference: null,
    project_code: null,
    project_code_source: null,
    income_type: null,
  },
]

test('buildFinanceWorkbenchResponse classifies and filters workbench items', () => {
  const response = buildFinanceWorkbenchResponse(baseFilters, {
    projects: [],
    summary,
    bankRows,
    txRows,
    invoiceRows,
  })

  assert.equal(response.totalMatching, 3)
  assert.equal(response.items[0].id, 'bank-1')
  assert.equal(response.items[0].needsReceipt, true)
  assert.equal(response.items[0].needsProject, true)
  assert.equal(response.items[0].needsXeroDraft, true)
  assert.equal(response.items.find((item) => item.id === 'txn-1')?.needsRdReview, true)
  assert.equal(response.items.find((item) => item.id === 'invoice-1')?.source, 'xero_invoices')
})

test('buildFinanceWorkbenchResponse applies project and text filters', () => {
  const response = buildFinanceWorkbenchResponse(
    { ...baseFilters, status: 'all', project: 'ACT-GD', q: 'grant' },
    {
      projects: [],
      summary,
      bankRows,
      txRows,
      invoiceRows,
    }
  )

  assert.equal(response.totalMatching, 1)
  assert.equal(response.items[0].id, 'bank-2')
  assert.equal(response.items[0].direction, 'income')
})

test('buildFinanceWorkbenchResponse does not flag internal transfers as needing a project', () => {
  const transferRows: XeroTransactionRow[] = [
    {
      id: 'tx-transfer-spend',
      xero_transaction_id: 'xero-tx-transfer-spend',
      type: 'SPEND-TRANSFER',
      contact_name: null,
      bank_account: 'NJ Marchesi T/as ACT Everyday',
      project_code: null,
      project_code_source: null,
      total: 30000,
      status: 'AUTHORISED',
      date: '2025-12-01',
      line_items: [{ description: 'Bank Transfer to NAB Visa ACT #8815.' }],
      has_attachments: false,
      is_reconciled: false,
      rd_eligible: false,
      rd_category: null,
    },
    {
      id: 'tx-transfer-recv',
      xero_transaction_id: 'xero-tx-transfer-recv',
      type: 'RECEIVE-TRANSFER',
      contact_name: null,
      bank_account: 'NAB Visa ACT #8815',
      project_code: null,
      project_code_source: null,
      total: 30000,
      status: 'AUTHORISED',
      date: '2025-12-01',
      line_items: [{ description: 'Bank Transfer from NJ Marchesi T/as ACT Everyday.' }],
      has_attachments: false,
      is_reconciled: false,
      rd_eligible: false,
      rd_category: null,
    },
    {
      id: 'tx-normal-spend',
      xero_transaction_id: 'xero-tx-normal-spend',
      type: 'SPEND',
      contact_name: 'Kennards Hire',
      bank_account: 'NAB Visa ACT #8815',
      project_code: null,
      project_code_source: null,
      total: 1714,
      status: 'AUTHORISED',
      date: '2025-12-08',
      line_items: [{ description: 'Equipment hire' }],
      has_attachments: false,
      is_reconciled: false,
      rd_eligible: false,
      rd_category: null,
    },
  ]

  const response = buildFinanceWorkbenchResponse(
    { ...baseFilters, source: 'xero_transactions', status: 'all' },
    { projects: [], summary, txRows: transferRows }
  )

  const spendTransfer = response.items.find((item) => item.id === 'tx-transfer-spend')
  const recvTransfer = response.items.find((item) => item.id === 'tx-transfer-recv')
  const normalSpend = response.items.find((item) => item.id === 'tx-normal-spend')

  assert.equal(spendTransfer?.needsProject, false, 'a SPEND-TRANSFER is internal movement, not project spend')
  assert.equal(recvTransfer?.needsProject, false, 'a RECEIVE-TRANSFER is internal movement, not project income')
  assert.equal(normalSpend?.needsProject, true, 'a real untagged vendor SPEND still needs a project')
})

test('buildFinanceWorkbenchResponse interprets credit-card credits as transfers/refunds, not income', () => {
  const mkBank = (over: Partial<BankEvidenceRow> & Pick<BankEvidenceRow, 'id'>): BankEvidenceRow => ({
    date: '2026-03-27',
    direction: 'credit',
    payee: null,
    particulars: null,
    reference: null,
    amount: 100,
    status: 'unreconciled',
    bank_account: 'NAB Visa ACT #8815',
    project_code: null,
    project_source: null,
    rd_eligible: false,
    receipt_match_status: 'unmatched',
    evidence_status: 'uncovered',
    candidate_count: 0,
    best_confidence: null,
    best_source: null,
    best_vendor_name: null,
    has_approved_link: false,
    xero_transaction_id: null,
    matched_xero_transaction_id: null,
    ...over,
  })

  const rows: BankEvidenceRow[] = [
    mkBank({ id: 'cc-payoff', payee: 'Internet Payment', amount: 30000 }), // card payoff -> transfer
    mkBank({ id: 'cc-refund', payee: 'Kadmium Art Supplies 02 9212 2669', amount: 771 }), // vendor refund -> contra-spend
    mkBank({ id: 'cc-purchase', direction: 'debit', payee: 'Uber', amount: 25 }), // purchase -> spend
    mkBank({ id: 'deposit-income', bank_account: 'NJ Marchesi T/as ACT Everyday', payee: 'Grant', amount: 5000 }), // real bank credit -> income
  ]

  const response = buildFinanceWorkbenchResponse(
    { ...baseFilters, source: 'bank_lines', status: 'all' },
    { projects: [], summary, bankRows: rows }
  )
  const byId = (id: string) => response.items.find((i) => i.id === id)

  assert.equal(byId('cc-payoff')?.direction, 'transfer', 'a credit-card payoff is an internal transfer, not income')
  assert.equal(byId('cc-payoff')?.needsProject, false, 'a card payoff does not need a project')
  assert.equal(byId('cc-refund')?.direction, 'spend', 'a credit-card refund is contra-expense, not income')
  assert.equal(byId('cc-refund')?.isRefund, true)
  assert.equal(byId('cc-purchase')?.direction, 'spend', 'a credit-card purchase is spend')
  assert.equal(byId('deposit-income')?.direction, 'income', 'a real deposit-account credit is still income')
})

test('accountClass classifies by explicit enumerated declaration, not a fuzzy name pattern', () => {
  // Seeded from Xero BankAccountType (config/xero-chart.json, verified 2026-06-01):
  // NAB Visa #8815 + Heritage Visa CC = CREDITCARD; the NJ Marchesi accounts + NM Personal = BANK.
  assert.equal(accountClass('NAB Visa ACT #8815'), 'credit_card', 'the live ACT credit card')
  assert.equal(accountClass('Heritage Visa CC '), 'credit_card', 'archived card, trailing-space name')
  assert.equal(accountClass('NJ Marchesi T/as ACT Everyday'), 'deposit', 'the deposit account income lands in')
  assert.equal(accountClass('ACT Everyday'), 'deposit', 'short form used in some bank-line rows')
  assert.equal(accountClass('NJ Marchesi T/as ACT Maximiser'), 'deposit', 'savings')
  assert.equal(accountClass('NM Personal '), 'deposit', "Nic's personal — excluded by the two-account rule anyway")

  // The whole point of the registry: an UNKNOWN account defaults to the safe deposit convention
  // (credit = income), it is NOT pattern-guessed. A future card MUST be enumerated (or carry a
  // synced BankAccountType) — it is not silently classed from substrings like "card"/"cc".
  assert.equal(accountClass('Bendigo Everyday Access'), 'deposit', 'unknown account → safe default')
  assert.equal(accountClass('Some Random Bank Card 1234'), 'deposit', 'NOT auto-classed as a card from "card"')
  assert.equal(accountClass(null), 'deposit')
  assert.equal(accountClass(undefined), 'deposit')
})

test('buildFinanceWorkbenchResponse attaches highest-confidence AI suggestion', () => {
  const response = buildFinanceWorkbenchResponse(
    { ...baseFilters, status: 'all', source: 'bank_lines' },
    {
      projects: [],
      summary,
      bankRows,
      aiSuggestions: [
        {
          id: 'suggestion-low',
          source_table: 'bank_statement_lines',
          source_record_id: 'bank-1',
          suggested_project_code: 'ACT-IN',
          confidence: 0.4,
          reason: 'fallback',
          risk_flags: [],
          model: 'fixture',
        },
        {
          id: 'suggestion-high',
          source_table: 'bank_statement_lines',
          source_record_id: 'bank-1',
          suggested_project_code: 'SL_REVIEW',
          confidence: 0.9,
          reason: 'needs review',
          risk_flags: ['ambiguous'],
          model: 'fixture',
        },
      ],
    }
  )

  assert.equal(response.items[0].aiSuggestion?.id, 'suggestion-high')
  assert.equal(response.items[0].aiSuggestion?.blockedForAutoApply, true)
  assert.deepEqual(response.items[0].aiSuggestion?.riskFlags, ['ambiguous'])
})
