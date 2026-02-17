import Anthropic from '@anthropic-ai/sdk'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'
import { AGENT_TOOLS, executeTool, logAgentUsage } from '@/lib/agent-tools'
import { loadConversation, saveConversation } from './telegram/conversation-state'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HAIKU_MODEL = 'claude-3-5-haiku-20241022'
export const SONNET_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096
const MAX_TOOL_ROUNDS = 10
const ESCALATION_ROUND = 4

// Write tools that require sequential execution (confirmation flow)
export const WRITE_TOOLS = new Set(['draft_email', 'create_calendar_event', 'set_reminder'])

// Patterns that should start with Sonnet instead of Haiku
export const SONNET_PATTERNS = [
  /\b(analy[sz]e|compare|contrast|evaluate)\b/i,
  /\b(plan|strategy|strategi[cs]|roadmap)\b.*\b(quarter|year|month|project)\b/i,
  /\b(monthly|quarterly|annual|yearly)\s+(review|report|summary|update)\b/i,
  /\b(moon\s+cycle|lunar|astro)/i,
  /\b(review|assess)\s+(all|every|across)\b/i,
  /\band\b.*\band\b.*\band\b/i, // 3+ compound "and" clauses
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODEL ROUTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function selectModel(userMessage: string): string {
  for (const pattern of SONNET_PATTERNS) {
    if (pattern.test(userMessage)) return SONNET_MODEL
  }
  return HAIKU_MODEL
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USAGE INFO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface UsageInfo {
  model: string
  inputTokens: number
  outputTokens: number
  toolCalls: number
  latencyMs: number
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT LOOP — persistent state, parallel tools, smart model routing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function processAgentMessage(
  chatId: number,
  userMessage: string
): Promise<{ text: string; usage: UsageInfo }> {
  const start = Date.now()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const client = new Anthropic({ apiKey })

  // Load persistent conversation history from Supabase
  const history = await loadConversation(chatId)
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user' as const, content: userMessage },
  ]

  // Smart model routing — keyword-based initial selection
  let currentModel = selectModel(userMessage)

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let toolCallCount = 0
  const modelsUsed = new Set<string>()

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Mid-loop escalation: if Haiku hasn't resolved by ESCALATION_ROUND, switch to Sonnet
    if (round === ESCALATION_ROUND && currentModel === HAIKU_MODEL) {
      currentModel = SONNET_MODEL
      console.log(`[agent] Escalating to Sonnet at round ${round} for chat ${chatId}`)
    }

    modelsUsed.add(currentModel)

    const response = await client.messages.create({
      model: currentModel,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: AGENT_TOOLS,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === 'text'
      )
      const responseText = textBlocks.map((b) => b.text).join('\n') || 'No response generated.'

      const latencyMs = Date.now() - start
      const modelLabel = modelsUsed.size > 1
        ? `${HAIKU_MODEL}+${SONNET_MODEL}`
        : currentModel

      // Log usage (fire-and-forget)
      logAgentUsage({
        model: modelLabel,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs,
        toolCalls: toolCallCount,
      }).catch(() => {})

      // Save full Anthropic message format to Supabase (persistent)
      messages.push({ role: 'assistant', content: response.content })
      await saveConversation(chatId, messages)

      return {
        text: responseText,
        usage: {
          model: modelLabel,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          toolCalls: toolCallCount,
          latencyMs,
        },
      }
    }

    // Add assistant response with tool_use blocks
    messages.push({ role: 'assistant', content: response.content })

    // Execute tools — parallel for read-only, sequential if any write tool present
    const hasWriteTool = toolUseBlocks.some((t) => WRITE_TOOLS.has(t.name))

    let toolResults: Anthropic.ToolResultBlockParam[]
    if (hasWriteTool) {
      toolResults = []
      for (const toolUse of toolUseBlocks) {
        toolCallCount++
        const result = await executeTool(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          chatId
        )
        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result,
        })
      }
    } else {
      toolCallCount += toolUseBlocks.length
      toolResults = await Promise.all(
        toolUseBlocks.map(async (toolUse) => {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            chatId
          )
          return {
            type: 'tool_result' as const,
            tool_use_id: toolUse.id,
            content: result,
          }
        })
      )
    }
    messages.push({ role: 'user', content: toolResults })
  }

  // Save conversation even on exhaustion
  await saveConversation(chatId, messages)

  return {
    text: 'I ran into some complexity. Could you try rephrasing?',
    usage: {
      model: modelsUsed.size > 1 ? `${HAIKU_MODEL}+${SONNET_MODEL}` : HAIKU_MODEL,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      toolCalls: toolCallCount,
      latencyMs: Date.now() - start,
    },
  }
}
