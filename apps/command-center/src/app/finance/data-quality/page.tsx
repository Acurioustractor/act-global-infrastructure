'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Tag,
  Loader2,
  Database,
  GitBranch,
  CreditCard,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataQualityScore {
  source: string
  total: number
  tagged: number
  pct: number
}

interface UntaggedVendor {
  contact_name: string
  tx_count: number
  total_value: number
  suggested_project: string | null
  suggested_name: string | null
  confidence: number
}

interface UntaggedOpportunity {
  id: string
  name: string
  pipeline_name: string
  stage_name: string
  monetary_value: number
  status: string
  suggested_project: string | null
  suggested_name: string | null
  confidence: number
}

interface DataQualityData {
  scores: DataQualityScore[]
  overallScore: number
  topUntagged: UntaggedVendor[]
  untaggedOpportunities: UntaggedOpportunity[]
}

const sourceConfig: Record<string, { label: string; icon: typeof Database; color: string }> = {
  xero_transactions: { label: 'Transactions', icon: Receipt, color: 'text-blue-400' },
  xero_invoices: { label: 'Invoices', icon: CreditCard, color: 'text-emerald-400' },
  ghl_opportunities: { label: 'Opportunities', icon: GitBranch, color: 'text-purple-400' },
  subscriptions: { label: 'Subscriptions', icon: Database, color: 'text-amber-400' },
}

export default function DataQualityPage() {
  const queryClient = useQueryClient()
  const [taggingVendor, setTaggingVendor] = useState<string | null>(null)

  const { data, isLoading } = useQuery<DataQualityData>({
    queryKey: ['data-quality'],
    queryFn: () => fetch('/api/finance/data-quality').then(r => r.json()),
  })

  const tagMutation = useMutation({
    mutationFn: async ({ contactName, projectCode }: { contactName: string; projectCode: string }) => {
      const res = await fetch('/api/finance/data-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, projectCode }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-quality'] })
      setTaggingVendor(null)
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  const scores = data?.scores || []
  const overallScore = data?.overallScore || 0
  const topUntagged = data?.topUntagged || []
  const untaggedOpps = data?.untaggedOpportunities || []

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Data Quality</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Ecosystem alignment — how well financial and CRM data is tagged to projects
        </p>
      </div>

      {/* Overall Score + Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Overall */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
          <div className="text-xs uppercase text-zinc-500 mb-2">Overall Alignment</div>
          <div className={cn(
            'text-3xl font-bold',
            overallScore >= 70 ? 'text-emerald-400' : overallScore >= 40 ? 'text-amber-400' : 'text-red-400'
          )}>
            {overallScore}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">Weighted average</div>
        </div>

        {/* Per-source cards */}
        {scores.map(score => {
          const config = sourceConfig[score.source]
          if (!config) return null
          const Icon = config.icon
          return (
            <div key={score.source} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className="text-xs uppercase text-zinc-500">{config.label}</span>
              </div>
              <div className={cn(
                'text-2xl font-bold',
                score.pct >= 70 ? 'text-emerald-400' : score.pct >= 40 ? 'text-amber-400' : 'text-red-400'
              )}>
                {score.pct}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {score.tagged}/{score.total} tagged
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    score.pct >= 70 ? 'bg-emerald-500' : score.pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  )}
                  style={{ width: `${score.pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Two columns: Untagged Vendors + Untagged Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Untagged Vendors */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Top Untagged Vendors
            </h2>
            <p className="text-xs text-zinc-500 mt-1">Xero contacts without project codes</p>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {topUntagged.map(vendor => (
              <div key={vendor.contact_name} className="p-3 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{vendor.contact_name}</div>
                    <div className="text-xs text-zinc-500">
                      {vendor.tx_count} transactions &middot; ${Math.round(vendor.total_value).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {vendor.suggested_project ? (
                      <button
                        onClick={() => {
                          setTaggingVendor(vendor.contact_name)
                          tagMutation.mutate({
                            contactName: vendor.contact_name,
                            projectCode: vendor.suggested_project!,
                          })
                        }}
                        disabled={tagMutation.isPending && taggingVendor === vendor.contact_name}
                        className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                          vendor.confidence >= 0.5
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                        )}
                      >
                        {tagMutation.isPending && taggingVendor === vendor.contact_name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Tag className="h-3 w-3" />
                        )}
                        {vendor.suggested_project}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">No suggestion</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {topUntagged.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
                All vendors are tagged!
              </div>
            )}
          </div>
        </div>

        {/* Untagged GHL Opportunities */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-400" />
              Untagged Pipeline Opportunities
            </h2>
            <p className="text-xs text-zinc-500 mt-1">GHL opportunities without project codes</p>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {untaggedOpps.map(opp => (
              <div key={opp.id} className="p-3 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{opp.name}</div>
                    <div className="text-xs text-zinc-500">
                      {opp.pipeline_name} &middot; {opp.stage_name || opp.status}
                      {opp.monetary_value ? ` · $${(opp.monetary_value / 100).toLocaleString()}` : ''}
                    </div>
                  </div>
                  {opp.suggested_project ? (
                    <span className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                      opp.confidence >= 0.5
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    )}>
                      {opp.suggested_project}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-600 flex-shrink-0">No suggestion</span>
                  )}
                </div>
              </div>
            ))}
            {untaggedOpps.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-sm">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
                All opportunities are tagged!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
