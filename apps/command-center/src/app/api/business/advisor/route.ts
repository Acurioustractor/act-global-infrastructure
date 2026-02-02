import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

const BUSINESS_CONTEXT = `
ACT (A Curious Tractor) is a social enterprise ecosystem based in Australia.

ENTITY STRUCTURE:
- Sole Trader (ABN 21 591 780 066) — winding down, migrating to Pty Ltd
- A Kind Tractor LTD (ABN 73 669 029 341) — ACNC charity, dormant, NOT DGR
- A Curious Tractor Pty Ltd — TO BE CREATED, main operating entity
- Ben's Family Trust — TO BE CREATED, 50% shareholder
- Nic's Family Trust — TO BE CREATED, 50% shareholder

REVENUE STREAMS:
- Innovation Studio: consulting/contracts
- JusticeHub: digital justice platform (SaaS + enabling others to earn)
- The Harvest: venue (workshops, gardens, retail, events) — leased from philanthropist
- Goods Marketplace: social enterprise marketplace
- Grants: via AKT or Pty Ltd
- Empathy Ledger: internal storytelling + impact tool

FOUNDER TARGETS: $120K each (Ben + Nic) via family trust distributions
FAMILY TRUSTS: Tax-efficient — wages + super + distributions to beneficiaries

R&D TAX INCENTIVE: 43.5% refundable offset for <$20M turnover companies
Eligible: Empathy Ledger, JusticeHub, Goods, World Tour 2026, Farm R&D, ALMA, LCAA, Agentic system
Not yet registered with AusIndustry

PHYSICAL SITES:
- The Harvest: leased from philanthropist, goal is profitability, needs $20M public liability
- The Farm: leased from Nic to Pty Ltd, R&D + manufacturing + gardens

KEY COSTS (Standard Ledger):
- Pty Ltd setup: ~$576 (ASIC) + accountant fees (~$950-2,500)
- Trust setup: ~$1,000 each (x2)
- Monthly bookkeeping: $410-670/mo (or $75/mo DIY)
- Xero: ~$35/mo
- ASIC annual review: ~$310/yr
- Payroll: ~$57-95/mo per employee

ACCOUNTANT: Standard Ledger recommended (startup-native, cloud-first, R&D capable)
`

/**
 * POST /api/business/advisor
 * Body: { question: string }
 *
 * Business advisor that answers questions about ACT's structure,
 * revenue model, tax, and setup using hardcoded business context + LLM.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question) {
      return NextResponse.json(
        { error: 'question is required' },
        { status: 400 }
      )
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        question,
        answer: 'Business advisor requires an OpenAI API key. Set OPENAI_API_KEY in your environment.',
        context: { dataSourcesUsed: ['none'], model: 'none' },
      })
    }

    const systemPrompt = `You are a business advisor for ACT (A Curious Tractor), an Australian social enterprise. Answer questions using the business context provided. Be specific, practical, and cite Australian tax law where relevant. Keep answers concise but actionable. If you're unsure, say so and recommend consulting the accountant.`

    const userPrompt = `BUSINESS CONTEXT:\n${BUSINESS_CONTEXT}\n\nQUESTION: ${question}`

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    let answer = 'Could not generate answer — LLM unavailable.'
    if (llmResponse.ok) {
      const llmData = await llmResponse.json()
      answer = llmData.choices?.[0]?.message?.content || answer
    }

    return NextResponse.json({
      question,
      answer,
      context: {
        dataSourcesUsed: ['entity-structure', 'founder-interview', 'standard-ledger-pricing'],
        model: 'gpt-4o-mini',
      },
    })
  } catch (e) {
    console.error('Business advisor error:', e)
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    )
  }
}
