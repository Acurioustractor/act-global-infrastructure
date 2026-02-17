import { Bot, Context, InputFile, GrammyError, HttpError } from 'grammy'
import { executeConfirmedAction } from '@/lib/agent-tools'
import { transcribeVoice, synthesizeSpeech, cycleVoice, getVoicePreference } from './voice'
import { clearConversation } from './conversation-state'
import { loadPendingAction, clearPendingAction } from './pending-action-state'
import { processAgentMessage } from '@/lib/agent-loop'
import { extractReceiptFromPhoto } from '@/lib/receipt-extractor'

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
      const agentResult = await processAgentMessage(ctx.chat.id, transcription)

      // Reply with both text and voice
      await sendResponse(ctx, agentResult.text, true)
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
      const agentResult = await processAgentMessage(ctx.chat.id, prompt)
      await sendResponse(ctx, agentResult.text, false)
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
      const agentResult = await processAgentMessage(ctx.chat.id, text)
      await sendResponse(ctx, agentResult.text, false)
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
