import assert from 'node:assert/strict'
import test from 'node:test'
import {
  amountCloseness,
  buildReconcileResponse,
  classifyLine,
  normalizeVendor,
  summarizeReconcile,
  surchargeOf,
  vendorMatch,
  type CardLine,
  type DextCoding,
  type ReconcileContext,
  type ReconcileFilters,
  type XeroBill,
  type XeroSpendTxn,
} from './reconcile'

// ---------------------------------------------------------------------------
// Amount closeness — the surcharge engine. A bank charge is often the receipt
// amount + a card surcharge, so exact-amount matching alone fails. 'exact' wins
// over 'surcharge'; anything outside the tight band is no match.
// ---------------------------------------------------------------------------
test('amountCloseness: exact within half a cent', () => {
  assert.equal(amountCloseness(100, 100), 'exact')
  assert.equal(amountCloseness(100.004, 100), 'exact')
})

test('amountCloseness: surcharge band (<=$15 and <=6% of ref)', () => {
  // Centre Trailer: bank $424.91 vs $420 bill = $4.91 surcharge → in band
  assert.equal(amountCloseness(424.91, 420), 'surcharge')
  assert.equal(amountCloseness(105, 100), 'surcharge') // $5 / 5%
})

test('amountCloseness: rejects gaps that are too large by dollars or by percent', () => {
  assert.equal(amountCloseness(120, 100), null) // $20 > $15 cap
  assert.equal(amountCloseness(7, 6), null) // $1 but 16.7% > 6% cap
  assert.equal(amountCloseness(2000, 1980), null) // $20 > $15 cap even though <6%
})

test('surchargeOf: bank minus matched reference, 2dp', () => {
  assert.equal(surchargeOf(424.91, 420), 4.91)
  assert.equal(surchargeOf(100, 100), 0)
})

// ---------------------------------------------------------------------------
// Vendor matching — token overlap after normalisation. The stricter vendor
// gate (commit adba653) means a matching amount alone must NOT match.
// ---------------------------------------------------------------------------
test('normalizeVendor strips card prefixes, suffixes, digits, punctuation', () => {
  assert.equal(normalizeVendor('SQ *NEST IN WITTA'), 'NEST IN WITTA')
  assert.equal(normalizeVendor('AMZNPRIME MEMBERSHIP 1234'), 'AMZNPRIME MEMBERSHIP') // digits gone
  assert.equal(normalizeVendor('HATCH ELECTRICAL PTY LTD'), 'HATCH ELECTRICAL') // suffix gone
})

test('vendorMatch: shared significant token matches; unrelated names do not', () => {
  assert.equal(vendorMatch('OPENAI CHATGPT', 'OpenAI'), true)
  assert.equal(vendorMatch('BOOKING.COM AMSTERDAM', 'Booking.com'), true)
  assert.equal(vendorMatch('CENTRE TRAILER SALES', 'Random Vendor Xyz'), false)
})

// ---------------------------------------------------------------------------
// Classification cascade + a 5-line summary with hand-computed totals.
// ---------------------------------------------------------------------------
const lines: CardLine[] = [
  // 1. surcharge bill match: bank $424.91 vs bill $420 → MATCH_BILL, surcharge $4.91
  { id: 'L1', date: '2025-10-07', vendor: 'CENTRE TRAILER SALES CICCONE', amount: 424.91, status: 'unreconciled', projectCode: null, bankAccount: 'NAB Visa ACT #8815' },
  // 2. duplicate: bank $239 has BOTH a bill AND a card txn → DUPLICATE
  { id: 'L2', date: '2025-10-14', vendor: 'BOOKING.COM AMSTERDAM', amount: 239, status: 'unreconciled', projectCode: null, bankAccount: 'NAB Visa ACT #8815' },
  // 3. create from Dext: no bill/txn, Dext has coding + receipt image
  { id: 'L3', date: '2025-10-29', vendor: 'OPENAI CHATGPT', amount: 33.63, status: 'unreconciled', projectCode: null, bankAccount: 'NAB Visa ACT #8815' },
  // 4. create heuristic: AMZNPRIME → no match anywhere → Drawings guess
  { id: 'L4', date: '2025-10-16', vendor: 'AMZNPRIME MEMBERSHIP', amount: 9.99, status: 'unreconciled', projectCode: null, bankAccount: 'NAB Visa ACT #8815' },
  // 5. vendor-gate guard: amount matches a bill but vendor does NOT → CREATE, not match
  { id: 'L5', date: '2025-10-20', vendor: 'MYSTERY MERCHANT 1234', amount: 420, status: 'unreconciled', projectCode: null, bankAccount: 'NAB Visa ACT #8815' },
]

const bills: XeroBill[] = [
  { contactName: 'Centre Trailer Sales', date: '2025-10-07', amount: 420, status: 'AUTHORISED', hasAttachments: true },
  { contactName: 'Booking.com', date: '2025-10-14', amount: 239, status: 'AUTHORISED', hasAttachments: true },
]

const txns: XeroSpendTxn[] = [
  { contactName: 'Booking.com', date: '2025-10-14', amount: 239, isReconciled: false },
]

const dext: DextCoding[] = [
  { vendor: 'OpenAI', project: 'ACT-RD', amount: 33.63, date: '2025-10-29', receiptUrl: 'https://example.test/openai.png' },
]

const ctx: ReconcileContext = { bills, txns, dext }

test('classifyLine: surcharge bill match', () => {
  const r = classifyLine(lines[0], ctx)
  assert.equal(r.action, 'match_bill')
  assert.equal(r.surcharge, 4.91)
  assert.equal(r.matchedBill?.contactName, 'Centre Trailer Sales')
})

test('classifyLine: duplicate when both a bill and a card txn match', () => {
  const r = classifyLine(lines[1], ctx)
  assert.equal(r.action, 'duplicate')
  assert.equal(r.surcharge, 0)
})

test('classifyLine: create from Dext carries coding + receipt image', () => {
  const r = classifyLine(lines[2], ctx)
  assert.equal(r.action, 'create')
  assert.equal(r.fromDext, true)
  assert.equal(r.suggestedProject, 'ACT-RD')
  assert.equal(r.receiptUrl, 'https://example.test/openai.png')
})

test('classifyLine: heuristic create flags AMZNPRIME as drawings/personal', () => {
  const r = classifyLine(lines[3], ctx)
  assert.equal(r.action, 'create')
  assert.equal(r.fromDext, false)
  assert.match(r.suggestedAccount || '', /Drawings/i)
})

test('classifyLine: vendor gate — matching amount with wrong vendor does NOT match', () => {
  const r = classifyLine(lines[4], ctx)
  assert.equal(r.action, 'create')
  assert.equal(r.matchedBill, undefined)
})

test('summarizeReconcile: hand-computed totals across the 5 lines', () => {
  const results = lines.map((l) => classifyLine(l, ctx))
  const s = summarizeReconcile(results)

  assert.equal(s.totalLines, 5)
  assert.equal(s.totalValue, 1127.53) // 424.91+239+33.63+9.99+420

  assert.equal(s.matchCount, 1) // L1 only (L2 is a duplicate, not a plain match)
  assert.equal(s.matchValue, 424.91)

  assert.equal(s.duplicateCount, 1) // L2
  assert.equal(s.duplicateValue, 239) // double-counted money to recover

  assert.equal(s.createCount, 3) // L3, L4, L5
  assert.equal(s.createValue, 463.62) // 33.63+9.99+420

  assert.equal(s.surchargeCount, 1) // only L1 has a non-zero surcharge
  assert.equal(s.surchargeTotal, 4.91)
})

// ---------------------------------------------------------------------------
// Response builder — filtering, sorting, summary always over the FULL set.
// ---------------------------------------------------------------------------
const baseFilters: ReconcileFilters = { action: 'all', q: '', minAmount: 0, limit: 100 }

test('buildReconcileResponse: summary covers all lines even when filtered/paged', () => {
  const res = buildReconcileResponse(lines, ctx, { ...baseFilters, action: 'create', limit: 1 })
  // summary is over all 5 lines, not just the filtered/paged view
  assert.equal(res.summary.totalLines, 5)
  // filter keeps only the 3 create lines
  assert.equal(res.totalMatching, 3)
  // limit caps the returned page
  assert.equal(res.results.length, 1)
})

test('buildReconcileResponse: minAmount threshold filters small lines', () => {
  const res = buildReconcileResponse(lines, ctx, { ...baseFilters, minAmount: 100 })
  // only L1 (424.91), L2 (239), L5 (420) clear $100
  assert.equal(res.totalMatching, 3)
  assert.ok(res.results.every((r) => r.line.amount >= 100))
})

test('buildReconcileResponse: q matches vendor text', () => {
  const res = buildReconcileResponse(lines, ctx, { ...baseFilters, q: 'booking' })
  assert.equal(res.totalMatching, 1)
  assert.equal(res.results[0].line.id, 'L2')
})
