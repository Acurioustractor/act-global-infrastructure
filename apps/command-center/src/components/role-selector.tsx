'use client'

import { useRole, type Role } from '@/lib/role-context'
import {
  Sparkles,
  Calculator,
  Landmark,
  Users,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const roles: { id: Role; label: string; description: string; icon: typeof Sparkles; color: string; bg: string; landing: string }[] = [
  {
    id: 'founder',
    label: 'Founder',
    description: 'Full access — Today dashboard, all projects, finance, pipeline, and tools',
    icon: Sparkles,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    landing: '/today',
  },
  {
    id: 'accountant',
    label: 'Accountant',
    description: 'Finance focused — Dashboard, transaction tagger, reconciliation, and reports',
    icon: Calculator,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    landing: '/finance',
  },
  {
    id: 'board',
    label: 'Board Member',
    description: 'High-level view — Financial overview and board report',
    icon: Landmark,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    landing: '/finance/board',
  },
  {
    id: 'team',
    label: 'Team',
    description: 'Project work — Dashboard, projects, pipeline, people, and knowledge',
    icon: Users,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    landing: '/projects',
  },
]

export function RoleSelector() {
  const { role, setRole, showRoleSelector, setShowRoleSelector } = useRole()

  if (!showRoleSelector) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setShowRoleSelector(false)}
      />
      <div className="relative w-full max-w-2xl mx-4">
        <div className="glass-card p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Welcome to ACT Command Center
          </h2>
          <p className="text-white/50 text-center mb-8">
            Choose your role to personalise your navigation
          </p>

          <div className="grid grid-cols-2 gap-4">
            {roles.map(r => {
              const Icon = r.icon
              const isSelected = role === r.id
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'glass-card p-5 text-left transition-all hover:border-white/20 relative group',
                    isSelected && 'border-white/30 bg-white/5'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <Check className="h-4 w-4 text-green-400" />
                    </div>
                  )}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', r.bg)}>
                    <Icon className={cn('h-5 w-5', r.color)} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{r.label}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{r.description}</p>
                </button>
              )
            })}
          </div>

          <p className="text-xs text-white/30 text-center mt-6">
            You can change this anytime from the sidebar
          </p>
        </div>
      </div>
    </div>
  )
}

export { roles }
