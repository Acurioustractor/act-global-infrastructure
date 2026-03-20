'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { RoleProvider } from '@/lib/role-context'
import { RoleSelector } from '@/components/role-selector'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        {children}
        <RoleSelector />
      </RoleProvider>
    </QueryClientProvider>
  )
}
