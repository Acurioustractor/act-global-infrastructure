'use client'

import { cn } from '@/lib/utils'
import { useSidebar } from './use-sidebar'
import { SidebarGroup } from './sidebar-group'
import { filterNavForRole } from '@/lib/nav-data'
import { useRole } from '@/lib/role-context'
import { roles } from '@/components/role-selector'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

export function Sidebar() {
  const { isMobileOpen, setMobileOpen, isCollapsed, toggleCollapsed } = useSidebar()
  const { role, setShowRoleSelector } = useRole()

  // Collapsed: show a thin floating tab that expands the sidebar back
  if (isCollapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        title="Show sidebar"
        className="hidden md:flex sticky top-14 z-30 w-6 h-12 self-start mt-2 ml-0 items-center justify-center bg-white/[0.04] hover:bg-white/[0.08] border border-l-0 border-white/[0.08] rounded-r-md text-white/40 hover:text-white/80 transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    )
  }

  const filteredNav = filterNavForRole(role)
  const currentRole = roles.find(r => r.id === role)
  const RoleIcon = currentRole?.icon

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
          'h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden flex flex-col',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10',
          // Desktop: sticky
          'hidden md:sticky md:top-14 md:block md:flex-shrink-0',
          // Mobile: fixed overlay from left
          isMobileOpen && 'fixed !block left-0 top-14 shadow-2xl shadow-black/50'
        )}
      >
        {/* Collapse button */}
        <div className="hidden md:flex justify-end px-2 pt-2">
          <button
            onClick={toggleCollapsed}
            title="Hide sidebar"
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <nav className="py-2 px-2 flex-1">
          {filteredNav.map((group) => (
            <SidebarGroup key={group.id} group={group} />
          ))}
        </nav>

        {/* Role switcher */}
        <div className="p-2 border-t border-white/[0.06]">
          <button
            onClick={() => setShowRoleSelector(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            {RoleIcon && (
              <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', currentRole?.bg)}>
                <RoleIcon className={cn('h-3.5 w-3.5', currentRole?.color)} />
              </div>
            )}
            <span className="text-xs text-white/50 flex-1">{currentRole?.label} view</span>
            <ChevronDown className="h-3 w-3 text-white/20" />
          </button>
        </div>
      </aside>
    </>
  )
}
