'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Tag,
  CheckCircle2,
  AlertTriangle,
  Search,
  Save,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Settings2,
  X,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1000) return `$${Math.round(n).toLocaleString()}`
  return `$${n.toLocaleString()}`
}

interface UntaggedGroup {
  contactName: string
  type: string
  count: number
  total: number
  sampleDates: string[]
  bankAccounts: string[]
  suggestedCode: string | null
  rdEligible: boolean
}

interface ProjectCode {
  code: string
  name: string
  category: string
}

interface VendorRule {
  id: string
  vendor_name: string
  aliases: string[]
  project_code: string
  category: string
  rd_eligible: boolean
  auto_apply: boolean
}

export default function TransactionTaggerPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showRules, setShowRules] = useState(false)
  const [pendingTags, setPendingTags] = useState<Record<string, string>>({})
  const [newRule, setNewRule] = useState({ vendor_name: '', project_code: '' })
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, { code: string | null; loading: boolean }>>({})

  const requestAiSuggestion = useCallback(async (group: UntaggedGroup) => {
    const key = `${group.contactName}::${group.type}`
    setAiSuggestions(prev => ({ ...prev, [key]: { code: null, loading: true } }))
    try {
      const res = await fetch('/api/transactions/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: group.contactName,
          type: group.type,
          total: group.total,
          count: group.count,
        }),
      })
      const data = await res.json()
      setAiSuggestions(prev => ({ ...prev, [key]: { code: data.suggestion, loading: false } }))
    } catch {
      setAiSuggestions(prev => ({ ...prev, [key]: { code: null, loading: false } }))
    }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', 'untagged'],
    queryFn: () => fetch('/api/transactions/untagged').then(r => r.json()),
  })

  const { data: rulesData } = useQuery({
    queryKey: ['vendor-rules'],
    queryFn: () => fetch('/api/finance/vendor-rules').then(r => r.json()),
    enabled: showRules,
  })

  const tagMutation = useMutation({
    mutationFn: (payload: { contactName: string; type: string; projectCode: string; saveAsRule: boolean }) =>
      fetch('/api/transactions/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions', 'untagged'] })
    },
  })

  const addRuleMutation = useMutation({
    mutationFn: (payload: { vendor_name: string; project_code: string }) =>
      fetch('/api/finance/vendor-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-rules'] })
      setNewRule({ vendor_name: '', project_code: '' })
    },
  })

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/finance/vendor-rules?id=${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-rules'] })
    },
  })

  const groups: UntaggedGroup[] = data?.groups || []
  const projectCodes: ProjectCode[] = data?.projectCodes || []
  const rules: VendorRule[] = rulesData?.rules || []
  const totalUntagged = data?.totalUntagged || 0
  const totalTransactions = data?.totalTransactions || 0
  const coverage = totalTransactions > 0 ? Math.round(((totalTransactions - totalUntagged) / totalTransactions) * 100) : 100

  const filtered = groups.filter(g => {
    if (!search) return true
    return g.contactName.toLowerCase().includes(search.toLowerCase()) ||
      g.suggestedCode?.toLowerCase().includes(search.toLowerCase())
  })

  function handleTag(group: UntaggedGroup, code: string, saveRule: boolean) {
    tagMutation.mutate({
      contactName: group.contactName,
      type: group.type,
      projectCode: code,
      saveAsRule: saveRule,
    })
  }

  function applyPending(group: UntaggedGroup) {
    const key = `${group.contactName}::${group.type}`
    const code = pendingTags[key]
    if (code) {
      handleTag(group, code, true)
      setPendingTags(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  function acceptSuggestion(group: UntaggedGroup) {
    if (group.suggestedCode) {
      handleTag(group, group.suggestedCode, true)
    }
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/finance" className="text-white/40 hover:text-white/60 transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Tag className="h-8 w-8 text-amber-400" />
                Transaction Tagger
              </h1>
            </div>
            <p className="text-lg text-white/60 mt-1 ml-8">
              Assign project codes to transactions for R&D tracking and P&L reporting
            </p>
          </div>
          <button
            onClick={() => setShowRules(!showRules)}
            className={cn(
              'btn-glass flex items-center gap-2',
              showRules && 'border-amber-500/30 text-amber-400'
            )}
          >
            <Settings2 className="h-4 w-4" />
            Vendor Rules ({rules.length || '...'})
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4">
          <p className="text-sm text-white/50">Coverage</p>
          <p className={cn('text-2xl font-bold', coverage >= 95 ? 'text-green-400' : coverage >= 80 ? 'text-amber-400' : 'text-red-400')}>
            {coverage}%
          </p>
          <p className="text-xs text-white/40">{totalTransactions - totalUntagged} / {totalTransactions} tagged</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/50">Untagged</p>
          <p className={cn('text-2xl font-bold', totalUntagged === 0 ? 'text-green-400' : 'text-amber-400')}>
            {totalUntagged}
          </p>
          <p className="text-xs text-white/40">transactions need codes</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/50">Vendor Groups</p>
          <p className="text-2xl font-bold text-white">{groups.length}</p>
          <p className="text-xs text-white/40">unique vendors</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-white/50">R&D Spend</p>
          <p className="text-2xl font-bold text-lime-400">{formatMoney(data?.rd?.totalSpend || 0)}</p>
          <p className="text-xs text-white/40">43.5% refund = {formatMoney((data?.rd?.totalSpend || 0) * 0.435)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search vendor name or project code..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
        />
      </div>

      {/* Vendor Rules Panel */}
      {showRules && (
        <div className="glass-card p-6 mb-6 border border-amber-500/20">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-amber-400" />
            Vendor → Project Rules
          </h2>
          <p className="text-sm text-white/50 mb-4">
            Rules auto-tag future transactions. Matching is case-insensitive on vendor name and aliases.
          </p>

          {/* Add new rule */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newRule.vendor_name}
              onChange={e => setNewRule(prev => ({ ...prev, vendor_name: e.target.value }))}
              placeholder="Vendor name..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20"
            />
            <select
              value={newRule.project_code}
              onChange={e => setNewRule(prev => ({ ...prev, project_code: e.target.value }))}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-white/20"
            >
              <option value="">Select project...</option>
              {projectCodes.map(p => (
                <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
              ))}
            </select>
            <button
              onClick={() => newRule.vendor_name && newRule.project_code && addRuleMutation.mutate(newRule)}
              disabled={!newRule.vendor_name || !newRule.project_code}
              className="btn-glass flex items-center gap-1 disabled:opacity-30"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          {/* Rules list */}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {rules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-white/70 min-w-[200px]">{rule.vendor_name}</span>
                  <span className="text-xs text-white/30">→</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded text-xs font-mono',
                    rule.rd_eligible ? 'bg-lime-500/20 text-lime-400' : 'bg-white/10 text-white/60'
                  )}>
                    {rule.project_code}
                  </span>
                  {rule.aliases?.length > 0 && (
                    <span className="text-xs text-white/30">aliases: {rule.aliases.join(', ')}</span>
                  )}
                </div>
                <button
                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {rules.length === 0 && (
              <p className="text-sm text-white/30 py-4 text-center">No vendor rules yet</p>
            )}
          </div>
        </div>
      )}

      {/* Untagged Groups Table */}
      {isLoading ? (
        <div className="glass-card p-12 text-center text-white/40">Loading transactions...</div>
      ) : totalUntagged === 0 ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-green-400 mb-1">100% Coverage</h2>
          <p className="text-white/50">All transactions are tagged with project codes</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40 uppercase tracking-wider">
                <th className="text-left py-3 px-4">Vendor</th>
                <th className="text-left py-3 px-2">Type</th>
                <th className="text-right py-3 px-2">Count</th>
                <th className="text-right py-3 px-2">Total</th>
                <th className="text-left py-3 px-2">Dates</th>
                <th className="text-left py-3 px-4 min-w-[240px]">Project Code</th>
                <th className="text-center py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(group => {
                const key = `${group.contactName}::${group.type}`
                const selectedCode = pendingTags[key] || ''
                return (
                  <tr key={key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm text-white">{group.contactName}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        group.type.startsWith('SPEND') ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      )}>
                        {group.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-white/60 tabular-nums">{group.count}</td>
                    <td className="py-3 px-2 text-right text-sm text-white/70 tabular-nums font-medium">{formatMoney(group.total)}</td>
                    <td className="py-3 px-2 text-xs text-white/40">{group.sampleDates.join(', ')}</td>
                    <td className="py-3 px-4">
                      {group.suggestedCode ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => acceptSuggestion(group)}
                            disabled={tagMutation.isPending}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3" />
                            {group.suggestedCode}
                          </button>
                          <span className="text-xs text-white/20">or</span>
                          <select
                            value={selectedCode}
                            onChange={e => setPendingTags(prev => ({ ...prev, [key]: e.target.value }))}
                            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-white/20"
                          >
                            <option value="">Other...</option>
                            {projectCodes.map(p => (
                              <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (() => {
                        const ai = aiSuggestions[key]
                        return (
                          <div className="flex items-center gap-2">
                            {ai?.code ? (
                              <>
                                <button
                                  onClick={() => handleTag(group, ai.code!, true)}
                                  disabled={tagMutation.isPending}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs hover:bg-violet-500/20 transition-colors disabled:opacity-50"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  {ai.code}
                                </button>
                                <span className="text-xs text-white/20">or</span>
                              </>
                            ) : (
                              <button
                                onClick={() => requestAiSuggestion(group)}
                                disabled={ai?.loading}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 text-xs hover:text-violet-400 hover:border-violet-500/20 transition-colors disabled:opacity-50"
                              >
                                <Sparkles className={cn('h-3 w-3', ai?.loading && 'animate-spin')} />
                                {ai?.loading ? 'Thinking...' : 'AI Suggest'}
                              </button>
                            )}
                            <select
                              value={selectedCode}
                              onChange={e => setPendingTags(prev => ({ ...prev, [key]: e.target.value }))}
                              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-white/20"
                            >
                              <option value="">{ai?.code ? 'Other...' : 'Select project...'}</option>
                              {projectCodes.map(p => (
                                <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                              ))}
                            </select>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {selectedCode && (
                        <button
                          onClick={() => applyPending(group)}
                          disabled={tagMutation.isPending}
                          className="btn-glass text-xs px-2 py-1 flex items-center gap-1 mx-auto disabled:opacity-50"
                        >
                          <Save className="h-3 w-3" />
                          Tag + Rule
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
