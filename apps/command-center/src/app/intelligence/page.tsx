'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Zap,
  Filter,
  Mail,
  UserPlus,
  TrendingDown,
  Users,
  Radio,
  GitBranch,
  Search,
  RefreshCw,
} from 'lucide-react'
import { getIntelligenceFeed, getContactSuggestions, type IntelligenceInsight } from '@/lib/api'
import { IntelligenceFeed } from '@/components/intelligence-feed'
import { cn } from '@/lib/utils'

const INSIGHT_TYPES = [
  { key: 'all', label: 'All', icon: Zap },
  { key: 'follow_up', label: 'Follow-ups', icon: Mail },
  { key: 'new_contact', label: 'New Contacts', icon: UserPlus },
  { key: 'relationship_change', label: 'Relationships', icon: TrendingDown },
  { key: 'cross_domain', label: 'Patterns', icon: Zap },
  { key: 'contact_suggestion', label: 'Suggestions', icon: Users },
  { key: 'ecosystem_signal', label: 'Signals', icon: Radio },
  { key: 'knowledge_alignment', label: 'Knowledge', icon: GitBranch },
  { key: 'contact_research', label: 'Research', icon: Search },
]

export default function IntelligencePage() {
  const [activeType, setActiveType] = useState('all')
  const [showHistory, setShowHistory] = useState(false)

  const { data: suggestionsData } = useQuery({
    queryKey: ['intelligence', 'suggestions'],
    queryFn: () => getContactSuggestions(10),
    refetchInterval: 60000,
  })

  const { data: historyData } = useQuery({
    queryKey: ['intelligence', 'history'],
    queryFn: () => getIntelligenceFeed({ limit: 50, status: 'all' }),
    enabled: showHistory,
  })

  const { data: signalsData } = useQuery({
    queryKey: ['intelligence', 'signals'],
    queryFn: () => getIntelligenceFeed({ limit: 10, type: 'ecosystem_signal' }),
    refetchInterval: 60000,
  })

  const suggestions = suggestionsData?.suggestions || []
  const signals = signalsData?.insights || []

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <Zap className="h-5 w-5 text-indigo-400" />
          </div>
          Intelligence Center
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Real-time insights across communications, relationships, and knowledge
        </p>
      </header>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {INSIGHT_TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveType(key)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeType === key
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-8">
          <IntelligenceFeed
            maxItems={30}
            type={activeType === 'all' ? undefined : activeType}
            showHeader={false}
          />

          {/* History toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              {showHistory ? 'Hide' : 'Show'} dismissed & acted insights
            </button>

            {showHistory && historyData && (
              <div className="mt-3 space-y-2 opacity-60">
                {historyData.insights
                  .filter(i => i.status !== 'active')
                  .slice(0, 10)
                  .map(insight => (
                    <div key={insight.id} className="glass-card-sm p-2 flex items-center gap-2">
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        insight.status === 'dismissed' ? 'bg-white/5 text-white/30' : 'bg-green-500/10 text-green-400/50'
                      )}>
                        {insight.status}
                      </span>
                      <span className="text-xs text-white/40 truncate">{insight.title}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Contact Suggestions */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Users className="h-4 w-4 text-cyan-400" />
              Contact Suggestions
            </h2>

            {suggestions.length === 0 ? (
              <div className="text-center py-4 text-white/40">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No suggestions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggestions.slice(0, 5).map(suggestion => (
                  <div key={suggestion.id} className="glass-card-sm p-3">
                    <p className="text-sm text-white font-medium truncate">{suggestion.title}</p>
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{suggestion.description}</p>
                    {Array.isArray(suggestion.data?.shared_projects) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(suggestion.data.shared_projects as string[]).map((code: string) => (
                          <span key={code} className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-[10px] text-cyan-400">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ecosystem Signals */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-green-400" />
              Ecosystem Signals
            </h2>

            {signals.length === 0 ? (
              <div className="text-center py-4 text-white/40">
                <Radio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No signals detected yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {signals.slice(0, 5).map(signal => (
                  <div key={signal.id} className="glass-card-sm p-3">
                    <p className="text-sm text-white font-medium">{signal.title}</p>
                    <p className="text-xs text-white/40 mt-0.5">{signal.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-white/30">
                      {signal.data?.mention_count != null && (
                        <span>{String(signal.data.mention_count)} mentions</span>
                      )}
                      {signal.data?.contact_count != null && (
                        <span>{String(signal.data.contact_count)} contacts</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
