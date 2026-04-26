import Anthropic from '@anthropic-ai/sdk'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'
import { executeTool, logAgentUsage } from '@/lib/agent-tools'
import { getToolsForMode, detectMode, type ToolMode } from '@/lib/tool-definitions'
import { loadConversation, saveConversation } from './telegram/conversation-state'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HAIKU_MODEL = 'claude-haiku-4-5'
export const SONNET_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 4096
const MAX_TOOL_ROUNDS = 10
const ESCALATION_ROUND = 4

// Write tools that require sequential execution (confirmation flow)
export const WRITE_TOOLS = new Set(['draft_email', 'create_calendar_event', 'set_reminder', 'draft_grant_response'])

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

  // Mode-based tool selection — auto-detect from user message
  let currentMode: ToolMode = detectMode(userMessage)
  let activeTools = getToolsForMode(currentMode)
  if (currentMode !== 'core') {
    console.log(`[agent] Auto-detected mode: ${currentMode} for chat ${chatId}`)
  }

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
      tools: activeTools,
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

    // Handle route_to_mode meta-tool FIRST — switch active tool set before executing other tools
    const validModes: ToolMode[] = ['core', 'finance', 'projects', 'writing', 'actions']
    const modeSwitch = toolUseBlocks.find(t => t.name === 'route_to_mode')
    if (modeSwitch) {
      const input = modeSwitch.input as { mode: string; reason?: string }
      if (validModes.includes(input.mode as ToolMode)) {
        currentMode = input.mode as ToolMode
        activeTools = getToolsForMode(currentMode)
        console.log(`[agent] Mode switched to: ${currentMode} (${input.reason || 'no reason'}) for chat ${chatId}`)
      } else {
        console.error(`[agent] Invalid mode requested: ${input.mode} for chat ${chatId}`)
      }
      toolCallCount++
    }

    // Separate real tools from the mode switch
    const realTools = toolUseBlocks.filter(t => t.name !== 'route_to_mode')

    // If mode switch was the only tool, return its result and continue to next round
    if (realTools.length === 0 && modeSwitch) {
      messages.push({ role: 'user', content: [{
        type: 'tool_result',
        tool_use_id: modeSwitch.id,
        content: validModes.includes((modeSwitch.input as { mode: string }).mode as ToolMode)
          ? `Switched to ${currentMode} mode. You now have ${activeTools.length} tools available.`
          : `Invalid mode. Valid modes: ${validModes.join(', ')}`,
      }] })
      continue
    }

    // Build tool results — mode switch result first (if present), then real tools
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    if (modeSwitch) {
      toolResults.push({
        type: 'tool_result',
        tool_use_id: modeSwitch.id,
        content: `Switched to ${currentMode} mode. You now have ${activeTools.length} tools available.`,
      })
    }

    // Execute real tools — parallel for read-only, sequential if any write tool present
    const hasWriteTool = realTools.some((t) => WRITE_TOOLS.has(t.name))

    if (hasWriteTool) {
      for (const toolUse of realTools) {
        toolCallCount++
        try {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            chatId
          )
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result })
        } catch (error) {
          console.error(`[agent] Tool ${toolUse.name} failed for chat ${chatId}:`, error)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
          })
        }
      }
    } else {
      toolCallCount += realTools.length
      const parallelResults = await Promise.all(
        realTools.map(async (toolUse) => {
          try {
            const result = await executeTool(
              toolUse.name,
              toolUse.input as Record<string, unknown>,
              chatId
            )
            return { type: 'tool_result' as const, tool_use_id: toolUse.id, content: result }
          } catch (error) {
            console.error(`[agent] Tool ${toolUse.name} failed for chat ${chatId}:`, error)
            return {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
            }
          }
        })
      )
      toolResults.push(...parallelResults)
    }
    messages.push({ role: 'user', content: toolResults })
  }

  // Save conversation even on exhaustion — include the failure message
  const exhaustionText = 'I ran into some complexity. Could you try rephrasing?'
  messages.push({ role: 'assistant', content: [{ type: 'text', text: exhaustionText }] })
  await saveConversation(chatId, messages)

  return {
    text: exhaustionText,
    usage: {
      model: modelsUsed.size > 1 ? `${HAIKU_MODEL}+${SONNET_MODEL}` : HAIKU_MODEL,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      toolCalls: toolCallCount,
      latencyMs: Date.now() - start,
    },
  }
}
