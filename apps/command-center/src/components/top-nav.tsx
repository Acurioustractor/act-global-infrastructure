'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Sun,
  Users,
  FolderKanban,
  Target,
  DollarSign,
  Settings,
  Layers,
  Search,
  ChevronDown,
  Scale,
  Heart,
  Wheat,
  Apple,
  Palette,
  ShoppingBag,
  GitBranch,
  FileBarChart,
  BookOpen,
  Flame,
  Brain,
  MessageSquare,
  ListChecks,
  Gavel,
  Bot,
  Briefcase,
  Zap,
  Code2,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// --- Data ---

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  color?: string
  bg?: string
}

interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  children: NavItem[] | NavItem[][]  // flat array = single column, nested = multi-column
  columnLabels?: string[]
}

const navGroups: NavGroup[] = [
  {
    id: 'relationships',
    label: 'Relationships',
    icon: Users,
    children: [
      { href: '/people', label: 'People', icon: Users },
      { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
      { href: '/ecosystem', label: 'Ecosystem', icon: Layers },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    icon: FolderKanban,
    columnLabels: ['Projects', 'Strategy'],
    children: [
      // Column 1: Projects
      [
        { href: '/projects', label: 'All Projects', icon: FolderKanban },
        { href: '/projects/justicehub', label: 'JusticeHub', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
        { href: '/projects/empathy-ledger', label: 'Empathy Ledger', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
        { href: '/projects/goods', label: 'Goods', icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/20' },
        { href: '/projects/the-farm', label: 'The Farm', icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/20' },
        { href: '/projects/the-harvest', label: 'The Harvest', icon: Apple, color: 'text-green-400', bg: 'bg-green-500/20' },
        { href: '/projects/the-studio', label: 'The Studio', icon: Palette, color: 'text-purple-400', bg: 'bg-purple-500/20' },
      ],
      // Column 2: Strategy
      [
        { href: '/goals', label: 'Goals', icon: Target },
      ],
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    icon: Brain,
    children: [
      { href: '/knowledge', label: 'Overview', icon: Brain },
      { href: '/compendium/storytellers', label: 'Storytellers', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
      { href: '/knowledge/meetings', label: 'Meetings', icon: MessageSquare },
      { href: '/knowledge/actions', label: 'Actions', icon: ListChecks },
      { href: '/knowledge/decisions', label: 'Decisions', icon: Gavel },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Settings,
    children: [
      { href: '/agent', label: 'Agent', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/20' },
      { href: '/intelligence', label: 'Intelligence', icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
      { href: '/finance', label: 'Finance', icon: DollarSign },
      { href: '/business', label: 'Business', icon: Briefcase },
      { href: '/reports', label: 'Reports', icon: FileBarChart },
      { href: '/development', label: 'Development', icon: Code2, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
      { href: '/wiki', label: 'Wiki', icon: BookOpen },
      { href: '/system', label: 'System', icon: Settings },
    ],
  },
]

// --- Helpers ---

function isMultiColumn(children: NavItem[] | NavItem[][]): children is NavItem[][] {
  return children.length > 0 && Array.isArray(children[0])
}

function allRoutes(group: NavGroup): string[] {
  if (isMultiColumn(group.children)) {
    return group.children.flat().map((c) => c.href)
  }
  return (group.children as NavItem[]).map((c) => c.href)
}

// --- Component ---

export function TopNav() {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const enterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const open = useCallback((id: string) => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current)
    enterTimeout.current = setTimeout(() => setOpenGroup(id), 100)
  }, [])

  const close = useCallback(() => {
    if (enterTimeout.current) clearTimeout(enterTimeout.current)
    leaveTimeout.current = setTimeout(() => setOpenGroup(null), 300)
  }, [])

  const cancelClose = useCallback(() => {
    if (leaveTimeout.current) clearTimeout(leaveTimeout.current)
  }, [])

  const isGroupActive = (group: NavGroup) =>
    allRoutes(group).some((r) => pathname === r || pathname.startsWith(`${r}/`))

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#0a0f1a]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Logo */}
          <Link href="/today" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-lg font-bold text-white">A</span>
            </div>
            <span className="text-lg font-semibold text-white hidden lg:block">ACT Command</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {/* Today — direct link */}
            <Link
              href="/today"
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                pathname === '/today'
                  ? 'nav-item-active'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              )}
            >
              <Sun className="h-4 w-4" />
              <span className="hidden md:inline">Today</span>
            </Link>

            {/* Grouped dropdowns */}
            {navGroups.map((group) => {
              const active = isGroupActive(group)
              const isOpen = openGroup === group.id
              const TriggerIcon = group.icon
              return (
                <div
                  key={group.id}
                  className="relative"
                  onMouseEnter={() => open(group.id)}
                  onMouseLeave={close}
                >
                  <button
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      active
                        ? 'nav-item-active'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    )}
                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                    aria-expanded={isOpen}
                  >
                    <TriggerIcon className="h-4 w-4" />
                    <span className="hidden md:inline">{group.label}</span>
                    <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
                  </button>

                  {isOpen && (
                    <div
                      className={cn(
                        'absolute top-full left-0 mt-2 rounded-2xl border border-white/10 bg-[#131928]/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-2 z-50',
                        isMultiColumn(group.children) ? 'w-[420px]' : 'w-56'
                      )}
                      onMouseEnter={cancelClose}
                      onMouseLeave={close}
                    >
                      {isMultiColumn(group.children) ? (
                        <div className="flex gap-4">
                          {group.children.map((col, colIdx) => (
                            <div key={colIdx} className="flex-1 min-w-0">
                              {group.columnLabels?.[colIdx] && (
                                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                                  {group.columnLabels[colIdx]}
                                </div>
                              )}
                              {col.map((item) => (
                                <DropdownItem
                                  key={item.href}
                                  item={item}
                                  pathname={pathname}
                                  onNavigate={() => setOpenGroup(null)}
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        (group.children as NavItem[]).map((item) => (
                          <DropdownItem
                            key={item.href}
                            item={item}
                            pathname={pathname}
                            onNavigate={() => setOpenGroup(null)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3">
            <Link href="/people?filter=hot" className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors">
              <Flame className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">7 Hot</span>
            </Link>

            <button className="btn-glass px-3 md:px-4 py-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="text-sm hidden lg:inline">Search</span>
              <kbd className="ml-2 px-1.5 py-0.5 rounded bg-white/10 text-xs hidden lg:inline">⌘K</kbd>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile slide-out menu */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-72 bg-[#0d1220] border-l border-white/10 shadow-2xl md:hidden overflow-y-auto">
            {/* Close button */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
              <span className="text-sm font-semibold text-white/70">Menu</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-2">
              {/* Today */}
              <Link
                href="/today"
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                  pathname === '/today' ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/70 hover:bg-white/5'
                )}
              >
                <Sun className="h-4 w-4" />
                Today
              </Link>

              {/* Groups */}
              {navGroups.map((group) => {
                const flatItems = isMultiColumn(group.children)
                  ? group.children.flat()
                  : (group.children as NavItem[])
                const GroupIcon = group.icon
                return (
                  <div key={group.id} className="mt-1">
                    <div className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/30">
                      <GroupIcon className="h-3.5 w-3.5" />
                      {group.label}
                    </div>
                    {flatItems.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 pl-6 text-sm transition-colors',
                            isActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {item.color ? (
                            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', item.bg)}>
                              <Icon className={cn('h-3 w-3', item.color)} />
                            </div>
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                          {item.label}
                        </Link>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// --- Dropdown item ---

function DropdownItem({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  onNavigate: () => void
}) {
  const Icon = item.icon
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const hasColor = item.color && item.bg

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
        isActive ? 'bg-white/10' : 'hover:bg-white/5'
      )}
    >
      {hasColor ? (
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', item.bg)}>
          <Icon className={cn('h-3.5 w-3.5', item.color)} />
        </div>
      ) : (
        <Icon className="h-4 w-4 text-white/60" />
      )}
      <span className="text-sm font-medium text-white">{item.label}</span>
    </Link>
  )
}
