import { NextResponse } from 'next/server'

/**
 * GET /api/business/overview
 *
 * Returns BusinessData for the business setup page.
 * This is config/reference data sourced from docs/legal/entity-structure.md,
 * not database data — hardcoded and maintained here.
 */
export async function GET() {
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
        'Empathy Ledger',
        'JusticeHub',
        'Goods Marketplace',
        'World Tour 2026',
        'Farm R&D',
        'ALMA Measurement',
        'LCAA Framework',
        'Agentic System',
      ],
      trackingPlatform: 'Git commits + time logs + this system',
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

  return NextResponse.json(data)
}
