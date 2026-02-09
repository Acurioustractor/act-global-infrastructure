'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { SidebarNavItem } from '@/lib/nav-data'

export function SidebarItem({
  item,
  depth = 0,
}: {
  item: SidebarNavItem
  depth?: number
}) {
  const pathname = usePathname()
  const isExactActive = pathname === item.href
  const isActive = isExactActive || pathname.startsWith(`${item.href}/`)
  const hasChildren = item.children && item.children.length > 0

  // Auto-expand if a child is active
  const childActive = hasChildren
    ? item.children!.some(
        (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
      )
    : false

  const [expanded, setExpanded] = useState(childActive || isActive)

  // Keep in sync when route changes
  useEffect(() => {
    if (childActive || isActive) {
      setExpanded(true)
    }
  }, [childActive, isActive])

  const Icon = item.icon
  const hasColorIcon = item.color && item.bg

  const paddingLeft = depth === 0 ? 'pl-3' : depth === 1 ? 'pl-9' : 'pl-14'

  return (
    <div>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={cn(
            'flex-1 flex items-center gap-2.5 pr-3 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150',
            paddingLeft,
            isExactActive
              ? 'sidebar-item-active'
              : isActive
                ? 'text-white/80 bg-white/[0.03]'
                : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
          )}
        >
          {hasColorIcon ? (
            <div className={cn('w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0', item.bg)}>
              <Icon className={cn('h-3 w-3', item.color)} />
            </div>
          ) : (
            <Icon className={cn(
              'h-4 w-4 flex-shrink-0',
              isExactActive ? 'text-white' : 'text-white/40'
            )} />
          )}
          <span className="truncate">{item.label}</span>
        </Link>

        {hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault()
              setExpanded(!expanded)
            }}
            className="p-1.5 mr-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <ChevronRight className={cn(
              'h-3 w-3 transition-transform duration-200',
              expanded && 'rotate-90'
            )} />
          </button>
        )}
      </div>

      {/* Nested children */}
      {hasChildren && expanded && (
        <div className="relative">
          {/* Tree line */}
          <div className={cn(
            'absolute top-0 bottom-2 w-px bg-white/[0.06]',
            depth === 0 ? 'left-[22px]' : 'left-[42px]'
          )} />
          {item.children!.map((child) => (
            <SidebarItem key={child.href} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
