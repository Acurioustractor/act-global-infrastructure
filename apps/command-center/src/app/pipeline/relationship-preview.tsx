'use client'

import * as React from 'react'
import { X, ExternalLink, Calendar, User, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RankingControls } from './ranking-controls'
import { entityColor, entityTextColor, formatValue, type RelationshipItem } from './utils'

interface RelationshipPreviewProps {
  item: RelationshipItem
  onClose: () => void
  onUpdate: (updates: Partial<RelationshipItem>) => void
}

export function RelationshipPreview({ item, onClose, onUpdate }: RelationshipPreviewProps) {
  const [notes, setNotes] = React.useState(item.notes || '')
  const [nextAction, setNextAction] = React.useState(item.next_action || '')
  const [nextActionDate, setNextActionDate] = React.useState(item.next_action_date || '')
  const [keyContact, setKeyContact] = React.useState(item.key_contact || '')
  const notesTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  // Reset state when item changes
  React.useEffect(() => {
    setNotes(item.notes || '')
    setNextAction(item.next_action || '')
    setNextActionDate(item.next_action_date || '')
    setKeyContact(item.key_contact || '')
  }, [item.id, item.notes, item.next_action, item.next_action_date, item.key_contact])

  // Escape to close
  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const saveNotes = (value: string) => {
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      onUpdate({ notes: value || null })
    }, 800)
  }

  const saveField = (field: string, value: string | null) => {
    onUpdate({ [field]: value || null })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-14 bottom-0 z-[60] w-[28rem] bg-[#0d1117] border-l border-white/[0.08] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur-sm border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', entityColor(item.entity_type))} />
              <span className={cn('text-xs font-semibold uppercase tracking-wider', entityTextColor(item.entity_type))}>
                {item.entity_type}
              </span>
              <span className="text-xs text-white/30 capitalize">
                &middot; {item.stage}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/[0.06] text-white/40 hover:text-white/80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-lg font-semibold text-white mt-2 leading-tight">{item.entity_name}</h2>
          {item.subtitle && (
            <p className="text-sm text-white/40 mt-0.5">{item.subtitle}</p>
          )}
          {(item.value_low || item.value_high) && (
            <p className="text-sm text-green-400 font-medium mt-1">
              {formatValue(item.value_low, item.value_high)}
            </p>
          )}
        </div>

        <div className="p-5 space-y-6">
          {/* Ranking Controls */}
          <div>
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Ranking</h3>
            <RankingControls
              loveScore={item.love_score}
              moneyScore={item.money_score}
              strategicScore={item.strategic_score}
              urgencyScore={item.urgency_score}
              onChange={(dimension, value) => {
                onUpdate({ [`${dimension}_score`]: value })
              }}
            />
          </div>

          {/* Key Contact */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              <User className="h-3 w-3" />
              Key Contact
            </label>
            <input
              type="text"
              value={keyContact}
              onChange={(e) => setKeyContact(e.target.value)}
              onBlur={() => saveField('key_contact', keyContact)}
              placeholder="Contact name..."
              className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              <Calendar className="h-3 w-3" />
              Next Action
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                onBlur={() => saveField('next_action', nextAction)}
                placeholder="What's next..."
                className="flex-1 px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
              />
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => {
                  setNextActionDate(e.target.value)
                  saveField('next_action_date', e.target.value)
                }}
                className="w-36 px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              <StickyNote className="h-3 w-3" />
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                saveNotes(e.target.value)
              }}
              placeholder="Add notes..."
              rows={4}
              className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 resize-none"
            />
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-white/[0.06]">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Details</h3>
            <div className="space-y-1.5 text-xs text-white/40">
              {item.project_codes?.length ? (
                <div className="flex items-center gap-2">
                  <span>Projects:</span>
                  <div className="flex gap-1">
                    {item.project_codes.map((code) => (
                      <span key={code} className="px-1.5 py-0.5 bg-white/[0.06] rounded text-white/60">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {item.last_contact_date && (
                <p>Last contact: {item.last_contact_date}</p>
              )}
              <p>Added: {new Date(item.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(item.updated_at).toLocaleDateString()}</p>
              {item.entity_id && (
                <p className="font-mono text-[10px] text-white/20 mt-2 break-all">
                  {item.entity_type}:{item.entity_id}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
