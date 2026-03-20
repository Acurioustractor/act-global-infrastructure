'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const labelMap: Record<string, string> = {
  finance: 'Finance',
  overview: 'Unified Overview',
  projects: 'Projects P&L',
  board: 'Board Report',
  accountant: 'Accountant',
  'revenue-planning': 'Revenue Planning',
  'pipeline-kanban': 'Pipeline Kanban',
  'pipeline-viz': 'Pipeline Visualisation',
  people: 'People',
  pipeline: 'Pipeline',
  knowledge: 'Knowledge',
  meetings: 'Meetings',
  actions: 'Actions',
  decisions: 'Decisions',
  calendar: 'Calendar',
  chat: 'Chat',
  system: 'System',
  today: 'Today',
  ecosystem: 'Ecosystem',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  if (!pathname || pathname === '/') return null

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length <= 1) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-white/40 mb-4">
      <Link href="/today" className="hover:text-white/60 transition-colors">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.map((segment, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        const label = labelMap[segment] || decodeURIComponent(segment).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

        return (
          <span key={href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-white/20" />
            {isLast ? (
              <span className="text-white/60">{label}</span>
            ) : (
              <Link href={href} className="hover:text-white/60 transition-colors">
                {label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
