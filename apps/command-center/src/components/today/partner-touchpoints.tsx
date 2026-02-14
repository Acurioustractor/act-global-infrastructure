'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Heart,
  Mail,
  MessageSquare,
  Phone,
  Reply,
  Snowflake,
  Sparkles,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TouchpointEntry {
  contactId: string
  name: string
  email: string | null
  company: string | null
  temperature: number
  daysSinceContact: number
  lcaaStage: string | null
  lastComm: {
    subject: string
    channel: string
    direction: string
    date: string
  } | null
  opportunities: Array<{ name: string; value: number; stage: string | null }>
  pipelineValue: number
  reason: string
}

interface TouchpointData {
  needsFollowUp: TouchpointEntry[]
  goingCold: TouchpointEntry[]
  recentWins: TouchpointEntry[]
  activePartners: TouchpointEntry[]
  summary: {
    totalFollowUp: number
    totalCold: number
    totalActive: number
    totalWins: number
  }
}

const channelIcon = (channel: string) => {
  switch (channel) {
    case 'email': return Mail
    case 'call': case 'phone': return Phone
    default: return MessageSquare
  }
}

function TempDot({ temp }: { temp: number }) {
  return (
    <span className={cn(
      'inline-block w-2 h-2 rounded-full shrink-0',
      temp >= 60 ? 'bg-emerald-400' : temp >= 30 ? 'bg-amber-400' : 'bg-red-400'
    )} />
  )
}

function ContactRow({ entry }: { entry: TouchpointEntry }) {
  const ChannelIcon = entry.lastComm ? channelIcon(entry.lastComm.channel) : MessageSquare

  return (
    <Link
      href={`/people?search=${encodeURIComponent(entry.name)}`}
      className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs group"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <TempDot temp={entry.temperature} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate group-hover:text-indigo-300 transition-colors">
              {entry.name}
            </span>
            {entry.company && (
              <span className="text-white/20 truncate hidden sm:inline">{entry.company}</span>
            )}
          </div>
          <p className="text-white/40 truncate mt-0.5">{entry.reason}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {entry.lastComm && (
          <ChannelIcon className="h-3 w-3 text-white/20" />
        )}
        {entry.pipelineValue > 0 && (
          <span className="text-emerald-400/70 tabular-nums text-[10px]">
            {entry.pipelineValue >= 1000 ? `$${(entry.pipelineValue / 1000).toFixed(0)}K` : `$${entry.pipelineValue}`}
          </span>
        )}
      </div>
    </Link>
  )
}

export function PartnerTouchpoints() {
  const { data, isLoading } = useQuery<TouchpointData>({
    queryKey: ['relationships', 'touchpoints'],
    queryFn: () => fetch('/api/relationships/touchpoints').then(r => r.json()),
    refetchInterval: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data) return null

  const { needsFollowUp, goingCold, recentWins, activePartners, summary } = data
  const totalActions = summary.totalFollowUp + summary.totalCold
  const hasAnything = needsFollowUp.length > 0 || goingCold.length > 0 || recentWins.length > 0 || activePartners.length > 0

  if (!hasAnything) return null

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-400" />
          People This Week
        </h2>
        {totalActions > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
            {totalActions} need attention
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Reply needed — they contacted us */}
        {needsFollowUp.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Reply className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide font-medium">Reply Needed</span>
            </div>
            <div className="space-y-1.5">
              {needsFollowUp.map(entry => (
                <ContactRow key={entry.contactId} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Going cold — re-engage */}
        {goingCold.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Snowflake className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide font-medium">Going Cold</span>
            </div>
            <div className="space-y-1.5">
              {goingCold.map(entry => (
                <ContactRow key={entry.contactId} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Active partners — nurture */}
        {activePartners.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide font-medium">Active Partners</span>
            </div>
            <div className="space-y-1.5">
              {activePartners.map(entry => (
                <ContactRow key={entry.contactId} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {/* Recent wins — thank & strengthen */}
        {recentWins.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] text-white/50 uppercase tracking-wide font-medium">Positive Momentum</span>
            </div>
            <div className="space-y-1.5">
              {recentWins.map(entry => (
                <ContactRow key={entry.contactId} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Link
        href="/people"
        className="block text-center text-xs text-white/30 hover:text-white/50 mt-4 pt-3 border-t border-white/5"
      >
        View all contacts →
      </Link>
    </div>
  )
}
