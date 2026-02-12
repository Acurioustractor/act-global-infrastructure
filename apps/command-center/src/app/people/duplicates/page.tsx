'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LoadingPage } from '@/components/ui/loading'
import {
  GitMerge,
  AlertCircle,
  Check,
  X,
  ChevronLeft,
  Mail,
  Phone,
  Building2,
  Database,
  ArrowRight,
  SkipForward,
} from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────

interface Identifier {
  source: string
  identifier_type: string
  identifier_value: string
}

interface EntityMatch {
  match_id: string
  match_score: number
  match_reasons: Record<string, number | boolean | string>
  detected_at: string
  entity_a_id: string
  name_a: string
  email_a: string | null
  company_a: string | null
  entity_b_id: string
  name_b: string
  email_b: string | null
  company_b: string | null
  sources_a: string[]
  sources_b: string[]
  identifiers_a: Identifier[]
  identifiers_b: Identifier[]
}

// ─── API Helpers ──────────────────────────────────────────────────

async function fetchMatches(minScore = 0): Promise<{ matches: EntityMatch[]; total_pending: number }> {
  const res = await fetch(`/api/entities/matches?minScore=${minScore}`)
  if (!res.ok) throw new Error('Failed to fetch matches')
  return res.json()
}

async function updateMatchStatus(matchId: string, status: string, notes?: string) {
  const res = await fetch('/api/entities/matches', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId, status, notes }),
  })
  if (!res.ok) throw new Error('Failed to update match')
  return res.json()
}

async function mergeEntities(keepEntityId: string, mergeEntityId: string, matchId: string) {
  const res = await fetch('/api/entities/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keepEntityId, mergeEntityId, matchId }),
  })
  if (!res.ok) throw new Error('Failed to merge entities')
  return res.json()
}

// ─── Main Page ────────────────────────────────────────────────────

export default function EntityDuplicatesPage() {
  const [minScore, setMinScore] = useState(0)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['entity-matches', minScore],
    queryFn: () => fetchMatches(minScore),
  })

  const rejectMutation = useMutation({
    mutationFn: (matchId: string) => updateMatchStatus(matchId, 'rejected'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entity-matches'] }),
  })

  const skipMutation = useMutation({
    mutationFn: (matchId: string) => updateMatchStatus(matchId, 'deferred', 'Skipped from review queue'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entity-matches'] }),
  })

  if (isLoading) return <LoadingPage />
  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load entity matches. {(error as Error)?.message}</span>
          </div>
        </div>
      </div>
    )
  }

  const matches = data?.matches || []
  const totalPending = data?.total_pending || 0

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-24 sm:pb-8">
      {/* Header */}
      <header className="mb-6">
        <Link
          href="/people"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/60 mb-3 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          People
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <GitMerge className="h-7 w-7 sm:h-8 sm:w-8 text-purple-400" />
              Entity Resolution
            </h1>
            <p className="text-sm text-white/60 mt-1">
              {totalPending} pending matches across all sources
            </p>
          </div>

          {/* Score Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Min score:</span>
            <div className="flex gap-1">
              {[0, 0.3, 0.5, 0.7].map(score => (
                <button
                  key={score}
                  onClick={() => setMinScore(score)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    minScore === score
                      ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/50'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {score === 0 ? 'All' : `${(score * 100).toFixed(0)}%+`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 mt-4 glass-card p-3">
          <div>
            <span className="text-xl font-bold text-white">{totalPending}</span>
            <span className="text-xs text-white/50 ml-1.5">pending</span>
          </div>
          <div>
            <span className="text-xl font-bold text-purple-400">{matches.length}</span>
            <span className="text-xs text-white/50 ml-1.5">showing</span>
          </div>
        </div>
      </header>

      {/* Match Cards */}
      {matches.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Check className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-4 text-white/60">No pending matches to review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map(match => (
            <MatchCard
              key={match.match_id}
              match={match}
              onReject={() => rejectMutation.mutate(match.match_id)}
              onSkip={() => skipMutation.mutate(match.match_id)}
              isRejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Match Card ───────────────────────────────────────────────────

function MatchCard({ match, onReject, onSkip, isRejecting }: {
  match: EntityMatch
  onReject: () => void
  onSkip: () => void
  isRejecting: boolean
}) {
  const [keepSide, setKeepSide] = useState<'a' | 'b'>('a')
  const [merged, setMerged] = useState(false)
  const queryClient = useQueryClient()

  const mergeMutation = useMutation({
    mutationFn: () => {
      const keepId = keepSide === 'a' ? match.entity_a_id : match.entity_b_id
      const mergeId = keepSide === 'a' ? match.entity_b_id : match.entity_a_id
      return mergeEntities(keepId, mergeId, match.match_id)
    },
    onSuccess: () => {
      setMerged(true)
      queryClient.invalidateQueries({ queryKey: ['entity-matches'] })
    },
  })

  if (merged) {
    return (
      <div className="glass-card p-4 flex items-center gap-3 opacity-60">
        <Check className="h-5 w-5 text-emerald-400" />
        <span className="text-sm text-emerald-400">
          Merged: {match.name_a} + {match.name_b}
        </span>
      </div>
    )
  }

  const scorePercent = (match.match_score * 100).toFixed(0)
  const scoreColor = match.match_score >= 0.7 ? 'text-red-400' : match.match_score >= 0.5 ? 'text-amber-400' : 'text-white/50'

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-3">
        <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>{scorePercent}%</span>
        <span className="text-xs text-white/40">match score</span>

        {/* Match reasons */}
        <div className="flex gap-1.5 ml-2">
          {Object.entries(match.match_reasons).map(([key, value]) => {
            if (value === 0 || value === false) return null
            const label = key.replace(/_/g, ' ')
            const display = typeof value === 'number' ? `${(value * 100).toFixed(0)}%` : ''
            return (
              <span
                key={key}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50"
              >
                {label}{display ? `: ${display}` : ''}
              </span>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={onSkip}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Skip for now"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            onClick={onReject}
            disabled={isRejecting}
            className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Not a duplicate"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-0">
        <EntitySide
          label="A"
          name={match.name_a}
          email={match.email_a}
          company={match.company_a}
          sources={match.sources_a}
          identifiers={match.identifiers_a}
          isKeep={keepSide === 'a'}
          onSelect={() => setKeepSide('a')}
        />

        {/* Center merge arrow */}
        <div className="hidden sm:flex flex-col items-center justify-center px-3 border-x border-white/5">
          <ArrowRight className="h-4 w-4 text-white/20" />
        </div>

        <EntitySide
          label="B"
          name={match.name_b}
          email={match.email_b}
          company={match.company_b}
          sources={match.sources_b}
          identifiers={match.identifiers_b}
          isKeep={keepSide === 'b'}
          onSelect={() => setKeepSide('b')}
        />
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-white/30">
          Keeping: <span className="text-white/60">{keepSide === 'a' ? match.name_a : match.name_b}</span>
        </span>
        <button
          onClick={() => mergeMutation.mutate()}
          disabled={mergeMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <GitMerge className="h-4 w-4" />
          {mergeMutation.isPending ? 'Merging...' : 'Merge'}
        </button>
      </div>

      {mergeMutation.isError && (
        <div className="px-4 py-2 bg-red-500/10 text-red-400 text-xs">
          Merge failed: {(mergeMutation.error as Error)?.message}
        </div>
      )}
    </div>
  )
}

// ─── Entity Side ──────────────────────────────────────────────────

function EntitySide({ label, name, email, company, sources, identifiers, isKeep, onSelect }: {
  label: string
  name: string
  email: string | null
  company: string | null
  sources: string[]
  identifiers: Identifier[]
  isKeep: boolean
  onSelect: () => void
}) {
  const phones = identifiers.filter(i => i.identifier_type === 'phone')
  const emails = identifiers.filter(i => i.identifier_type === 'email')

  return (
    <div
      className={`p-4 cursor-pointer transition-colors ${
        isKeep ? 'bg-purple-500/5 ring-1 ring-inset ring-purple-500/20' : 'hover:bg-white/[0.02]'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            isKeep
              ? 'border-purple-500 bg-purple-500'
              : 'border-white/20 hover:border-white/40'
          }`}
        >
          {isKeep && <Check className="h-3 w-3 text-white" />}
        </button>
        <span className="text-sm font-medium text-white">{name}</span>
        {isKeep && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-medium">keep</span>
        )}
      </div>

      <div className="space-y-1.5 text-xs">
        {email && (
          <div className="flex items-center gap-2 text-white/50">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{email}</span>
          </div>
        )}
        {emails.filter(e => e.identifier_value !== email).map(e => (
          <div key={e.identifier_value} className="flex items-center gap-2 text-white/30">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{e.identifier_value}</span>
            <span className="text-[10px] text-white/20">({e.source})</span>
          </div>
        ))}
        {phones.map(p => (
          <div key={p.identifier_value} className="flex items-center gap-2 text-white/50">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{p.identifier_value}</span>
          </div>
        ))}
        {company && (
          <div className="flex items-center gap-2 text-white/50">
            <Building2 className="h-3 w-3 shrink-0" />
            <span>{company}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-white/30 pt-1">
          <Database className="h-3 w-3 shrink-0" />
          <div className="flex gap-1">
            {sources.map(s => (
              <span
                key={s}
                className={`text-[10px] px-1.5 py-0.5 rounded ${
                  s === 'ghl' ? 'bg-blue-500/20 text-blue-400'
                    : s === 'xero' ? 'bg-emerald-500/20 text-emerald-400'
                    : s === 'gmail' ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/40'
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
