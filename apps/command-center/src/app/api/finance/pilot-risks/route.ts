import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Pilot lifecycle risk items for the AT RISK TODAY pane on /finance/command.
 *
 * Pass 2B B6. Same staleness ladder as scripts/idea-board-reminders.mjs:
 *   idea 90d · scope 30d · fundraise 14d
 *
 * Severity (Q11):
 *   🟠 high   — scope 30d+ OR fundraise 14d+
 *   🟡 medium — snooze-burned (3 snoozes total — forced decision)
 *
 * Note: 'idea' staleness at 90d intentionally does NOT raise to AT RISK because
 * those are pre-scope hunches, not in-flight commitments. They surface in the
 * nightly reminder cron only.
 */

const STAGE_STALE_DAYS: Record<string, number> = {
  scope: 30,
  fundraise: 14,
}
const SNOOZE_LIMIT = 3

interface PilotRiskItem {
  id: string
  severity: 'high' | 'medium'
  stage: 'scope' | 'fundraise'
  text: string
  owner: string
  age_days: number
  snooze_count: number
  snooze_burned: boolean
  value_estimate: number
  href: string
}

export async function GET() {
  try {
    const now = new Date()

    const { data: rows, error } = await supabase
      .from('idea_board')
      .select('id, text, lifecycle_stage, owner, stage_entered_at, created_at, value_estimate, idea_snoozes(id, snoozed_until)')
      .in('lifecycle_stage', Object.keys(STAGE_STALE_DAYS))

    if (error) return NextResponse.json({ error: error.message, items: [] }, { status: 500 })

    const today = now.toISOString().slice(0, 10)
    const items: PilotRiskItem[] = []

    for (const r of rows ?? []) {
      const stage = r.lifecycle_stage as 'scope' | 'fundraise'
      const threshold = STAGE_STALE_DAYS[stage]
      if (!threshold) continue

      const stageStartedAt = r.stage_entered_at ?? r.created_at
      const ageDays = Math.floor((now.getTime() - new Date(stageStartedAt as string).getTime()) / (1000 * 60 * 60 * 24))

      const snoozes = (r.idea_snoozes ?? []) as Array<{ snoozed_until: string }>
      const snoozeCount = snoozes.length
      const snoozeBurned = snoozeCount >= SNOOZE_LIMIT
      const activeSnooze = snoozes.some((s) => s.snoozed_until > today)

      // Skip if actively snoozed (unless burned — burned always surfaces)
      if (activeSnooze && !snoozeBurned) continue

      const isStale = ageDays >= threshold

      if (!isStale && !snoozeBurned) continue

      items.push({
        id: r.id as string,
        severity: snoozeBurned ? 'medium' : 'high',
        stage,
        text: r.text as string,
        owner: (r.owner as string) ?? 'ben',
        age_days: ageDays,
        snooze_count: snoozeCount,
        snooze_burned: snoozeBurned,
        value_estimate: Number(r.value_estimate ?? 0),
        href: `/ideas?focus=${r.id}`,
      })
    }

    items.sort((a, b) => {
      // High before medium; within severity, oldest first
      if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1
      return b.age_days - a.age_days
    })

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      items,
      counters: {
        high: items.filter((i) => i.severity === 'high').length,
        medium: items.filter((i) => i.severity === 'medium').length,
        snooze_burned: items.filter((i) => i.snooze_burned).length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, items: [] }, { status: 500 })
  }
}
