'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Search,
  Flame,
  Menu,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar/use-sidebar'

export function TopNav() {
  const pathname = usePathname()
  const { isMobileOpen, setMobileOpen } = useSidebar()

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-white/5 bg-[#0a0f1a]/90 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-4 md:px-5">
        {/* Left: Logo + mobile toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(!isMobileOpen)}
            aria-label="Toggle sidebar"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/today" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">A</span>
            </div>
            <span className="text-sm font-semibold text-white/80 hidden sm:block">
              ACT Command
            </span>
          </Link>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* Hot contacts */}
          <Link
            href="/people?filter=hot"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <Flame className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-medium text-red-400">7 Hot</span>
          </Link>

          {/* Search */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.06] hover:bg-white/10 transition-colors">
            <Search className="h-3.5 w-3.5 text-white/40" />
            <span className="text-xs text-white/40 hidden sm:inline">Search</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-white/30 hidden sm:inline">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </nav>
  )
}
