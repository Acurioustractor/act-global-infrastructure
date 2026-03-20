'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Role = 'founder' | 'accountant' | 'board' | 'team'

interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  showRoleSelector: boolean
  setShowRoleSelector: (show: boolean) => void
}

const RoleContext = createContext<RoleContextValue>({
  role: 'founder',
  setRole: () => {},
  showRoleSelector: false,
  setShowRoleSelector: () => {},
})

const STORAGE_KEY = 'act-command-center-role'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('founder')
  const [showRoleSelector, setShowRoleSelector] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && ['founder', 'accountant', 'board', 'team'].includes(stored)) {
      setRoleState(stored as Role)
    } else {
      // First visit — show role selector
      setShowRoleSelector(true)
    }
    setHydrated(true)
  }, [])

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole)
    localStorage.setItem(STORAGE_KEY, newRole)
    setShowRoleSelector(false)
  }, [])

  // Don't render children until hydrated to avoid flash
  if (!hydrated) return null

  return (
    <RoleContext.Provider value={{ role, setRole, showRoleSelector, setShowRoleSelector }}>
      {children}
    </RoleContext.Provider>
  )
}

export function useRole() {
  return useContext(RoleContext)
}
