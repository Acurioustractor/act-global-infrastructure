import { Bot, Context, InputFile, GrammyError, HttpError } from 'grammy'
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent-system-prompt'
import { AGENT_TOOLS, executeTool, logAgentUsage, calculateCost } from '@/lib/agent-tools'
import { transcribeVoice, synthesizeSpeech, cycleVoice, getVoicePreference } from './voice'

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MODEL = 'claude-3-5-haiku-20241022'
const MAX_TOKENS = 2048
const MAX_TOOL_ROUNDS = 5
const MAX_CONVERSATION_HISTORY = 10 // Keep last 10 exchanges per chat
const PENDING_ACTION_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ConversationEntry {
  role: 'user' | 'assistant'
  content: string
}

// In-memory conversation history (per chat)
const conversations = new Map<number, ConversationEntry[]>()

// Pending confirmations (per chat)
export interface PendingAction {
  description: string
  execute: () => Promise<string>
  expiresAt: number
}
const pendingActions = new Map<number, PendingAction>()

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

  // /clear command — reset conversation memory
  _bot.command('clear', async (ctx) => {
    if (!ctx.from || !isAuthorized(ctx.from.id)) return
    conversations.delete(ctx.chat.id)
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

    // Check for confirmation of pending action
    const pending = pendingActions.get(ctx.chat.id)
    if (pending && Date.now() < pending.expiresAt) {
      const lower = text.toLowerCase().trim()
      if (lower === 'yes' || lower === 'y' || lower === 'confirm' || lower === 'send') {
        pendingActions.delete(ctx.chat.id)
        await ctx.replyWithChatAction('typing')
        try {
          const result = await pending.execute()
          await ctx.reply(result)
        } catch (err) {
          await ctx.reply(`Failed: ${(err as Error).message}`)
        }
        return
      } else if (lower === 'no' || lower === 'n' || lower === 'cancel') {
        pendingActions.delete(ctx.chat.id)
        await ctx.reply('Cancelled.')
        return
      } else if (lower === 'edit') {
        pendingActions.delete(ctx.chat.id)
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
// AGENT LOOP (same pattern as /api/agent/chat)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function processMessage(chatId: number, userMessage: string): Promise<string> {
  const start = Date.now()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const client = new Anthropic({ apiKey })

  // Build messages from conversation history
  const history = conversations.get(chatId) || []
  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
    { role: 'user' as const, content: userMessage },
  ]

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let toolCallCount = 0

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
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

      // Log usage
      const latencyMs = Date.now() - start
      logAgentUsage({
        model: MODEL,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        latencyMs,
        toolCalls: toolCallCount,
      }).catch(() => {})

      // Update conversation history
      history.push({ role: 'user', content: userMessage })
      history.push({ role: 'assistant', content: responseText })

      // Trim to max history length
      while (history.length > MAX_CONVERSATION_HISTORY * 2) {
        history.shift()
      }
      conversations.set(chatId, history)

      return responseText
    }

    // Execute tools
    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
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
    messages.push({ role: 'user', content: toolResults })
  }

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTS for confirmation flow + notifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function setPendingAction(chatId: number, action: Omit<PendingAction, 'expiresAt'>) {
  pendingActions.set(chatId, {
    ...action,
    expiresAt: Date.now() + PENDING_ACTION_TTL_MS,
  })
}

export { conversations }
