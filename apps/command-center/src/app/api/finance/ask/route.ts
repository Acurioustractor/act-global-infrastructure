import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

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

    const systemPrompt = `You are a helpful financial analyst for ACT (A Curious Tractor), a regenerative innovation ecosystem based in Queensland, Australia.

You are embedded in the ACT Command Center dashboard${pageTitle ? ` on the "${pageTitle}" page` : ''}. The user is looking at live financial data and has a question about it.

Rules:
- Be concise — 2-3 sentences max unless they ask for detail
- Reference specific numbers from the context when relevant
- Use Australian financial terminology (GST, BAS, FY = Jul-Jun, ATO)
- If asked about R&D tax incentive: 43.5% refundable offset for eligible spend
- Currency is AUD unless stated otherwise
- Don't make up data — only reference what's in the context`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here is the current data on this page:\n\n${context}\n\nQuestion: ${question}`,
        },
      ],
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    return NextResponse.json({
      answer: text,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
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
