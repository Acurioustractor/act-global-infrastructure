'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getContactDetail,
  getContactInteractions,
  getTemperatureCategory,
  type ContactDetail,
  type Interaction,
} from '@/lib/api'
import { ghlContactUrl, formatRelativeDate } from '@/lib/utils'
import {
  X,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  MessageSquare,
  Thermometer,
  Mail,
  ExternalLink,
} from 'lucide-react'

const SENTIMENT_COLORS: Record<string, string> = {
  positive: 'bg-emerald-500/20 text-emerald-400',
  neutral: 'bg-white/10 text-white/60',
  negative: 'bg-red-500/20 text-red-400',
}

interface ContactDrawerProps {
  ghlId: string
  onClose: () => void
  onUpdateContact?: (id: string, updates: Record<string, string>) => void
  /** Extra content rendered below the header (e.g. project tag chips) */
  headerExtra?: React.ReactNode
}

export function ContactDrawer({ ghlId, onClose, headerExtra }: ContactDrawerProps) {
  const [interactionPage, setInteractionPage] = useState(0)
  const PAGE_SIZE = 15

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['contact', ghlId, 'detail'],
    queryFn: () => getContactDetail(ghlId),
  })

  const { data: interactionsData, isLoading: intLoading } = useQuery({
    queryKey: ['contact', ghlId, 'interactions', interactionPage],
    queryFn: () => getContactInteractions(ghlId, { limit: PAGE_SIZE, offset: interactionPage * PAGE_SIZE }),
  })

  const contact = detailData?.contact
  const interactions = interactionsData?.interactions || []
  const totalInteractions = interactionsData?.total || 0
  const tempCategory = contact ? getTemperatureCategory(contact.temperature) : 'cool'

  const recommendations = generateRecommendations(contact, interactions)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-[#0f1117] border-l border-white/10 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f1117]/95 backdrop-blur border-b border-white/10 p-6 z-10">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {detailLoading ? (
                <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
              ) : (
                <>
                  <h2 className="text-xl font-bold text-white truncate">
                    {contact?.contact_name || contact?.name || 'Unknown'}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">{contact?.email || contact?.contact_email}</p>
                  {contact?.company && (
                    <p className="text-xs text-white/40 mt-0.5">{contact.company}</p>
                  )}
                </>
              )}
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white/60 ml-4">
              <X className="h-5 w-5" />
            </button>
          </div>

          {contact && (
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                tempCategory === 'hot' ? 'bg-red-500/20 text-red-400' :
                tempCategory === 'warm' ? 'bg-amber-500/20 text-amber-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                <Thermometer className="h-3 w-3" />
                {tempCategory}
              </div>
              {contact.tags?.filter(t => !['goods', 'justicehub', 'picc', 'empathy-ledger', 'diagrama'].includes(t)).slice(0, 5).map(t => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50">
                  {t}
                </span>
              ))}
            </div>
          )}

          {headerExtra}
        </div>

        {/* Engagement Stats */}
        {contact && (
          <div className="p-6 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Engagement
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">{contact.total_touchpoints || 0}</p>
                <p className="text-[10px] text-white/40">Touchpoints</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-white">
                  {contact.inbound_count || 0} / {contact.outbound_count || 0}
                </p>
                <p className="text-[10px] text-white/40">In / Out</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className={`text-lg font-bold ${
                  contact.days_since_contact === null ? 'text-red-400' :
                  (contact.days_since_contact ?? 0) > 30 ? 'text-amber-400' : 'text-white'
                }`}>
                  {contact.days_since_contact != null ? `${contact.days_since_contact}d` : '—'}
                </p>
                <p className="text-[10px] text-white/40">Since Contact</p>
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="p-6 border-b border-white/10">
            <h3 className="text-sm font-medium text-white/70 mb-3">Recommendations</h3>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-white/70">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communication Timeline */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Communication History
            {totalInteractions > 0 && <span className="text-white/40">({totalInteractions})</span>}
          </h3>

          {intLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-white/40 py-4 text-center">No communication history</p>
          ) : (
            <div className="space-y-2">
              {interactions.map(interaction => (
                <div key={interaction.id} className="p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    {interaction.direction === 'outbound' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    ) : (
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-white truncate flex-1">
                      {interaction.subject}
                    </span>
                    <span className="text-[10px] text-white/30 shrink-0">
                      {formatRelativeDate(interaction.occurred_at)}
                    </span>
                  </div>
                  {interaction.snippet && (
                    <p className="text-xs text-white/40 line-clamp-2 ml-6">
                      {interaction.snippet}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 ml-6">
                    <span className="text-[10px] text-white/30">{interaction.channel}</span>
                    {interaction.sentiment && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${SENTIMENT_COLORS[interaction.sentiment] || SENTIMENT_COLORS.neutral}`}>
                        {interaction.sentiment}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {totalInteractions > (interactionPage + 1) * PAGE_SIZE && (
                <button
                  onClick={() => setInteractionPage(p => p + 1)}
                  className="w-full py-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Load more...
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <a
              href={ghlContactUrl(ghlId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Open in GHL
              <ExternalLink className="h-3 w-3" />
            </a>
            {(contact?.email || contact?.contact_email) && (
              <a
                href={`mailto:${contact?.email || contact?.contact_email}`}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium bg-white/10 text-white/70 rounded-lg hover:bg-white/15 transition-colors"
              >
                <Mail className="h-3 w-3" />
                Send Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function generateRecommendations(contact: ContactDetail | undefined, interactions: Interaction[]): string[] {
  if (!contact) return []
  const recs: string[] = []
  const days = contact.days_since_contact

  if (days === null || days === undefined) {
    recs.push('New contact — send a welcome message')
    return recs
  }

  if (days > 60) {
    recs.push(`No contact in ${days} days — re-engage with a recent update`)
  } else if (days > 30) {
    recs.push(`${days} days since last contact — good time to check in`)
  }

  if ((contact.outbound_count || 0) > 0 && (contact.inbound_count || 0) === 0) {
    recs.push('All outbound so far — wait for their response before following up')
  } else if ((contact.outbound_count || 0) >= 3 * Math.max(contact.inbound_count || 1, 1)) {
    recs.push('Outbound-heavy ratio — let them initiate next')
  }

  const recentSentiments = interactions.slice(0, 5).map(i => i.sentiment).filter(Boolean)
  const positiveCount = recentSentiments.filter(s => s === 'positive').length
  if (positiveCount >= 3) {
    recs.push('Positive sentiment trend — good time to deepen engagement')
  }

  if (days <= 7 && (contact.total_touchpoints || 0) > 5) {
    recs.push('Active relationship — maintain current engagement rhythm')
  }

  return recs.slice(0, 3)
}
