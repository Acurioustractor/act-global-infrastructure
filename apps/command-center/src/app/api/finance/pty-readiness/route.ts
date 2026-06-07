import { NextResponse } from 'next/server'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REPO = path.resolve(process.cwd(), '..', '..')
const CONFIG_PATH = path.join(REPO, 'config', 'pty-readiness.json')

type Status = 'done' | 'doing' | 'todo' | 'blocked'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type Category =
  | 'registration'
  | 'banking'
  | 'insurance'
  | 'payroll'
  | 'bookkeeping'
  | 'ip'
  | 'operations'

interface Item {
  id: string
  label: string
  category: Category
  owner: string
  priority: Priority
  due: string
  status: Status
  evidence?: string
}

interface ConfigFile {
  entity: string
  cutover_date: string
  items: Item[]
}

interface CategoryRollup {
  category: Category
  total: number
  done: number
  pct: number
  blocked: number
}

interface Response {
  generatedAt: string
  entity: string
  cutoverDate: string
  daysToCutover: number
  totals: {
    total: number
    done: number
    doing: number
    todo: number
    blocked: number
    pct: number
  }
  critical: { total: number; done: number; pct: number }
  categories: CategoryRollup[]
  itemsByPriority: { priority: Priority; items: Item[] }[]
  gaps: Item[] // critical + high items not done
}

export async function GET() {
  let config: ConfigFile
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8')
    config = JSON.parse(raw)
  } catch (err) {
    return NextResponse.json(
      { error: 'pty-readiness config not found', detail: String(err) },
      { status: 503 },
    )
  }

  const today = new Date()
  const cutover = new Date(config.cutover_date + 'T00:00:00Z')
  const daysToCutover = Math.ceil(
    (cutover.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  const totals = config.items.reduce(
    (acc, it) => {
      acc.total++
      acc[it.status]++
      return acc
    },
    { total: 0, done: 0, doing: 0, todo: 0, blocked: 0 },
  )

  const criticalItems = config.items.filter(it => it.priority === 'critical')
  const criticalDone = criticalItems.filter(it => it.status === 'done').length
  const critical = {
    total: criticalItems.length,
    done: criticalDone,
    pct: criticalItems.length ? Math.round((criticalDone / criticalItems.length) * 100) : 0,
  }

  const categories: Category[] = [
    'registration',
    'banking',
    'insurance',
    'payroll',
    'bookkeeping',
    'ip',
    'operations',
  ]
  const categoryRollups: CategoryRollup[] = categories
    .map(cat => {
      const items = config.items.filter(it => it.category === cat)
      const done = items.filter(it => it.status === 'done').length
      const blocked = items.filter(it => it.status === 'blocked').length
      return {
        category: cat,
        total: items.length,
        done,
        blocked,
        pct: items.length ? Math.round((done / items.length) * 100) : 0,
      }
    })
    .filter(c => c.total > 0)

  const priorityOrder: Priority[] = ['critical', 'high', 'medium', 'low']
  const statusOrder: Record<Status, number> = { blocked: 0, doing: 1, todo: 2, done: 3 }
  const itemsByPriority = priorityOrder.map(p => ({
    priority: p,
    items: config.items
      .filter(it => it.priority === p)
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]),
  }))

  const gaps = config.items
    .filter(it => (it.priority === 'critical' || it.priority === 'high') && it.status !== 'done')
    .sort((a, b) => {
      const pDiff = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
      if (pDiff !== 0) return pDiff
      return statusOrder[a.status] - statusOrder[b.status]
    })

  const response: Response = {
    generatedAt: new Date().toISOString(),
    entity: config.entity,
    cutoverDate: config.cutover_date,
    daysToCutover,
    totals: {
      ...totals,
      pct: totals.total ? Math.round((totals.done / totals.total) * 100) : 0,
    },
    critical,
    categories: categoryRollups,
    itemsByPriority,
    gaps,
  }
  return NextResponse.json(response)
}
