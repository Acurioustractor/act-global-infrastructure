import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are the ACT Business Agent. You help manage A Curious Tractor's operations including contacts, projects, finances, and integrations. Be concise and actionable.

ACT (A Curious Tractor) is a social enterprise ecosystem based in Australia focused on regenerative futures. You assist with:
- Contact and relationship management
- Project tracking and health
- Financial overview and queries
- Operational decisions and recommendations

Keep responses focused and practical. Use Australian English.`

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, history } = body as {
      message: string
      history?: ChatMessage[]
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const client = new Anthropic({ apiKey })

    // Build messages array from history + current message
    const messages: Anthropic.MessageParam[] = []

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    messages.push({
      role: 'user',
      content: message,
    })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    })

    // Extract text from response
    const textBlock = response.content.find((block) => block.type === 'text')
    const responseText = textBlock ? textBlock.text : 'No response generated.'

    return NextResponse.json({ response: responseText })
  } catch (error) {
    console.error('Agent chat error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
