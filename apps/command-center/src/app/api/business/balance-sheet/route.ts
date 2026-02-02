import { NextResponse } from 'next/server'

/**
 * GET /api/business/balance-sheet
 *
 * Returns balance sheet data. Placeholder until Xero is connected
 * for the new Pty Ltd entity.
 */
export async function GET() {
  // TODO: Proxy to Xero balance sheet API once Pty Ltd is set up
  // For now, return placeholder data based on sole trader position
  const data = {
    assets: {
      items: [
        { name: 'NAB Operating Account', code: '090', balance: 0 },
        { name: 'Accounts Receivable', code: '120', balance: 0 },
        { name: 'Equipment & Tools', code: '160', balance: 0 },
      ],
      total: 0,
    },
    liabilities: {
      items: [],
      total: 0,
    },
    equity: {
      items: [],
      total: 0,
    },
    revenue: {
      items: [
        { name: 'Innovation Studio', code: '200', balance: 0 },
        { name: 'Grants', code: '210', balance: 0 },
        { name: 'The Harvest', code: '220', balance: 0 },
      ],
      total: 0,
    },
    expenses: {
      items: [
        { name: 'Subscriptions & Tools', code: '400', balance: 0 },
        { name: 'Contractor Payments', code: '410', balance: 0 },
        { name: 'Travel (World Tour)', code: '420', balance: 0 },
      ],
      total: 0,
    },
    cashPosition: 0,
    cashAccounts: [
      { name: 'NAB Operating', balance: 0 },
    ],
    netAssets: 0,
  }

  return NextResponse.json(data)
}
