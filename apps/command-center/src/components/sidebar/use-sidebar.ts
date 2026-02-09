'use client'

import { useContext } from 'react'
import { SidebarContext } from './sidebar-context'
import type { SidebarContextType } from './sidebar-context'

export function useSidebar(): SidebarContextType {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
