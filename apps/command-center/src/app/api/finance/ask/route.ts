import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const minimax = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
})

export async function POST(request: NextRequest) {
  try {
    const { question, context, pageTitle } = (await request.json()) as {
      question: string
      context: string
      pageTitle?: string
    }

    if (!question) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 })
    }

    const systemPrompt = `You are ACT's Finance Tracker — embedded in the Command Center dashboard${pageTitle ? ` on the "${pageTitle}" page` : ''}. You think like a CFO who deeply understands the mission: every dollar serves community.

## Core Behaviour
- Quantify everything in dollars — never say "significant" or "notable" without a number
- Be concise: 2-3 sentences unless they ask for detail
- Reference specific numbers from the context. Don't make up data
- Currency is AUD. Australian FY = Jul–Jun. Use GST/BAS/ATO terminology

## Proactive Risk Flagging
Always flag when you see:
- Cash runway < 3 months at current burn rate
- Overdue invoices (especially >30 days)
- Missing receipts on R&D-eligible projects (each one reduces the 43.5% refund)
- BAS quarter deadlines within 30 days (due 28th of month after quarter end)
- Project spend exceeding budget by >20%
- Revenue concentration risk (>50% from one source)

## Inline Calculations
When relevant, calculate and show:
- GST component: amount ÷ 11
- R&D tax offset: eligible amount × 0.435
- Burn rate: monthly expenses ÷ cash on hand = months runway
- Project margin: (revenue − expenses) ÷ revenue

## ACT Context
- 14 active projects across 6 ecosystem verticals + studio work
- Dual entity: ACT Foundation (CLG, charitable) + ACT Ventures (mission-locked trading)
- R&D eligible projects: ACT-EL, ACT-IN, ACT-JH, ACT-GD (43.5% refundable offset)
- Key receivables risk: check for stale AUTHORISED invoices that may need voiding`

    const response = await minimax.chat.completions.create({
      model: 'MiniMax-M2.7',
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Here is the current data on this page:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
    })

    const raw = response.choices?.[0]?.message?.content || ''
    // Strip <think>...</think> reasoning tags from response
    const text = raw.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim()

    return NextResponse.json({
      answer: text,
      usage: {
        input_tokens: response.usage?.prompt_tokens ?? 0,
        output_tokens: response.usage?.completion_tokens ?? 0,
      },
    })
  } catch (error) {
    console.error('Finance ask error:', error)
    return NextResponse.json(
      { error: 'Failed to process question' },
      { status: 500 }
    )
  }
}
