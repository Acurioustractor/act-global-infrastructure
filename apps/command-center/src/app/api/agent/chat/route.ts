import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'
import { AGENT_TOOLS, executeTool, logAgentUsage, calculateCost } from '@/lib/agent-tools'

const MODEL = 'claude-3-5-haiku-20241022'
const MAX_TOKENS = 2048
const MAX_TOOL_ROUNDS = 5

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  const start = Date.now()

  try {
    const body = await request.json()
    const { message, history } = body as {
      message: string
      history?: ChatMessage[]
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
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
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    messages.push({ role: 'user', content: message })

    // Tool loop: call Claude, execute tools, repeat until text response or max rounds
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let toolCallCount = 0

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: AGENT_SYSTEM_PROMPT,
        tools: AGENT_TOOLS,
        messages,
      })

      totalInputTokens += response.usage.input_tokens
      totalOutputTokens += response.usage.output_tokens

      // Check if the model wants to use tools
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        // No tool use — extract text and return
        const textBlocks = response.content.filter(
          (block): block is Anthropic.TextBlock => block.type === 'text'
        )
        const responseText =
          textBlocks.map((b) => b.text).join('\n') || 'No response generated.'

        const latencyMs = Date.now() - start
        const cost = calculateCost(MODEL, totalInputTokens, totalOutputTokens)

        // Log usage asynchronously (don't block the response)
        logAgentUsage({
          model: MODEL,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs,
          toolCalls: toolCallCount,
        }).catch(() => {})

        return NextResponse.json({
          response: responseText,
          usage: {
            model: MODEL,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
            cost: Math.round(cost * 1_000_000) / 1_000_000, // 6 decimal places
            tool_calls: toolCallCount,
            latency_ms: latencyMs,
          },
        })
      }

      // Execute each tool call and build tool results
      // First, add the assistant's response (with tool_use blocks) to messages
      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        toolCallCount++
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }

      // Add tool results to messages
      messages.push({ role: 'user', content: toolResults })
    }

    // If we exhausted all rounds, return what we have
    const latencyMs = Date.now() - start
    const cost = calculateCost(MODEL, totalInputTokens, totalOutputTokens)

    logAgentUsage({
      model: MODEL,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs,
      toolCalls: toolCallCount,
    }).catch(() => {})

    return NextResponse.json({
      response:
        'I ran into some complexity answering that question. Could you try rephrasing or narrowing your request?',
      usage: {
        model: MODEL,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost: Math.round(cost * 1_000_000) / 1_000_000,
        tool_calls: toolCallCount,
        latency_ms: latencyMs,
      },
    })
  } catch (error) {
    console.error('Agent chat error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
