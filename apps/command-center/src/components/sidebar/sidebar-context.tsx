'use client'

import { createContext, useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { navStructure, findGroupForPath } from '@/lib/nav-data'

export interface SidebarContextType {
  expandedGroups: Set<string>
  isMobileOpen: boolean
  toggleGroup: (groupId: string) => void
  setMobileOpen: (open: boolean) => void
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const STORAGE_KEY = 'act-sidebar-expanded'

function getDefaultExpanded(): Set<string> {
  return new Set(
    navStructure.filter((g) => g.defaultExpanded).map((g) => g.id)
  )
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(getDefaultExpanded)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        if (Array.isArray(parsed)) {
          setExpandedGroups(new Set(parsed))
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [])

  // Persist to localStorage after hydration
  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedGroups]))
    } catch {
      // ignore quota errors
    }
  }, [expandedGroups, hydrated])

  // Auto-expand group containing the current route
  useEffect(() => {
    const groupId = findGroupForPath(pathname)
    if (groupId && !expandedGroups.has(groupId)) {
      setExpandedGroups((prev) => new Set([...prev, groupId]))
    }
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isMobileOpen])

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const setMobileOpenCb = useCallback((open: boolean) => {
    setIsMobileOpen(open)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        expandedGroups,
        isMobileOpen,
        toggleGroup,
        setMobileOpen: setMobileOpenCb,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
