import { NextRequest, NextResponse } from 'next/server'
import { getBot } from '@/lib/telegram/bot'

// Voice pipeline (download → transcribe → agent → TTS) needs more than default 10s
export const maxDuration = 60

// grammY webhook handler adapted for Next.js App Router
const handler = async (req: NextRequest) => {
  // Verify webhook secret (Telegram sends this header when secret_token is set in setWebhook)
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  if (expectedSecret && secret !== expectedSecret) {
    console.error('Webhook auth failed — header:', secret?.slice(0, 8), 'expected:', expectedSecret?.slice(0, 8))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bot = getBot()
    await bot.init()
    const body = await req.json()

    await bot.handleUpdate(body)

    return NextResponse.json({ ok: true })
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
