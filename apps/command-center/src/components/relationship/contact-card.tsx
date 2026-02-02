'use client'

import { type Contact, getContactName, getTemperatureCategory } from '@/lib/api'
import { formatRelativeDate, cn, getTemperatureColor, getTemperatureBg } from '@/lib/utils'
import { Mail, Phone, Building2, Clock, Flame, Sun, Snowflake, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ContactCardProps {
  contact: Contact
}

const temperatureIcons = {
  hot: Flame,
  warm: Sun,
  cool: Snowflake,
}

export function ContactCard({ contact }: ContactCardProps) {
  const router = useRouter()
  const name = getContactName(contact)
  const tempCategory = getTemperatureCategory(contact.temperature)
  const TempIcon = temperatureIcons[tempCategory] || Snowflake
  const tempColor = getTemperatureColor(tempCategory)
  const tempBg = getTemperatureBg(tempCategory)
  const email = contact.contact_email || contact.email
  const lastContact = contact.last_contact_at || contact.last_contact_date

  const TrendIcon = contact.temperature_trend === 'rising' ? TrendingUp
    : contact.temperature_trend === 'falling' ? TrendingDown
    : Minus

  return (
    <div
      onClick={() => router.push(`/people/${contact.id}`)}
      className="group glass-card-sm p-4 hover:border-indigo-500/30 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
            tempBg
          )}
        >
          <span className={cn('text-lg font-semibold', tempColor)}>
            {name.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">
              {name}
            </h3>
            <TempIcon className={cn('h-4 w-4', tempColor)} />
            {typeof contact.temperature === 'number' && (
              <span className={cn('text-xs', tempColor)}>
                {contact.temperature}
              </span>
            )}
            {contact.temperature_trend && contact.temperature_trend !== 'stable' && (
              <TrendIcon className={cn('h-3 w-3', contact.temperature_trend === 'rising' ? 'text-green-400' : 'text-red-400')} />
            )}
            {contact.total_touchpoints != null && contact.total_touchpoints > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                {contact.total_touchpoints} touchpoint{contact.total_touchpoints !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
            {contact.company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {contact.company}
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3.5 w-3.5" />
                {email}
              </span>
            )}
            {contact.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {contact.phone}
              </span>
            )}
          </div>

          {/* Last contact */}
          {lastContact && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              Last contact: {formatRelativeDate(lastContact)}
              {contact.days_since_contact !== undefined && contact.days_since_contact > 30 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                  Needs follow-up
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {contact.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-white/60"
                >
                  {tag}
                </span>
              ))}
              {contact.tags.length > 4 && (
                <span className="text-xs text-white/40">
                  +{contact.tags.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {email && (
            <a
              href={`mailto:${email}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              title="Send email"
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              title="Call"
            >
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
