import { NextResponse } from 'next/server'
import { Client } from '@notionhq/client'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO = path.resolve(process.cwd(), '..', '..')
const NOTION_DB_IDS_PATH = path.join(REPO, 'config', 'notion-database-ids.json')

interface ActionRow {
  id: string
  name: string
  description: string
  status: string
  owner: string
  priority: string
  source: string
  due: string | null
  daysUntilDue: number | null
  overdue: boolean
  url: string
  createdAt: string
  linkedDecisions: string[] // page IDs
}

interface Response {
  generatedAt: string
  totals: {
    total: number
    open: number
    blocked: number
    done: number
    overdue: number
  }
  ownerRollup: Array<{ owner: string; total: number; open: number; blocked: number; overdue: number }>
  priorityRollup: Array<{ priority: string; open: number }>
  byOwner: Record<string, ActionRow[]>
  allOpen: ActionRow[]
}

function loadNotionDbIds(): { actionItems?: string; actionItemsDataSource?: string } {
  try {
    return JSON.parse(readFileSync(NOTION_DB_IDS_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function getText(prop: any): string {
  if (!prop) return ''
  if (prop.type === 'title') {
    return (prop.title ?? []).map((t: any) => t.plain_text ?? '').join('')
  }
  if (prop.type === 'rich_text') {
    return (prop.rich_text ?? []).map((t: any) => t.plain_text ?? '').join('')
  }
  if (prop.type === 'select') {
    return prop.select?.name ?? ''
  }
  return ''
}

function getDate(prop: any): string | null {
  if (!prop || prop.type !== 'date') return null
  return prop.date?.start ?? null
}

function getRelation(prop: any): string[] {
  if (!prop || prop.type !== 'relation') return []
  return (prop.relation ?? []).map((r: any) => r.id)
}

function priorityWeight(p: string): number {
  switch (p) {
    case 'Critical':
      return 0
    case 'High':
      return 1
    case 'Medium':
      return 2
    case 'Low':
      return 3
    default:
      return 4
  }
}

function statusWeight(s: string): number {
  switch (s) {
    case 'Blocked':
      return 0
    case 'Doing':
      return 1
    case 'To do':
      return 2
    case 'Done':
      return 3
    case 'Cancelled':
      return 4
    default:
      return 5
  }
}

export async function GET() {
  const notionToken = process.env.NOTION_TOKEN
  if (!notionToken) {
    return NextResponse.json({ error: 'NOTION_TOKEN not set' }, { status: 503 })
  }

  const ids = loadNotionDbIds()
  const dataSourceId = ids.actionItemsDataSource
  if (!dataSourceId) {
    return NextResponse.json(
      { error: 'actionItemsDataSource not found in config/notion-database-ids.json' },
      { status: 503 },
    )
  }

  const notion = new Client({ auth: notionToken })

  let allRows: any[] = []
  let cursor: string | undefined
  let pages = 0
  do {
    // Notion SDK v5: dataSources.query (databases.query was removed).
    const res = await (notion as any).dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100,
      start_cursor: cursor,
    })
    allRows = allRows.concat(res.results)
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
    pages++
    if (pages > 20) break // safety
  } while (cursor)

  const now = Date.now()
  const rows: ActionRow[] = allRows.map((p: any) => {
    const props = p.properties ?? {}
    const due = getDate(props.Due)
    const dueMs = due ? new Date(due + 'T23:59:59Z').getTime() : null
    const daysUntilDue =
      dueMs != null ? Math.ceil((dueMs - now) / (1000 * 60 * 60 * 24)) : null
    const status = getText(props.Status)
    const isOpen = status !== 'Done' && status !== 'Cancelled'
    return {
      id: p.id,
      name: getText(props.Name),
      description: getText(props.Description),
      status,
      owner: getText(props.Owner) || 'Unassigned',
      priority: getText(props.Priority) || 'Medium',
      source: getText(props.Source) || '',
      due,
      daysUntilDue,
      overdue: isOpen && daysUntilDue != null && daysUntilDue < 0,
      url: p.url,
      createdAt: p.created_time,
      linkedDecisions: getRelation(props['Linked Decision']),
    }
  })

  const allOpen = rows
    .filter(r => r.status !== 'Done' && r.status !== 'Cancelled')
    .sort((a, b) => {
      // Overdue first, then by priority, then by status, then by due date
      if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
      const pDiff = priorityWeight(a.priority) - priorityWeight(b.priority)
      if (pDiff !== 0) return pDiff
      const sDiff = statusWeight(a.status) - statusWeight(b.status)
      if (sDiff !== 0) return sDiff
      const aDue = a.due ?? '9999-12-31'
      const bDue = b.due ?? '9999-12-31'
      return aDue.localeCompare(bDue)
    })

  const owners = Array.from(new Set(allOpen.map(r => r.owner)))
  const byOwner: Record<string, ActionRow[]> = {}
  for (const owner of owners) {
    byOwner[owner] = allOpen.filter(r => r.owner === owner)
  }

  const ownerRollup = owners
    .map(owner => {
      const rs = rows.filter(r => r.owner === owner)
      const open = rs.filter(r => r.status !== 'Done' && r.status !== 'Cancelled')
      return {
        owner,
        total: rs.length,
        open: open.length,
        blocked: rs.filter(r => r.status === 'Blocked').length,
        overdue: open.filter(r => r.overdue).length,
      }
    })
    .sort((a, b) => b.open - a.open)

  const priorityOrder = ['Critical', 'High', 'Medium', 'Low']
  const priorityRollup = priorityOrder.map(p => ({
    priority: p,
    open: allOpen.filter(r => r.priority === p).length,
  }))

  const totals = rows.reduce(
    (acc, r) => {
      acc.total++
      if (r.status === 'Done') acc.done++
      else if (r.status === 'Cancelled') acc.done++
      else {
        acc.open++
        if (r.status === 'Blocked') acc.blocked++
        if (r.overdue) acc.overdue++
      }
      return acc
    },
    { total: 0, open: 0, blocked: 0, done: 0, overdue: 0 },
  )

  const response: Response = {
    generatedAt: new Date().toISOString(),
    totals,
    ownerRollup,
    priorityRollup,
    byOwner,
    allOpen,
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
