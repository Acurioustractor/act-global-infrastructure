'use client'

import { cn } from '@/lib/utils'
import { useSidebar } from './use-sidebar'
import { SidebarGroup } from './sidebar-group'
import { filterNavForRole } from '@/lib/nav-data'
import { useRole } from '@/lib/role-context'
import { roles } from '@/components/role-selector'
import { ChevronDown } from 'lucide-react'

export function Sidebar() {
  const { isMobileOpen, setMobileOpen } = useSidebar()
  const { role, setShowRoleSelector } = useRole()

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
