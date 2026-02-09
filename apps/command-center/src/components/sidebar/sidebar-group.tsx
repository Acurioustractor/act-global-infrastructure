'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './use-sidebar'
import { SidebarItem } from './sidebar-item'
import type { SidebarNavGroup } from '@/lib/nav-data'

export function SidebarGroup({ group }: { group: SidebarNavGroup }) {
  const { expandedGroups, toggleGroup } = useSidebar()
  const isExpanded = expandedGroups.has(group.id)

  // Groups without a label (like Dashboard) are always expanded, no header
  const hasLabel = group.label.length > 0

  return (
    <div className={hasLabel ? 'mt-5' : ''}>
      {hasLabel && (
        <button
          onClick={() => toggleGroup(group.id)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-1.5 group',
            'text-[11px] font-semibold uppercase tracking-wider',
            'transition-colors duration-150',
            isExpanded ? 'text-white/40' : 'text-white/25 hover:text-white/40'
          )}
        >
          <span>{group.label}</span>
          <ChevronDown className={cn(
            'h-3 w-3 opacity-0 group-hover:opacity-100 transition-all duration-200',
            !isExpanded && '-rotate-90'
          )} />
        </button>
      )}

      {(isExpanded || !hasLabel) && (
        <div className="mt-0.5 space-y-[1px]">
          {group.items.map((item) => (
            <SidebarItem key={item.href} item={item} depth={0} />
          ))}
        </div>
      )}
    </div>
  )
}
