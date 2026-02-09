import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/business/overview
 *
 * Returns BusinessData for the business setup page.
 * Combines static entity config with live Xero financial data.
 */
export async function GET() {
  // === LIVE FINANCIAL DATA FROM XERO ===
  const now = new Date()

  // Australian financial year: July 1 to June 30
  let fyYear = now.getFullYear()
  if (now.getMonth() < 6) fyYear -= 1
  const fyStart = new Date(fyYear, 6, 1)
  const fyStartStr = fyStart.toISOString().split('T')[0]

  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartStr = monthStart.toISOString().split('T')[0]

  // Last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  // FY totals
  const { data: fyTxns } = await supabase
    .from('xero_transactions')
    .select('total, type')
    .gte('date', fyStartStr)

  let fyIncome = 0, fyExpenses = 0
  for (const tx of fyTxns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    if (tx.type === 'RECEIVE') fyIncome += amt
    else if (tx.type === 'SPEND') fyExpenses += amt
  }

  // This month
  const { data: monthTxns } = await supabase
    .from('xero_transactions')
    .select('total, type')
    .gte('date', monthStartStr)

  let monthIncome = 0, monthExpenses = 0
  for (const tx of monthTxns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    if (tx.type === 'RECEIVE') monthIncome += amt
    else if (tx.type === 'SPEND') monthExpenses += amt
  }

  // Recent 30 days cash flow
  const { data: recentTxns } = await supabase
    .from('xero_transactions')
    .select('total, type')
    .gte('date', thirtyDaysAgoStr)

  let recentIn = 0, recentOut = 0
  for (const tx of recentTxns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    if (tx.type === 'RECEIVE') recentIn += amt
    else if (tx.type === 'SPEND') recentOut += amt
  }

  // Bank balance (latest from Xero or estimate)
  const { data: latestBalance } = await supabase
    .from('xero_transactions')
    .select('bank_account, running_balance')
    .order('date', { ascending: false })
    .limit(1)
    .single()

  // Subscriptions total
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('amount')
    .eq('status', 'active')

  const monthlySubscriptions = (subs || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0)

  // Unpaid invoices (receivables)
  const { data: unpaidInvoices } = await supabase
    .from('xero_invoices')
    .select('total')
    .eq('status', 'AUTHORISED')

  const receivables = (unpaidInvoices || []).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)

  // === LIVE R&D SPEND DATA ===
  const RD_ELIGIBLE_PROJECTS = ['ACT-EL', 'ACT-IN', 'ACT-JH', 'ACT-GD', 'ACT-PS', 'ACT-CF']

  const { data: rdTxns } = await supabase
    .from('xero_transactions')
    .select('project_code, total')
    .in('project_code', RD_ELIGIBLE_PROJECTS)
    .gte('date', fyStartStr)

  let rdSpendTotal = 0
  const rdByProject: Record<string, number> = {}
  for (const tx of rdTxns || []) {
    const amt = Math.abs(Number(tx.total) || 0)
    rdSpendTotal += amt
    rdByProject[tx.project_code] = (rdByProject[tx.project_code] || 0) + amt
  }

  // Transaction tagging coverage
  const { count: totalTxnCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', fyStartStr)

  const { count: taggedTxnCount } = await supabase
    .from('xero_transactions')
    .select('*', { count: 'exact', head: true })
    .gte('date', fyStartStr)
    .not('project_code', 'is', null)
    .neq('project_code', '')

  // Missing receipts (SPEND > $50 with no contact)
  const { data: missingReceiptTxns } = await supabase
    .from('xero_transactions')
    .select('id, total, date, contact_name')
    .gte('date', fyStartStr)
    .eq('type', 'SPEND')
    .is('contact_name', null)
    .order('total', { ascending: true })
    .limit(20)

  // === STATIC CONFIG DATA ===
  const data = {
    entities: {
      pty: {
        name: 'A Curious Tractor Pty Ltd',
        abn: '',
        acn: '',
        status: 'Setup in Progress',
        registeredDate: '',
        asicReviewDate: '',
      },
    },
    trusts: [
      {
        name: "Ben's Family Trust",
        trustee: 'Ben Knight (or corporate trustee)',
        shareholding: '50% of Pty Ltd shares',
        status: 'To Create',
        beneficiaries: ['Ben', 'Wife', 'Children'],
        role: 'Tax-efficient distributions for Ben and family',
      },
      {
        name: "Nic's Family Trust",
        trustee: 'Nic Marchesi (or corporate trustee)',
        shareholding: '50% of Pty Ltd shares',
        status: 'To Create',
        beneficiaries: ['Nic', 'Family members'],
        role: 'Tax-efficient distributions for Nic and family',
      },
    ],
    moneyFlow: {
      founderTarget: 120000,
      founderTargetLabel: '$120K each',
      allocations: [
        { name: 'Founder Distributions (x2)', type: 'founder', notes: '$120K each via family trusts' },
        { name: 'Operating Costs', type: 'operations', notes: 'Staff, subscriptions, tools, infra' },
        { name: 'Innovation Studio', type: 'projects', notes: 'Contract work — consulting and builds' },
        { name: 'JusticeHub', type: 'projects', notes: 'Digital product — revenue + enabling others' },
        { name: 'The Harvest', type: 'projects', notes: 'Venue ops — workshops, gardens, retail, events' },
        { name: 'Goods Marketplace', type: 'projects', notes: 'Social enterprise marketplace' },
        { name: 'R&D Reinvestment', type: 'reinvestment', notes: 'Empathy Ledger, platform dev, ALMA' },
      ],
      openQuestions: [
        'Shareholding split — 50/50 or different ratio?',
        'Share classes — ordinary only, or ordinary + preference?',
        'Salary vs distribution split for founders — accountant to advise',
        'Which entity currently holds the NAB bank account?',
        'Is Jessica Adams still active as AKT director?',
      ],
    },
    setupRoadmap: [
      { step: 'Choose company name', status: 'done', notes: 'A Curious Tractor Pty Ltd' },
      { step: 'Engage accountant', status: 'in progress', notes: 'Standard Ledger recommended — book free consultation' },
      { step: 'Register with ASIC ($576)', status: 'pending', notes: 'Accountant handles or ASIC direct' },
      { step: 'Get new ABN', status: 'pending', notes: 'Free via ABR after ASIC registration' },
      { step: 'Register for GST', status: 'pending', notes: 'Free via ATO' },
      { step: 'Open company bank account', status: 'pending', notes: 'NAB — new Pty Ltd account' },
      { step: 'Set up Xero for new entity', status: 'pending', notes: 'New org or convert existing' },
      { step: 'Set up family trusts (x2)', status: 'pending', notes: 'Accountant drafts trust deeds ~$1,000 each' },
      { step: 'Register as employer', status: 'pending', notes: 'ATO — needed for payroll + STP' },
      { step: 'Get insurance ($20M PL)', status: 'pending', notes: 'Public liability required for Harvest lease' },
      { step: 'Transfer operations from sole trader', status: 'pending', notes: 'Contracts, subscriptions, grants, IP' },
      { step: 'Register with AusIndustry for R&D', status: 'pending', notes: 'Within 10 months of FY end' },
    ],
    farmAsset: {
      ownership: 'Nic Marchesi (personal property)',
      leaseStatus: 'To Create',
      rdSiteUsage: true,
      notes: 'Nic leases farm to Pty Ltd at market rate. Deductible for company, rental income for Nic. Accountant to advise on lease terms.',
    },
    rdTaxCredit: {
      status: 'Not Yet Registered',
      refundRate: '43.5%',
      minSpend: 20000,
      ausIndustryRegistered: false,
      eligibleActivities: [
        'Empathy Ledger (Core R&D)',
        'ALMA / Bot Intelligence (Core R&D)',
        'JusticeHub Tech (Supporting)',
        'Goods Marketplace (Supporting)',
        'PICC Photo Studio (Supporting)',
        'The Confessional (Supporting)',
      ],
      trackingPlatform: 'Git commits + time logs + this system',
      liveSpend: {
        total: Math.round(rdSpendTotal),
        byProject: rdByProject,
        refundPotential: Math.round(rdSpendTotal * 0.435),
        aboveThreshold: rdSpendTotal >= 20000,
      },
    },
    transactionCoverage: {
      total: totalTxnCount || 0,
      tagged: taggedTxnCount || 0,
      pct: totalTxnCount ? Math.round(((taggedTxnCount || 0) / totalTxnCount) * 100) : 0,
    },
    missingReceipts: (missingReceiptTxns || []).map(t => ({
      id: t.id,
      total: Math.abs(Number(t.total)),
      date: t.date,
      contact: t.contact_name || '(no contact)',
    })),
    quarterReviewActions: {
      receiptChase: {
        title: 'Chase Missing Receipts',
        steps: [
          { step: 'Review missing receipts list below (SPEND >$50, no contact)', done: false },
          { step: 'Cross-reference with NAB bank statements to identify vendors', done: false },
          { step: 'Upload receipts via Dext mobile app', done: false },
          { step: 'For <$50 without receipts, document with bank statement backup', done: false },
          { step: 'Set up Dext mobile app for real-time capture going forward', done: false },
        ],
      },
      payrollSetup: {
        title: 'Payroll & Employment Setup',
        steps: [
          { step: 'Register ACT Pty Ltd as employer with ATO', done: false },
          { step: 'Set up payroll in Xero (built-in payroll module)', done: false },
          { step: 'Draft employment contracts — Ben: 60% R&D, Nic: 40% R&D', done: false },
          { step: 'Set up superannuation accounts (11.5%)', done: false },
          { step: 'Register for PAYG withholding', done: false },
          { step: 'Set up STP (Single Touch Payroll) reporting', done: false },
        ],
      },
      trustSetup: {
        title: 'Trust & Distribution Structure',
        steps: [
          { step: 'Create Knight Family Trust (accountant)', done: false },
          { step: 'Create Marchesi Family Trust (accountant)', done: false },
          { step: 'Set up trust bank accounts', done: false },
          { step: 'Establish quarterly distribution schedule', done: false },
          { step: 'Link trust accounts to personal mortgage offset accounts', done: false },
        ],
      },
      rdRegistration: {
        title: 'R&D Tax Incentive Registration',
        steps: [
          { step: 'Create ACT Pty Ltd first (sole trader not eligible)', done: false },
          { step: 'Document R&D activities NOW — git commits, time logs, hypotheses', done: false },
          { step: 'Run: node scripts/generate-rd-activity-log.mjs for evidence', done: false },
          { step: 'Engage R&D tax consultant (Standard Ledger or Azure Group)', done: false },
          { step: 'Register with AusIndustry (within 10 months of FY end)', done: false },
          { step: 'File R&D claim with tax return', done: false },
        ],
      },
    },
    compliance: [
      { name: 'ASIC Annual Review (AKT)', dueDate: '2026-06-30', status: 'pending', owner: 'Nic' },
      { name: 'ACNC Annual Statement (AKT)', dueDate: '2026-12-31', status: 'pending', owner: 'Ben' },
      { name: 'BAS Q3 (Sole Trader)', dueDate: '2026-04-28', status: 'pending', owner: 'Ben' },
      { name: 'Register Pty Ltd with ASIC', dueDate: '', status: 'in progress', owner: 'Ben + Accountant' },
      { name: 'Harvest Insurance ($20M PL)', dueDate: '', status: 'pending', owner: 'Ben' },
      { name: 'Workers Comp Insurance', dueDate: '', status: 'pending', owner: 'Accountant' },
      { name: 'STP Setup (Single Touch Payroll)', dueDate: '', status: 'pending', owner: 'Accountant' },
      { name: 'Super Guarantee Setup', dueDate: '', status: 'pending', owner: 'Accountant' },
    ],
  }

  // Add live financial data
  const financials = {
    asOf: now.toISOString(),
    fyLabel: `FY${fyYear}/${(fyYear + 1).toString().slice(-2)}`,
    fyToDate: {
      income: Math.round(fyIncome),
      expenses: Math.round(fyExpenses),
      net: Math.round(fyIncome - fyExpenses),
    },
    thisMonth: {
      label: now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      income: Math.round(monthIncome),
      expenses: Math.round(monthExpenses),
      net: Math.round(monthIncome - monthExpenses),
    },
    last30Days: {
      cashIn: Math.round(recentIn),
      cashOut: Math.round(recentOut),
      netFlow: Math.round(recentIn - recentOut),
    },
    currentPosition: {
      bankBalance: latestBalance?.running_balance ? Math.round(Number(latestBalance.running_balance)) : null,
      receivables: Math.round(receivables),
      monthlySubscriptions: Math.round(monthlySubscriptions),
      burnRate: Math.round(monthExpenses),
      runway: monthExpenses > 0 && latestBalance?.running_balance
        ? Math.round(Number(latestBalance.running_balance) / monthExpenses)
        : null,
    },
  }

  return NextResponse.json({ ...data, financials })
}
