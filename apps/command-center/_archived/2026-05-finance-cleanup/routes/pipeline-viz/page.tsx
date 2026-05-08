'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Layers, ArrowLeft, GitMerge, Circle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────

interface SankeyLink {
  source: string
  target: string
  value: number
  stages: Record<string, number>
}

interface Bubble {
  id: string
  title: string
  funder: string
  value: number
  weighted: number
  probability: number
  stage: string
  project: string
  projectName: string
}

interface TimelineItem {
  title: string
  funder: string
  value: number
  weighted: number
  probability: number
  stage: string
  project: string
  projectName: string
  expectedClose: string
}

interface ProjectSummary {
  code: string
  name: string
  tier: string
  totalWeighted: number
  count: number
}

interface VizData {
  sankey: {
    links: SankeyLink[]
    funders: Array<{ name: string; total: number }>
  }
  bubbles: Bubble[]
  timeline: TimelineItem[]
  projects: ProjectSummary[]
  totalOpps: number
  totalWeighted: number
}

// ── Colors ──────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  researching: '#60A5FA',  // blue
  pursuing: '#818CF8',     // indigo
  submitted: '#A78BFA',    // purple
  shortlisted: '#FBBF24',  // amber
  realized: '#34D399',     // green
}

const STAGE_BG: Record<string, string> = {
  researching: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pursuing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  submitted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  shortlisted: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  realized: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const PROJECT_COLORS = [
  '#34D399', '#60A5FA', '#F472B6', '#FBBF24', '#A78BFA',
  '#FB923C', '#2DD4BF', '#E879F9', '#84CC16', '#F87171',
  '#38BDF8', '#C084FC', '#FB7185', '#4ADE80', '#FACC15',
]

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${(Math.abs(n) / 1000).toFixed(0)}K`
  return `$${Math.abs(n).toFixed(0)}`
}

// ── Sankey Visualization ──────────────────────────────────────────────

function SankeyViz({ data }: { data: VizData }) {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)

  const { links, funders } = data.sankey
  const projects = data.projects.filter(p => links.some(l => l.target === p.code))

  if (links.length === 0) return <EmptyState message="No funder→project links found" />

  // Layout: funders on left, projects on right
  const width = 900
  const height = Math.max(600, Math.max(funders.length, projects.length) * 45 + 60)
  const leftX = 0
  const rightX = width - 180
  const leftW = 180
  const rightW = 180

  const maxFunder = Math.max(...funders.map(f => f.total))
  const maxProject = Math.max(...projects.map(p => p.totalWeighted))

  // Position funders
  let leftY = 30
  const funderPositions = funders.map(f => {
    const h = Math.max(20, (f.total / maxFunder) * 60)
    const pos = { name: f.name, y: leftY, h, total: f.total }
    leftY += h + 6
    return pos
  })

  // Position projects
  let rightY = 30
  const projectPositions = projects.map(p => {
    const h = Math.max(20, (p.totalWeighted / maxProject) * 60)
    const pos = { code: p.code, name: p.name, y: rightY, h, total: p.totalWeighted }
    rightY += h + 6
    return pos
  })

  const actualHeight = Math.max(leftY, rightY) + 30

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={actualHeight} className="mx-auto">
        {/* Links */}
        {links.map((link, i) => {
          const funder = funderPositions.find(f => f.name === link.source)
          const project = projectPositions.find(p => p.code === link.target)
          if (!funder || !project) return null

          const key = `${link.source}→${link.target}`
          const isHovered = hoveredLink === key
          const opacity = hoveredLink ? (isHovered ? 0.6 : 0.08) : 0.25
          const thickness = Math.max(2, (link.value / maxFunder) * 40)

          // Dominant stage color
          const topStage = Object.entries(link.stages).sort((a, b) => b[1] - a[1])[0]?.[0]
          const color = STAGE_COLORS[topStage] || '#6B7280'

          const x1 = leftX + leftW
          const y1 = funder.y + funder.h / 2
          const x2 = rightX
          const y2 = project.y + project.h / 2
          const cx1 = x1 + (x2 - x1) * 0.4
          const cx2 = x1 + (x2 - x1) * 0.6

          return (
            <g key={i}
              onMouseEnter={() => setHoveredLink(key)}
              onMouseLeave={() => setHoveredLink(null)}
              className="cursor-pointer"
            >
              <path
                d={`M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
                opacity={opacity}
                className="transition-opacity duration-200"
              />
              {isHovered && (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2 - 10}
                  textAnchor="middle"
                  className="fill-white text-xs font-medium"
                >
                  {formatMoney(link.value)}
                </text>
              )}
            </g>
          )
        })}

        {/* Funder labels (left) */}
        {funderPositions.map((f, i) => (
          <g key={`f-${i}`}>
            <rect x={leftX} y={f.y} width={leftW - 10} height={f.h} rx={4}
              className="fill-white/5 stroke-white/10" strokeWidth={0.5} />
            <text x={leftX + 6} y={f.y + f.h / 2 + 1} dominantBaseline="middle"
              className="fill-white/70 text-[10px]">
              {f.name.length > 22 ? f.name.substring(0, 20) + '...' : f.name}
            </text>
            <text x={leftW - 16} y={f.y + f.h / 2 + 1} dominantBaseline="middle" textAnchor="end"
              className="fill-white/40 text-[9px] tabular-nums">
              {formatMoney(f.total)}
            </text>
          </g>
        ))}

        {/* Project labels (right) */}
        {projectPositions.map((p, i) => {
          const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
          return (
            <g key={`p-${i}`}>
              <rect x={rightX + 10} y={p.y} width={rightW - 10} height={p.h} rx={4}
                fill={color} fillOpacity={0.15} stroke={color} strokeOpacity={0.3} strokeWidth={0.5} />
              <text x={rightX + 18} y={p.y + p.h / 2 + 1} dominantBaseline="middle"
                className="fill-white/80 text-[10px] font-medium">
                {p.code}
              </text>
              <text x={rightX + rightW - 6} y={p.y + p.h / 2 + 1} dominantBaseline="middle" textAnchor="end"
                className="fill-white/40 text-[9px] tabular-nums">
                {formatMoney(p.total)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Bubble Garden ──────────────────────────────────────────────────────

function BubbleGarden({ data }: { data: VizData }) {
  const [hoveredBubble, setHoveredBubble] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'project' | 'stage'>('project')

  const bubbles = data.bubbles

  // Group bubbles
  const groups = groupBy === 'project'
    ? data.projects.map(p => ({
        key: p.code,
        label: p.name,
        bubbles: bubbles.filter(b => b.project === p.code),
      }))
    : ['researching', 'pursuing', 'submitted', 'realized'].map(s => ({
        key: s,
        label: s.charAt(0).toUpperCase() + s.slice(1),
        bubbles: bubbles.filter(b => b.stage === s),
      }))

  // Only show groups with bubbles
  const activeGroups = groups.filter(g => g.bubbles.length > 0)

  return (
    <div>
      {/* Group toggle */}
      <div className="flex justify-center gap-2 mb-6">
        {(['project', 'stage'] as const).map(g => (
          <button key={g} onClick={() => setGroupBy(g)}
            className={cn(
              'px-4 py-1.5 rounded-full text-xs font-medium transition-all',
              groupBy === g ? 'bg-white/20 text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}>
            By {g}
          </button>
        ))}
      </div>

      {/* Bubble groups */}
      <div className="space-y-8">
        {activeGroups.map((group, gi) => {
          const maxValue = Math.max(...group.bubbles.map(b => b.weighted))
          return (
            <div key={group.key}>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-white/70">{group.label}</h3>
                <span className="text-xs text-white/30">
                  {group.bubbles.length} opps — {formatMoney(group.bubbles.reduce((s, b) => s + b.weighted, 0))} weighted
                </span>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                {group.bubbles
                  .sort((a, b) => b.weighted - a.weighted)
                  .map((bubble, bi) => {
                    const size = Math.max(24, Math.min(120, Math.sqrt(bubble.weighted / 100) * 3))
                    const color = groupBy === 'project'
                      ? STAGE_COLORS[bubble.stage] || '#6B7280'
                      : PROJECT_COLORS[data.projects.findIndex(p => p.code === bubble.project) % PROJECT_COLORS.length]
                    const isHovered = hoveredBubble === bubble.id

                    return (
                      <div key={bubble.id}
                        className="relative group cursor-pointer"
                        onMouseEnter={() => setHoveredBubble(bubble.id)}
                        onMouseLeave={() => setHoveredBubble(null)}
                      >
                        <div
                          className="rounded-full flex items-center justify-center transition-all duration-300"
                          style={{
                            width: size,
                            height: size,
                            backgroundColor: `${color}20`,
                            border: `2px solid ${color}${isHovered ? 'CC' : '40'}`,
                            transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                            boxShadow: isHovered ? `0 0 20px ${color}40` : 'none',
                          }}
                        >
                          {size > 40 && (
                            <span className="text-[9px] text-white/60 text-center leading-tight px-1 truncate">
                              {formatMoney(bubble.weighted)}
                            </span>
                          )}
                        </div>

                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                            bg-gray-900 border border-white/20 rounded-lg p-3 min-w-[220px] shadow-xl">
                            <p className="text-xs font-medium text-white truncate">{bubble.title}</p>
                            <p className="text-xs text-white/40 mt-0.5">{bubble.funder}</p>
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-white/50">Value: <span className="text-white">{formatMoney(bubble.value)}</span></span>
                              <span className="text-white/50">Prob: <span className="text-white">{bubble.probability}%</span></span>
                            </div>
                            <div className="flex gap-2 mt-1">
                              <span className={cn('text-xs px-1.5 py-0.5 rounded border', STAGE_BG[bubble.stage] || 'text-white/40')}>
                                {bubble.stage}
                              </span>
                              <span className="text-xs text-white/30">{bubble.projectName}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-8 justify-center">
        {(groupBy === 'project'
          ? Object.entries(STAGE_COLORS).map(([k, v]) => ({ label: k, color: v }))
          : data.projects.slice(0, 10).map((p, i) => ({ label: p.code, color: PROJECT_COLORS[i % PROJECT_COLORS.length] }))
        ).map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-white/40 capitalize">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Timeline River ──────────────────────────────────────────────────────

function TimelineRiver({ data }: { data: VizData }) {
  const items = data.timeline
  if (items.length === 0) return <EmptyState message="No opportunities with expected close dates" />

  // Group by month
  const byMonth = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const month = item.expectedClose.substring(0, 7) // "2026-03"
    const existing = byMonth.get(month) || []
    existing.push(item)
    byMonth.set(month, existing)
  }

  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const now = new Date().toISOString().substring(0, 7)

  return (
    <div className="relative">
      {/* Central river line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-500/40 to-purple-500/40" />

      <div className="space-y-0">
        {months.map(([month, monthItems], mi) => {
          const isPast = month < now
          const isCurrent = month === now
          const monthTotal = monthItems.reduce((s, i) => s + i.weighted, 0)
          const monthLabel = new Date(month + '-15').toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })

          // Group by project within month
          const byProject = new Map<string, TimelineItem[]>()
          for (const item of monthItems) {
            const existing = byProject.get(item.project) || []
            existing.push(item)
            byProject.set(item.project, existing)
          }

          return (
            <div key={month} className={cn('relative py-4', isPast && 'opacity-50')}>
              {/* Month marker on center line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-4 z-10">
                <div className={cn(
                  'w-4 h-4 rounded-full border-2',
                  isCurrent ? 'bg-indigo-500 border-indigo-400 shadow-lg shadow-indigo-500/50'
                    : isPast ? 'bg-white/20 border-white/30'
                    : 'bg-white/10 border-white/20'
                )} />
              </div>

              {/* Month label */}
              <div className="text-center mb-3">
                <span className={cn(
                  'text-xs font-medium px-3 py-1 rounded-full',
                  isCurrent ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40'
                )}>
                  {monthLabel} — {formatMoney(monthTotal)}
                </span>
              </div>

              {/* Items flowing from the river */}
              <div className="grid grid-cols-2 gap-x-16 gap-y-2 px-8">
                {monthItems
                  .sort((a, b) => b.weighted - a.weighted)
                  .map((item, ii) => {
                    const side = ii % 2 === 0 ? 'left' : 'right'
                    const projectIndex = data.projects.findIndex(p => p.code === item.project)
                    const color = PROJECT_COLORS[projectIndex % PROJECT_COLORS.length]
                    const barWidth = Math.max(20, Math.min(100, (item.weighted / monthTotal) * 100))

                    return (
                      <div key={ii}
                        className={cn(
                          'group relative rounded-lg p-3 border transition-all hover:scale-[1.02]',
                          side === 'left' ? 'text-right' : 'text-left'
                        )}
                        style={{
                          backgroundColor: `${color}08`,
                          borderColor: `${color}25`,
                        }}
                      >
                        {/* Flow bar */}
                        <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
                          style={{
                            backgroundColor: `${color}40`,
                            width: `${barWidth}%`,
                            ...(side === 'left' ? { right: 0 } : { left: 0 }),
                          }}
                        />

                        <p className="text-xs font-medium text-white relative z-10 truncate">
                          {item.title}
                        </p>
                        <div className={cn('flex gap-2 mt-1 text-[10px] relative z-10',
                          side === 'left' ? 'justify-end' : 'justify-start')}>
                          <span className="px-1.5 py-0.5 rounded text-white/80" style={{ backgroundColor: `${color}30` }}>
                            {item.project}
                          </span>
                          <span className="text-white/40">{formatMoney(item.weighted)}</span>
                          <span className={cn('px-1 rounded', STAGE_BG[item.stage] || '')}>
                            {item.stage}
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Empty State ──────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <Circle className="h-12 w-12 text-white/10 mx-auto mb-4" />
      <p className="text-white/30">{message}</p>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'sankey', label: 'Funding Rivers', icon: GitMerge, desc: 'Funders → Projects flow' },
  { id: 'bubbles', label: 'Bubble Garden', icon: Circle, desc: 'Opportunities by size' },
  { id: 'timeline', label: 'Timeline', icon: Clock, desc: 'When money lands' },
] as const

type TabId = typeof TABS[number]['id']

export default function PipelineVizPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sankey')

  const { data, isLoading, error } = useQuery<VizData>({
    queryKey: ['finance', 'pipeline-viz'],
    queryFn: () => fetch('/api/finance/pipeline-viz').then(r => r.json()),
  })

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/finance/overview" className="text-white/40 hover:text-white/80 transition">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Layers className="h-8 w-8 text-indigo-400" />
              Pipeline Visualizer
            </h1>
          </div>
          {data && (
            <p className="text-white/50 mt-1 ml-8">
              {data.totalOpps} opportunities — {formatMoney(data.totalWeighted)} weighted pipeline
            </p>
          )}
        </div>
      </header>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 hover:text-white/60'
              )}>
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {!isActive && <span className="text-xs text-white/20 hidden md:inline">— {tab.desc}</span>}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-white/40">Loading pipeline data...</div>
        </div>
      ) : error || !data ? (
        <div className="glass-card p-12 text-center">
          <p className="text-white/40">Failed to load pipeline visualization</p>
        </div>
      ) : (
        <div className="glass-card p-6">
          {activeTab === 'sankey' && <SankeyViz data={data} />}
          {activeTab === 'bubbles' && <BubbleGarden data={data} />}
          {activeTab === 'timeline' && <TimelineRiver data={data} />}
        </div>
      )}

      {/* Stage legend (always visible) */}
      <div className="flex flex-wrap gap-4 mt-6 justify-center">
        {Object.entries(STAGE_COLORS).map(([stage, color]) => (
          <div key={stage} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-white/40 capitalize">{stage}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
