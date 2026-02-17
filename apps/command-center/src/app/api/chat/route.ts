import { NextRequest, NextResponse } from 'next/server'
import { processAgentMessage } from '@/lib/agent-loop'
import { extractReceiptFromPhoto } from '@/lib/receipt-extractor'
import { transcribeVoice } from '@/lib/telegram/voice'
import { executeConfirmedAction, calculateCost } from '@/lib/agent-tools'
import { loadPendingAction, clearPendingAction } from '@/lib/telegram/pending-action-state'

// Web chat uses a dedicated chat ID range to avoid collision with Telegram
const WEB_CHAT_ID = 999999

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, audio, image, chatId } = body as {
      message?: string
      audio?: string // base64
      image?: string // base64
      chatId?: number
    }

    const effectiveChatId = chatId ?? WEB_CHAT_ID

    // Determine the user message
    let userMessage = message || ''
    let transcription: string | undefined

    // Handle voice: decode base64 audio → transcribe
    if (audio) {
      const buffer = Buffer.from(audio, 'base64')
      transcription = await transcribeVoice(buffer)
      userMessage = transcription
    }

    // Handle photo: extract receipt details
    if (image) {
      const extracted = await extractReceiptFromPhoto(image, userMessage || '')
      if (extracted) {
        userMessage = `Add a receipt: vendor="${extracted.vendor}", amount=${extracted.amount}, date="${extracted.date}"${extracted.category ? `, category="${extracted.category}"` : ''}${userMessage ? `, notes="${userMessage}"` : ''}`
      } else {
        return NextResponse.json({
          response: "I couldn't identify receipt details from that photo. Try a clearer photo, or tell me the details: vendor, amount, and date.",
        })
      }
    }

    if (!userMessage) {
      return NextResponse.json({ error: 'No message, audio, or image provided' }, { status: 400 })
    }

    // Check for pending action confirmation
    const pending = await loadPendingAction(effectiveChatId)
    if (pending) {
      const lower = userMessage.toLowerCase().trim()
      if (lower === 'yes' || lower === 'y' || lower === 'confirm' || lower === 'send') {
        await clearPendingAction(effectiveChatId)
        try {
          const result = await executeConfirmedAction(pending.action)
          return NextResponse.json({ response: result })
        } catch (err) {
          return NextResponse.json({ response: `Failed: ${(err as Error).message}` })
        }
      } else if (lower === 'no' || lower === 'n' || lower === 'cancel') {
        await clearPendingAction(effectiveChatId)
        return NextResponse.json({ response: 'Cancelled.' })
      } else if (lower === 'edit') {
        await clearPendingAction(effectiveChatId)
        return NextResponse.json({ response: "Cancelled. Tell me what to change and I'll prepare a new version." })
      }
    }

    // Process through shared agent loop
    const result = await processAgentMessage(effectiveChatId, userMessage)

    // Check for pending action after processing
    const newPending = await loadPendingAction(effectiveChatId)

    const cost = calculateCost(
      result.usage.model,
      result.usage.inputTokens,
      result.usage.outputTokens
    )

    return NextResponse.json({
      response: result.text,
      transcription,
      usage: {
        model: result.usage.model,
        input_tokens: result.usage.inputTokens,
        output_tokens: result.usage.outputTokens,
        cost: Math.round(cost * 1_000_000) / 1_000_000,
        tool_calls: result.usage.toolCalls,
        latency_ms: result.usage.latencyMs,
      },
      pendingAction: newPending ? { description: newPending.description } : undefined,
    })
  } catch (error) {
    console.error('Web chat error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process request' },
      { status: 500 }
    )
  }
}
