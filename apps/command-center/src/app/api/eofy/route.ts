import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO = path.resolve(process.cwd(), '..', '..')
const NOTION_DB_IDS_PATH = path.join(REPO, 'config', 'notion-database-ids.json')

// FY26 cutover: sole trader stops, A Curious Tractor Pty Ltd starts trading 1 July.
const CUTOVER = '2026-06-30'
const MS_PER_DAY = 1000 * 60 * 60 * 24

interface EofyTask {
  id: string
  task: string
  category: string
  status: string
  owner: string
  priority: string
  due: string | null
  doneDate: string | null
  daysUntilDue: number | null
  overdue: boolean
  blocked: boolean
  done: boolean
  evidence: string
  source: string
  url: string
}

interface BurndownPoint {
  date: string
  ideal: number | null
  actual: number | null
  projected: number | null
}

function loadNotionDbIds(): { eofyTracker?: string; eofyTrackerDataSource?: string } {
  try {
    return JSON.parse(readFileSync(NOTION_DB_IDS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function getText(prop: any): string {
  if (!prop) return ''
  if (prop.type === 'title') return (prop.title ?? []).map((t: any) => t.plain_text ?? '').join('')
  if (prop.type === 'rich_text') return (prop.rich_text ?? []).map((t: any) => t.plain_text ?? '').join('')
  if (prop.type === 'select') return prop.select?.name ?? ''
  return ''
}

function getDate(prop: any): string | null {
  if (!prop || prop.type !== 'date') return null
  return prop.date?.start ?? null
}

function priorityWeight(p: string): number {
  switch (p) {
    case 'P0': return 0
    case 'P1': return 1
    case 'P2': return 2
    default: return 3
  }
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Build a daily ideal/actual/projected burndown from start → cutover. */
function buildBurndown(tasks: EofyTask[], nowMs: number): { burndown: BurndownPoint[]; forecastFinish: string | null } {
  const total = tasks.length
  const cutoverMs = new Date(CUTOVER + 'T23:59:59Z').getTime()

  // Chart starts the earlier of today and any recorded Done date (so early progress shows).
  const doneMsList = tasks
    .map(t => (t.doneDate ? new Date(t.doneDate + 'T00:00:00Z').getTime() : null))
    .filter((v): v is number => v != null)
  const startMs = Math.min(nowMs, ...(doneMsList.length ? doneMsList : [nowMs]))
  const startDay = new Date(dayKey(startMs) + 'T00:00:00Z').getTime()

  const span = Math.max(1, cutoverMs - startDay)
  const remainingAt = (ms: number) => total - doneMsList.filter(d => d <= ms).length
  const remainingNow = remainingAt(nowMs)

  // Burn rate so far (done per day); used to project the finish line forward.
  const daysElapsed = Math.max(1, (nowMs - startDay) / MS_PER_DAY)
  const burnRate = (total - remainingNow) / daysElapsed // tasks completed per day
  let forecastFinish: string | null = null
  if (burnRate > 0) {
    forecastFinish = dayKey(nowMs + (remainingNow / burnRate) * MS_PER_DAY)
  }

  const burndown: BurndownPoint[] = []
  for (let ms = startDay; ms <= cutoverMs; ms += MS_PER_DAY) {
    const t = (ms - startDay) / span
    const ideal = Math.max(0, Math.round((total * (1 - t)) * 10) / 10)
    const isPastOrToday = ms <= nowMs
    const actual = isPastOrToday ? remainingAt(ms) : null
    let projected: number | null = null
    if (ms >= nowMs) {
      projected = burnRate > 0
        ? Math.max(0, Math.round((remainingNow - burnRate * ((ms - nowMs) / MS_PER_DAY)) * 10) / 10)
        : remainingNow // no completions yet → flat line (honest: not burning down)
    }
    burndown.push({ date: dayKey(ms), ideal, actual, projected })
  }
  return { burndown, forecastFinish }
}

export async function GET() {
  const notionToken = process.env.NOTION_TOKEN
  const now = Date.now()
  const cutoverMs = new Date(CUTOVER + 'T23:59:59Z').getTime()
  const daysToCutover = Math.ceil((cutoverMs - now) / MS_PER_DAY)

  const base = {
    generatedAt: new Date().toISOString(),
    cutover: CUTOVER,
    daysToCutover,
    weeksToCutover: Math.round((daysToCutover / 7) * 10) / 10,
  }

  if (!notionToken) {
    return NextResponse.json({ ...base, needsConnection: true, reason: 'NOTION_TOKEN not set' }, { status: 200 })
  }

  const ids = loadNotionDbIds()
  const dataSourceId = ids.eofyTrackerDataSource
  if (!dataSourceId) {
    return NextResponse.json({ ...base, needsConnection: true, reason: 'eofyTrackerDataSource not in config' }, { status: 200 })
  }

  const notion = new Client({ auth: notionToken })

  let allRows: any[] = []
  try {
    let cursor: string | undefined
    let pages = 0
    do {
      const res = await (notion as any).dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        start_cursor: cursor,
      })
      allRows = allRows.concat(res.results)
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
      if (++pages > 20) break
    } while (cursor)
  } catch (err: any) {
    // Integration not yet shared with the DB, or transient Notion error.
    const code = err?.code ?? err?.body?.code
    return NextResponse.json(
      {
        ...base,
        needsConnection: code === 'object_not_found',
        reason:
          code === 'object_not_found'
            ? 'The EOFY Setup Tracker database is not shared with the command-center Notion integration. Open the database in Notion → ••• → Connections → add the integration, then reload.'
            : (err?.message ?? 'Notion query failed'),
      },
      { status: 200 },
    )
  }

  const tasks: EofyTask[] = allRows.map((p: any) => {
    const props = p.properties ?? {}
    const due = getDate(props.Due)
    const dueMs = due ? new Date(due + 'T23:59:59Z').getTime() : null
    const daysUntilDue = dueMs != null ? Math.ceil((dueMs - now) / MS_PER_DAY) : null
    const status = getText(props.Status)
    const done = status === 'Done'
    return {
      id: p.id,
      task: getText(props.Task),
      category: getText(props.Category) || 'Uncategorised',
      status,
      owner: getText(props.Owner) || 'Unassigned',
      priority: getText(props.Priority) || 'P2',
      due,
      doneDate: getDate(props['Done date']),
      daysUntilDue,
      overdue: !done && daysUntilDue != null && daysUntilDue < 0,
      blocked: status === 'Blocked',
      done,
      evidence: getText(props.Evidence),
      source: getText(props.Source),
      url: p.url,
    }
  })

  const open = tasks.filter(t => !t.done)
  const doneCount = tasks.length - open.length
  const totals = {
    total: tasks.length,
    open: open.length,
    doing: tasks.filter(t => t.status === 'Doing').length,
    blocked: tasks.filter(t => t.blocked && !t.done).length,
    done: doneCount,
    overdue: open.filter(t => t.overdue).length,
    pctComplete: tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0,
  }

  const categories = Array.from(new Set(tasks.map(t => t.category)))
  const byCategory = categories
    .map(category => {
      const rs = tasks.filter(t => t.category === category)
      return {
        category,
        total: rs.length,
        open: rs.filter(t => !t.done).length,
        done: rs.filter(t => t.done).length,
        overdue: rs.filter(t => t.overdue).length,
      }
    })
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)

  const owners = Array.from(new Set(open.map(t => t.owner)))
  const byOwner = owners
    .map(owner => ({
      owner,
      open: open.filter(t => t.owner === owner).length,
      overdue: open.filter(t => t.owner === owner && t.overdue).length,
    }))
    .sort((a, b) => b.overdue - a.overdue || b.open - a.open)

  const byPriority = ['P0', 'P1', 'P2'].map(priority => ({
    priority,
    open: open.filter(t => t.priority === priority).length,
    overdue: open.filter(t => t.priority === priority && t.overdue).length,
  }))

  const sortOpen = (a: EofyTask, b: EofyTask) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    const pDiff = priorityWeight(a.priority) - priorityWeight(b.priority)
    if (pDiff !== 0) return pDiff
    const aDue = a.due ?? '9999-12-31'
    const bDue = b.due ?? '9999-12-31'
    return aDue.localeCompare(bDue)
  }

  const atRisk = open.filter(t => t.overdue || t.priority === 'P0').sort(sortOpen)
  const allOpen = [...open].sort(sortOpen)

  const { burndown, forecastFinish } = buildBurndown(tasks, now)

  return NextResponse.json(
    { ...base, totals, byCategory, byOwner, byPriority, atRisk, allOpen, tasks, burndown, forecastFinish },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
