import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { calendarDaysUntil } from '@/lib/eofy/dates'
import { getEofyTrackerData } from '@/lib/eofy/notion-tracker'
import type {
  CriticalPathItem,
  EofyCommandConfig,
  EofyCommandResponse,
  EofyTask,
  Tone,
} from '@/lib/eofy/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO = path.resolve(process.cwd(), '..', '..')
const CONFIG_PATH = path.join(REPO, 'config', 'eofy-command.json')

function loadConfig(): EofyCommandConfig {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
}

function p0Open(tasks: EofyTask[] | undefined) {
  return (tasks ?? []).filter(t => !t.done && t.priority === 'P0').length
}

function computeDaysUntil(due: string | null, nowMs: number) {
  return calendarDaysUntil(due, nowMs)
}

function findTask(tasks: EofyTask[] | undefined, matchers: string[]) {
  if (!tasks?.length) return null
  const normalized = matchers.map(m => m.toLowerCase())
  return tasks.find(task => {
    const haystack = `${task.task} ${task.category} ${task.evidence} ${task.source}`.toLowerCase()
    return normalized.some(matcher => haystack.includes(matcher))
  }) ?? null
}

function toneFor(status: string, daysUntilDue: number | null, priority: string): Tone {
  if (status === 'Done') return 'good'
  if (status === 'Blocked') return 'bad'
  if (daysUntilDue != null && daysUntilDue < 0) return 'bad'
  if (priority === 'P0') return 'bad'
  if (status === 'Doing') return 'info'
  if (daysUntilDue != null && daysUntilDue <= 7) return 'warn'
  return 'default'
}

function enrichCriticalPath(config: EofyCommandConfig, tasks: EofyTask[] | undefined, nowMs: number): CriticalPathItem[] {
  return config.criticalPath.map(item => {
    const task = findTask(tasks, item.notionMatchers)
    const due = task?.due ?? item.due
    const daysUntilDue = task?.daysUntilDue ?? computeDaysUntil(due, nowMs)
    const priority = task?.priority ?? item.priority
    const status = task?.status || item.status || 'Open'
    return {
      id: item.id,
      step: item.step,
      owner: task?.owner && task.owner !== 'Unassigned' ? task.owner : item.owner,
      due,
      why: item.why,
      status,
      priority,
      category: task?.category ?? item.category ?? 'Command',
      tone: toneFor(status, daysUntilDue, priority),
      daysUntilDue,
      url: task?.url,
      sourceId: item.sourceId,
      confidence: item.confidence,
    }
  })
}

export async function GET() {
  const nowMs = Date.now()
  const [tracker, config] = await Promise.all([
    getEofyTrackerData(nowMs),
    Promise.resolve(loadConfig()),
  ])

  const metrics = config.metrics.map(metric => ({
    id: metric.id,
    label: metric.label,
    value:
      metric.dynamic === 'daysToCutover'
        ? String(tracker.daysToCutover)
        : metric.dynamic === 'p0Open'
          ? String(p0Open(tracker.tasks))
          : metric.value ?? 'n/a',
    detail: metric.detail,
    tone: metric.tone,
    confidence: metric.confidence,
    sourceId: metric.sourceId,
  }))

  const response: EofyCommandResponse = {
    generatedAt: new Date(nowMs).toISOString(),
    title: config.title,
    subtitle: config.subtitle,
    cutover: config.cutover,
    ptyStarts: config.ptyStarts,
    notionUrl: config.notionUrl,
    needsConnection: tracker.needsConnection,
    reason: tracker.reason,
    tracker: {
      totals: tracker.totals,
      byCategory: tracker.byCategory,
      byOwner: tracker.byOwner,
      byPriority: tracker.byPriority,
      tasks: tracker.tasks,
      burndown: tracker.burndown,
      forecastFinish: tracker.forecastFinish,
    },
    metrics,
    criticalPath: enrichCriticalPath(config, tracker.tasks, nowMs),
    decisions: config.decisions,
    moneyRoutes: config.moneyRoutes,
    moneyRunSheet: config.moneyRunSheet,
    rdWindow: config.rdWindow,
    entityMap: config.entityMap,
    sources: config.sources,
    disclaimer: config.disclaimer,
  }

  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } })
}
