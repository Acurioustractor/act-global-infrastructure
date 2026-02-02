'use client'

import * as React from 'react'
import Link from 'next/link'
import { Mail, Phone, CheckCheck, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markContactedToday, snoozeContact } from '@/lib/api'

interface ContactWithReason {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  days_since_contact?: number
  tags?: string[]
  reason: 'overdue' | 'cooling' | 'maintain'
}

interface ContactTodayRowProps {
  contact: ContactWithReason
  onMarkContacted?: (id: string) => void
  onSnooze?: (id: string, days: number) => void
}

const reasonColors = {
  overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: '60+ days' },
  cooling: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Cooling' },
  maintain: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Maintain' },
}

export function ContactTodayRow({ contact, onMarkContacted, onSnooze }: ContactTodayRowProps) {
  const [isActioning, setIsActioning] = React.useState(false)
  const [actionDone, setActionDone] = React.useState<string | null>(null)

  const reason = reasonColors[contact.reason] || reasonColors.maintain

  // Extract project tags
  const projectTags = (contact.tags || []).filter((tag: string) =>
    tag.match(/^(JH|EL|TF|TH|TS|ACT|PICC|BEN)/i) ||
    tag.toLowerCase().includes('justicehub') ||
    tag.toLowerCase().includes('empathy') ||
    tag.toLowerCase().includes('harvest') ||
    tag.toLowerCase().includes('farm') ||
    tag.toLowerCase().includes('studio')
  )

  const handleMarkContacted = async () => {
    setIsActioning(true)
    try {
      await markContactedToday(contact.id)
      setActionDone('contacted')
      onMarkContacted?.(contact.id)
    } catch (e) {
      console.error('Failed to mark contacted:', e)
    }
    setIsActioning(false)
  }

  const handleSnooze = async (days: number) => {
    setIsActioning(true)
    try {
      await snoozeContact(contact.id, days)
      setActionDone(`snoozed ${days}d`)
      onSnooze?.(contact.id, days)
    } catch (e) {
      console.error('Failed to snooze:', e)
    }
    setIsActioning(false)
  }

  if (actionDone) {
    return (
      <div className="glass-card-sm p-3 bg-green-500/10 border-green-500/20">
        <div className="flex items-center gap-3">
          <CheckCheck className="h-5 w-5 text-green-400" />
          <span className="text-sm text-green-400">
            {actionDone === 'contacted'
              ? `Marked ${contact.name} as contacted`
              : `Snoozed ${contact.name}`}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card-sm p-3 hover:border-indigo-500/30 transition-all group">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0',
            reason.bg,
            reason.text
          )}
        >
          {contact.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/people/${contact.id}`} className="text-sm font-medium text-white truncate hover:text-indigo-300 transition-colors">
              {contact.name}
            </Link>
            <span className={cn('px-1.5 py-0.5 rounded text-xs', reason.bg, reason.text)}>
              {reason.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {contact.company && (
              <span className="text-xs text-white/40 truncate">{contact.company}</span>
            )}
            {contact.days_since_contact !== undefined && (
              <span className="text-xs text-white/40">{contact.days_since_contact}d ago</span>
            )}
          </div>
          {/* Project Tags */}
          {projectTags.length > 0 && (
            <div className="flex gap-1 mt-1.5">
              {projectTags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-xs bg-indigo-500/20 text-indigo-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Inline Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleMarkContacted}
            disabled={isActioning}
            className="p-1.5 rounded-lg hover:bg-green-500/20 text-white/60 hover:text-green-400 transition-colors"
            title="Mark as contacted"
          >
            <CheckCheck className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleSnooze(7)}
            disabled={isActioning}
            className="p-1.5 rounded-lg hover:bg-amber-500/20 text-white/60 hover:text-amber-400 transition-colors"
            title="Snooze 7 days"
          >
            <Clock3 className="h-4 w-4" />
          </button>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="p-1.5 rounded-lg hover:bg-white/10">
              <Mail className="h-4 w-4 text-white/60" />
            </a>
          )}
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="p-1.5 rounded-lg hover:bg-white/10">
              <Phone className="h-4 w-4 text-white/60" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
