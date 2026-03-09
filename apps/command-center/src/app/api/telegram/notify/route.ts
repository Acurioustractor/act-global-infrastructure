import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 30

import {
  sendDailyBriefing,
  checkGrantAlerts,
  checkGrantDeadlineAlerts,
  checkFinanceAlerts,
  checkAndSendReminders,
  sendReflectionPrompt,
  sendPreMeetingBriefings,
  sendPostMeetingPrompts,
  sendPostMeetingFallback,
  checkRelationshipNudges,
  sendWeeklyFinanceSummary,
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
    // Daily briefing now includes grants + finance sections inline
    if (type === 'daily' || type === 'all') {
      results.daily = await sendDailyBriefing()
    }

    // Grants and finance are still callable independently for manual triggers,
    // but NOT included in type=all (daily briefing covers them)
    if (type === 'grants') {
      results.grants = await checkGrantAlerts()
    }

    if (type === 'finance') {
      results.finance = await checkFinanceAlerts()
    }

    // Proactive grant deadline alerts (daily 6am)
    if (type === 'grant_deadlines') {
      results.grantDeadlines = await checkGrantDeadlineAlerts()
    }

    if (type === 'reminders' || type === 'all') {
      results.reminders = await checkAndSendReminders()
    }

    // Reflection runs on its own schedule — NOT included in type=all
    if (type === 'reflection') {
      results.reflection = await sendReflectionPrompt()
    }

    // Pre-meeting briefings (every 30 min)
    if (type === 'pre-meeting') {
      results.preMeeting = await sendPreMeetingBriefings()
    }

    // Post-meeting capture prompts (every 15 min)
    if (type === 'post-meeting') {
      results.postMeeting = await sendPostMeetingPrompts()
    }

    // Post-meeting fallback (daily 9pm — auto-create minimal records)
    if (type === 'post-meeting-fallback') {
      results.fallback = await sendPostMeetingFallback()
    }

    // Relationship nudges (part of daily, or standalone)
    if (type === 'relationship-nudges') {
      results.nudges = await checkRelationshipNudges()
    }

    // Weekly finance summary (Sunday evening)
    if (type === 'weekly-finance') {
      results.weeklyFinance = await sendWeeklyFinanceSummary()
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
