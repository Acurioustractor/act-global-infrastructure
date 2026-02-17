import { Bot, Context, InputFile, GrammyError, HttpError } from 'grammy'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'
import { AGENT_TOOLS, executeTool, executeConfirmedAction, logAgentUsage } from '@/lib/agent-tools'
import { transcribeVoice, synthesizeSpeech, cycleVoice, getVoicePreference } from './voice'
import { loadConversation, saveConversation, clearConversation } from './conversation-state'
import { loadPendingAction, clearPendingAction } from './pending-action-state'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HAIKU_MODEL = 'claude-3-5-haiku-20241022'
const SONNET_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096
const MAX_TOOL_ROUNDS = 10
const ESCALATION_ROUND = 4 // Switch to Sonnet if Haiku hasn't resolved by this round

// Write tools that require sequential execution (confirmation flow)
const WRITE_TOOLS = new Set(['draft_email', 'create_calendar_event', 'set_reminder'])

// Patterns that should start with Sonnet instead of Haiku
const SONNET_PATTERNS = [
  /\b(analy[sz]e|compare|contrast|evaluate)\b/i,
  /\b(plan|strategy|strategi[cs]|roadmap)\b.*\b(quarter|year|month|project)\b/i,
  /\b(monthly|quarterly|annual|yearly)\s+(review|report|summary|update)\b/i,
  /\b(moon\s+cycle|lunar|astro)/i,
  /\b(review|assess)\s+(all|every|across)\b/i,
  /\band\b.*\band\b.*\band\b/i, // 3+ compound "and" clauses
]

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AUTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAuthorizedUsers(): Set<number> {
  const raw = process.env.TELEGRAM_AUTHORIZED_USERS || ''
  return new Set(
    raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))
  )
}

function isAuthorized(userId: number): boolean {
  const authorized = getAuthorizedUsers()
  return authorized.size === 0 || authorized.has(userId)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MODEL ROUTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function selectModel(userMessage: string): string {
  for (const pattern of SONNET_PATTERNS) {
    if (pattern.test(userMessage)) return SONNET_MODEL
  }
  return HAIKU_MODEL
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BOT INSTANCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _bot: Bot | null = null

export function getBot(): Bot {
  if (_bot) return _bot

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured')

  _bot = new Bot(token)

  // /start command
  _bot.command('start', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) {
      await ctx.reply('Unauthorised.')
      return
    }
    await ctx.reply(
      "G'day! I'm the ACT Business Agent. Send me a voice message or text to query contacts, projects, calendar, financials — anything in the system.\n\n" +
        'Commands:\n' +
        '/voice — cycle TTS voice\n' +
        '/clear — reset conversation\n\n' +
        'Try:\n' +
        '- "What\'s on my calendar today?"\n' +
        '- "Who needs follow-up?"\n' +
        '- "Give me a JusticeHub update"\n' +
        '- "Draft an email to [name] about [topic]"\n' +
        '- "Remind me to exercise at 6am every day"\n' +
        '- Send a photo of a receipt to log it'
    )
  })

  // /clear command — reset conversation memory (now Supabase-backed)
  _bot.command('clear', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) return
    await clearConversation(ctx.chat.id)
    await ctx.reply('Conversation cleared. Fresh start.')
  })

  // /voice command — cycle TTS voice
  _bot.command('voice', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) return
    const result = cycleVoice(ctx.chat.id)
    const pref = getVoicePreference(ctx.chat.id)
    const googleAvailable = !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    await ctx.reply(
      `Voice switched to: ${result.label}\n` +
        `Provider: ${pref.provider}${!googleAvailable && pref.provider === 'openai' ? ' (Google TTS not configured)' : ''}`
    )
  })

  // Voice messages
  _bot.on('message:voice', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) {
      await ctx.reply('Unauthorised.')
      return
    }

    await ctx.replyWithChatAction('typing')

    try {
      // Download voice file from Telegram
      const file = await ctx.getFile()
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`
      const response = await fetch(fileUrl)
      const buffer = Buffer.from(await response.arrayBuffer())

      // Transcribe
      const transcription = await transcribeVoice(buffer)

      // Show what was heard
      await ctx.reply(`"${transcription}"`)
      await ctx.replyWithChatAction('typing')

      // Process through agent
      const agentResponse = await processMessage(ctx.chat.id, transcription)

      // Reply with both text and voice
      await sendResponse(ctx, agentResponse, true)
    } catch (err) {
      console.error('Voice processing error:', err)
      await ctx.reply(`Error: ${(err as Error).message}`)
    }
  })

  // Photo messages — receipt capture
  _bot.on('message:photo', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) {
      await ctx.reply('Unauthorised.')
      return
    }

    await ctx.replyWithChatAction('typing')

    try {
      // Get the largest photo (last in array)
      const photos = ctx.message.photo
      const largest = photos[photos.length - 1]
      const file = await ctx.api.getFile(largest.file_id)
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`

      // Download the photo
      const response = await fetch(fileUrl)
      const buffer = Buffer.from(await response.arrayBuffer())
      const base64Image = buffer.toString('base64')

      // Extract receipt details with GPT-4o vision
      const caption = ctx.message.caption || ''
      const extracted = await extractReceiptFromPhoto(base64Image, caption)

      if (!extracted) {
        await ctx.reply("I couldn't identify receipt details from that photo. Try a clearer photo, or tell me the details: vendor, amount, and date.")
        return
      }

      // Ask agent to add the receipt
      const prompt = `Add a receipt: vendor="${extracted.vendor}", amount=${extracted.amount}, date="${extracted.date}"${extracted.category ? `, category="${extracted.category}"` : ''}${caption ? `, notes="${caption}"` : ''}`
      const agentResponse = await processMessage(ctx.chat.id, prompt)
      await sendResponse(ctx, agentResponse, false)
    } catch (err) {
      console.error('Photo processing error:', err)
      await ctx.reply(`Error processing photo: ${(err as Error).message}`)
    }
  })

  // Text messages
  _bot.on('message:text', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) {
      await ctx.reply('Unauthorised.')
      return
    }

    const text = ctx.message.text

    // Check for confirmation of pending action (Supabase-backed)
    const pending = await loadPendingAction(ctx.chat.id)
    if (pending) {
      const lower = text.toLowerCase().trim()
      if (lower === 'yes' || lower === 'y' || lower === 'confirm' || lower === 'send') {
        await clearPendingAction(ctx.chat.id)
        await ctx.replyWithChatAction('typing')
        try {
          const result = await executeConfirmedAction(pending.action)
          await ctx.reply(result)
        } catch (err) {
          await ctx.reply(`Failed: ${(err as Error).message}`)
        }
        return
      } else if (lower === 'no' || lower === 'n' || lower === 'cancel') {
        await clearPendingAction(ctx.chat.id)
        await ctx.reply('Cancelled.')
        return
      } else if (lower === 'edit') {
        await clearPendingAction(ctx.chat.id)
        await ctx.reply('Cancelled. Tell me what to change and I\'ll prepare a new version.')
        return
      }
    }

    await ctx.replyWithChatAction('typing')

    try {
      const agentResponse = await processMessage(ctx.chat.id, text)
      await sendResponse(ctx, agentResponse, false)
    } catch (err) {
      console.error('Text processing error:', err)
      await ctx.reply(`Error: ${(err as Error).message}`)
    }
  })

  // Error handler
  _bot.catch((err) => {
    const e = err.error
    if (e instanceof GrammyError) {
      console.error('Telegram API error:', e.description)
    } else if (e instanceof HttpError) {
      console.error('Network error:', e)
    } else {
      console.error('Bot error:', e)
    }
  })

  return _bot
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECEIPT PHOTO EXTRACTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ExtractedReceipt {
  vendor: string
  amount: number
  date: string
  category?: string
}

async function extractReceiptFromPhoto(base64Image: string, caption: string): Promise<ExtractedReceipt | null> {
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract receipt details from this image. Return ONLY valid JSON with these fields:
- vendor: string (store/company name)
- amount: number (total amount in AUD)
- date: string (YYYY-MM-DD format)
- category: string (one of: travel, supplies, food, subscription, utilities, other)

If you cannot identify receipt details, return null.${caption ? `\nUser caption: "${caption}"` : ''}`,
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
        ],
      },
    ],
    max_tokens: 200,
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text || text === 'null') return null

  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENT LOOP — persistent state, parallel tools, smart model routing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function processMessage(chatId: number, userMessage: string): Promise<string> {
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

      // Log usage (per-model tracking via modelsUsed)
      const latencyMs = Date.now() - start
      const modelLabel = modelsUsed.size > 1
        ? `${HAIKU_MODEL}+${SONNET_MODEL}`
        : currentModel
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

      return responseText
    }

    // Add assistant response with tool_use blocks
    messages.push({ role: 'assistant', content: response.content })

    // Execute tools — parallel for read-only, sequential if any write tool present
    const hasWriteTool = toolUseBlocks.some((t) => WRITE_TOOLS.has(t.name))

    let toolResults: Anthropic.ToolResultBlockParam[]
    if (hasWriteTool) {
      // Sequential execution for write tools
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
      // Parallel execution for read-only tools
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

  return 'I ran into some complexity. Could you try rephrasing?'
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESPONSE HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function sendResponse(ctx: Context, text: string, includeVoice: boolean) {
  // Split long text messages (Telegram limit is 4096 chars)
  const chunks = splitMessage(text, 4000)

  for (const chunk of chunks) {
    await ctx.reply(chunk)
  }

  // Send voice response
  if (includeVoice) {
    try {
      const audioBuffer = await synthesizeSpeech(text, ctx.chat?.id)
      await ctx.replyWithVoice(new InputFile(audioBuffer, 'response.ogg'))
    } catch (err) {
      console.error('TTS error (text reply already sent):', err)
    }
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining)
      break
    }

    // Find a good split point (newline or space)
    let splitAt = remaining.lastIndexOf('\n', maxLength)
    if (splitAt < maxLength * 0.5) {
      splitAt = remaining.lastIndexOf(' ', maxLength)
    }
    if (splitAt < maxLength * 0.3) {
      splitAt = maxLength
    }

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trimStart()
  }

  return chunks
}
