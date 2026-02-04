import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { getBot } from '@/lib/telegram/bot'

// Voice pipeline (download → transcribe → agent → TTS) needs more than default 10s
export const maxDuration = 60

// grammY webhook handler adapted for Next.js App Router
const handler = async (req: NextRequest) => {
  // Verify webhook secret
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bot = getBot()
    const body = await req.json()

    // Use grammY's built-in webhook handling
    const handleUpdate = webhookCallback(bot, 'std/http', {
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    })

    // Build a standard Request for grammY
    const grammyReq = new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify(body),
    })

    const response = await handleUpdate(grammyReq)
    return new NextResponse(response.body, {
      status: response.status,
      headers: response.headers,
    })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    // Return 200 to prevent Telegram from retrying
    return NextResponse.json({ ok: true, error: (err as Error).message })
  }
}

export const POST = handler

// Health check for webhook setup
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    bot: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'missing token',
    webhook: 'active',
  })
}
