'use client'

import { cn } from '@/lib/utils'
import { useSidebar } from './use-sidebar'
import { SidebarGroup } from './sidebar-group'
import { navStructure } from '@/lib/nav-data'

export function Sidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebar()

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base
          'z-40 w-64 border-r border-white/[0.06] bg-[#0b0f1a]/95 backdrop-blur-xl',
          'h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10',
          // Desktop: sticky
          'hidden md:sticky md:top-14 md:block md:flex-shrink-0',
          // Mobile: fixed overlay from left
          isMobileOpen && 'fixed !block left-0 top-14 shadow-2xl shadow-black/50'
        )}
      >
        <nav className="py-2 px-2">
          {navStructure.map((group) => (
            <SidebarGroup key={group.id} group={group} />
          ))}
        </nav>
      </aside>
    </>
  )
}
