'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Settings,
  CheckCircle2,
  Circle,
  ExternalLink,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DextVendor {
  name: string
  aliases: string[]
  autoPublish: boolean
  category: string
  taxRate: string
  tracking: string
  avgAmount?: number
  frequency?: string
  note?: string
  section: string
  noReceiptRequired?: boolean
  configured: boolean
  configuredAt?: string
  configNotes?: string
  txCount: number
}

interface DextSetupData {
  vendors: DextVendor[]
  checklist: string[]
  totalRules: number
  configured: number
}

async function fetchDextSetup(): Promise<DextSetupData> {
  const res = await fetch('/api/finance/dext-setup')
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

async function updateSetup(body: { vendorName: string; configured: boolean; notes?: string }) {
  const res = await fetch('/api/finance/dext-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('Failed to update')
  return res.json()
}

export default function DextSetupPage() {
  const queryClient = useQueryClient()
  const [filterSection, setFilterSection] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['dext-setup'],
    queryFn: fetchDextSetup,
  })

  const mutation = useMutation({
    mutationFn: updateSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dext-setup'] })
    },
  })

  const vendors = data?.vendors || []
  const checklist = data?.checklist || []

  const sections = [...new Set(vendors.map(v => v.section))]
  const filtered = filterSection === 'all' ? vendors : vendors.filter(v => v.section === filterSection)

  const configuredCount = data?.configured || 0
  const totalRules = data?.totalRules || 0
  const pct = totalRules > 0 ? Math.round((configuredCount / totalRules) * 100) : 0

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/finance" className="text-white/40 hover:text-white/70 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-purple-400" />
            Dext Supplier Rules Setup
          </h1>
        </div>
        <p className="text-lg text-white/60">
          Configure supplier rules in Dext to match these {totalRules} rules
        </p>
      </header>

      {/* Progress + Dext link */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Configuration Progress</span>
            <span className="text-sm font-semibold text-white">{configuredCount}/{totalRules} ({pct}%)</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div
              className={cn(
                'h-3 rounded-full transition-all',
                pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="glass-card p-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60 mb-1">Configure in Dext</div>
            <div className="text-xs text-white/40">Business Settings → Connections → Manage (Xero)</div>
          </div>
          <a
            href="https://prepare.dext.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Open Dext
          </a>
        </div>
      </div>

      {/* Setup Checklist */}
      <div className="glass-card p-4 mb-8">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-amber-400" />
          Setup Instructions
        </h3>
        <ol className="space-y-1.5">
          {checklist.map((step, i) => (
            <li key={i} className="text-sm text-white/60">{step}</li>
          ))}
        </ol>
      </div>

      {/* Section filter */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setFilterSection('all')}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm transition-colors',
            filterSection === 'all' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
          )}
        >
          All ({vendors.length})
        </button>
        {sections.map(s => {
          const count = vendors.filter(v => v.section === s).length
          return (
            <button
              key={s}
              onClick={() => setFilterSection(s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
                filterSection === s ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white/70'
              )}
            >
              {s.replace(/_/g, ' ')} ({count})
            </button>
          )
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading rules...</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-center py-3 px-4 text-sm font-medium text-white/50 w-16">Done</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Vendor</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Category</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Tracking</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-white/50">Auto-Pub</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Avg $</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-white/50">Txns</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-white/50">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr
                  key={v.name}
                  className={cn(
                    'border-b border-white/5 hover:bg-white/5 transition-colors',
                    v.configured && 'opacity-60'
                  )}
                >
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => mutation.mutate({ vendorName: v.name, configured: !v.configured })}
                      disabled={mutation.isPending}
                      className="transition-colors"
                    >
                      {v.configured ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5 text-white/20 hover:text-white/40" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-white">{v.name}</span>
                    {v.aliases.length > 0 && (
                      <span className="text-xs text-white/30 ml-2">
                        ({v.aliases.slice(0, 2).join(', ')})
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-white/50">{v.category}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      v.tracking === 'ASK_USER' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                    )}>
                      {v.tracking}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {v.autoPublish ? (
                      <span className="text-xs text-green-400">Yes</span>
                    ) : (
                      <span className="text-xs text-white/30">No</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {v.avgAmount ? (
                      <span className="text-sm text-white/50 tabular-nums">
                        ${v.avgAmount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-white/20">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm text-white/50 tabular-nums">{v.txCount}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-white/30 max-w-[200px] truncate block">
                      {v.note || v.frequency || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
