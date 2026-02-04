import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

import {
  sendDailyBriefing,
  checkGrantAlerts,
  checkFinanceAlerts,
  checkAndSendReminders,
  sendReflectionPrompt,
} from '@/lib/telegram/notifications'

// Cron-triggered notification endpoint
// Called by GitHub Actions or PM2 schedule
// ?type=daily | grants | finance | reminders | all

export async function GET(req: NextRequest) {
  // Simple auth — require a secret to prevent public triggering
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = req.nextUrl.searchParams.get('type') || 'all'
  const results: Record<string, unknown> = {}

  try {
    if (type === 'daily' || type === 'all') {
      results.daily = await sendDailyBriefing()
    }

    if (type === 'grants' || type === 'all') {
      results.grants = await checkGrantAlerts()
    }

    if (type === 'finance' || type === 'all') {
      results.finance = await checkFinanceAlerts()
    }

    if (type === 'reminders' || type === 'all') {
      results.reminders = await checkAndSendReminders()
    }

    // Reflection runs on its own schedule — NOT included in type=all
    if (type === 'reflection') {
      results.reflection = await sendReflectionPrompt()
    }

    return NextResponse.json({
      ok: true,
      type,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Notification error:', err)
    return NextResponse.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}
