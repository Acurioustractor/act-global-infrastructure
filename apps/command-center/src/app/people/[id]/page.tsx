'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  getContactDetail,
  getContactInteractions,
  getContactMeetings,
  getContactOpportunities,
  getContactName,
  getTemperatureCategory,
  updateContactTag,
  type ContactDetail,
  type Interaction,
  type Meeting,
  type Opportunity,
} from '@/lib/api'
import { formatDate, formatRelativeDate, cn, getTemperatureColor, getTemperatureBg } from '@/lib/utils'
import { LoadingPage } from '@/components/ui/loading'
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Flame,
  Sun,
  Snowflake,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MessageSquare,
  Briefcase,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Hash,
  MapPin,
  AlertCircle,
  User,
  Plus,
  X,
} from 'lucide-react'

const tabs = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: MessageSquare },
  { id: 'meetings', label: 'Meetings', icon: Calendar },
  { id: 'projects', label: 'Projects', icon: Briefcase },
] as const

type TabId = (typeof tabs)[number]['id']

const PROJECT_CODES = ['JH', 'EL', 'HARVEST', 'FARM', 'STUDIO', 'GOODS', 'WORLD-TOUR', 'OPS', 'TECH', 'PICC'] as const

const channelIcons: Record<string, string> = {
  email: '📧',
  call: '📞',
  sms: '💬',
  calendar: '📅',
  meeting: '📅',
  note: '📝',
  whatsapp: '💬',
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const { data: contactData, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => getContactDetail(id),
  })

  const { data: interactionsData } = useQuery({
    queryKey: ['contact', id, 'interactions'],
    queryFn: () => getContactInteractions(id, { limit: 50 }),
    enabled: activeTab === 'activity' || activeTab === 'overview',
  })

  const { data: meetingsData } = useQuery({
    queryKey: ['contact', id, 'meetings'],
    queryFn: () => getContactMeetings(id),
    enabled: activeTab === 'meetings' || activeTab === 'overview',
  })

  const { data: opportunitiesData } = useQuery({
    queryKey: ['contact', id, 'opportunities'],
    queryFn: () => getContactOpportunities(id),
    enabled: activeTab === 'projects' || activeTab === 'overview',
  })

  if (isLoading) return <LoadingPage />

  if (error || !contactData?.contact) {
    return (
      <div className="min-h-screen p-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to People
        </button>
        <div className="glass-card p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white/60">Contact not found or failed to load.</p>
        </div>
      </div>
    )
  }

  const contact = contactData.contact
  const name = getContactName(contact)
  const tempCategory = getTemperatureCategory(contact.temperature)
  const tempColor = getTemperatureColor(tempCategory)
  const tempBg = getTemperatureBg(tempCategory)
  const email = contact.contact_email || contact.email
  const TempIcon = tempCategory === 'hot' ? Flame : tempCategory === 'warm' ? Sun : Snowflake
  const TrendIcon = contact.temperature_trend === 'rising' ? TrendingUp
    : contact.temperature_trend === 'falling' ? TrendingDown
    : Minus

  return (
    <div className="min-h-screen p-8">
      {/* Back nav */}
      <button onClick={() => router.push('/people')} className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to People
      </button>

      {/* Header */}
      <header className="glass-card p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className={cn('flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl', tempBg)}>
            <span className={cn('text-2xl font-bold', tempColor)}>
              {name.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white truncate">{name}</h1>
              <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm', tempBg)}>
                <TempIcon className={cn('h-4 w-4', tempColor)} />
                <span className={cn('font-medium', tempColor)}>
                  {typeof contact.temperature === 'number' ? contact.temperature : tempCategory}
                </span>
                {contact.temperature_trend && contact.temperature_trend !== 'stable' && (
                  <TrendIcon className={cn('h-3.5 w-3.5', contact.temperature_trend === 'rising' ? 'text-green-400' : 'text-red-400')} />
                )}
              </div>
              {contact.lcaa_stage && (
                <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-sm font-medium">
                  {contact.lcaa_stage.toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/50">
              {contact.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {contact.company}
                </span>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Mail className="h-4 w-4" />
                  {email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
                  <Phone className="h-4 w-4" />
                  {contact.phone}
                </a>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2">
            {email && (
              <a href={`mailto:${email}`} className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="px-4 py-2 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-white/10 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-white/50 hover:text-white/70'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          contact={contact}
          interactions={interactionsData?.interactions || []}
          meetings={meetingsData?.meetings || []}
          opportunities={opportunitiesData?.opportunities || []}
          totalInteractions={interactionsData?.total || 0}
        />
      )}
      {activeTab === 'activity' && (
        <ActivityTab interactions={interactionsData?.interactions || []} total={interactionsData?.total || 0} />
      )}
      {activeTab === 'meetings' && (
        <MeetingsTab upcoming={meetingsData?.upcoming || []} past={meetingsData?.past || []} />
      )}
      {activeTab === 'projects' && (
        <ProjectsTab contact={contact} opportunities={opportunitiesData?.opportunities || []} contactId={id} queryClient={queryClient} />
      )}
    </div>
  )
}

// ---- Overview Tab ----
function OverviewTab({
  contact,
  interactions,
  meetings,
  opportunities,
  totalInteractions,
}: {
  contact: ContactDetail
  interactions: Interaction[]
  meetings: Meeting[]
  opportunities: Opportunity[]
  totalInteractions: number
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left column - Engagement stats */}
      <div className="col-span-2 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Touchpoints" value={contact.total_touchpoints || 0} icon={MessageSquare} />
          <StatCard label="Inbound" value={contact.inbound_count || 0} icon={ArrowDownLeft} color="text-green-400" />
          <StatCard label="Outbound" value={contact.outbound_count || 0} icon={ArrowUpRight} color="text-blue-400" />
          <StatCard label="Days Since Contact" value={contact.days_since_contact ?? '—'} icon={Clock} color={
            (contact.days_since_contact || 0) > 60 ? 'text-red-400' : (contact.days_since_contact || 0) > 30 ? 'text-orange-400' : 'text-green-400'
          } />
        </div>

        {/* Recent activity */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          {interactions.length === 0 ? (
            <p className="text-white/40 text-sm">No interaction history recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {interactions.slice(0, 5).map((i) => (
                <InteractionRow key={i.id} interaction={i} />
              ))}
              {totalInteractions > 5 && (
                <p className="text-xs text-white/40 pt-2">
                  + {totalInteractions - 5} more interactions
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right column - Details */}
      <div className="space-y-6">
        {/* Suggested actions */}
        {contact.suggested_actions && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Suggested Actions</h3>
            <p className="text-sm text-white/60">{contact.suggested_actions}</p>
          </div>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/60">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming meetings */}
        {meetings.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Upcoming Meetings</h3>
            <div className="space-y-2">
              {meetings
                .filter((m) => new Date(m.start_time) >= new Date())
                .slice(0, 3)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-white/70 truncate">{m.title}</span>
                    <span className="text-white/40 text-xs ml-auto">{formatDate(m.start_time)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Opportunities */}
        {opportunities.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Pipeline</h3>
            <div className="space-y-2">
              {opportunities.slice(0, 3).map((o) => (
                <div key={o.id} className="text-sm">
                  <div className="text-white/70 truncate">{o.name}</div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span>{o.stage_name}</span>
                    {o.monetary_value != null && o.monetary_value > 0 && (
                      <span className="text-green-400">${o.monetary_value.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source */}
        {contact.source && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">Source</h3>
            <p className="text-sm text-white/60">{contact.source}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Activity Tab ----
function ActivityTab({ interactions, total }: { interactions: Interaction[]; total: number }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Interaction History</h3>
        <span className="text-sm text-white/50">{total} total</span>
      </div>
      {interactions.length === 0 ? (
        <div className="py-12 text-center">
          <MessageSquare className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60">No interactions recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interactions.map((i) => (
            <InteractionRow key={i.id} interaction={i} expanded />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Meetings Tab ----
function MeetingsTab({ upcoming, past }: { upcoming: Meeting[]; past: Meeting[] }) {
  return (
    <div className="space-y-6">
      {/* Upcoming */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upcoming Meetings</h3>
        {upcoming.length === 0 ? (
          <p className="text-white/40 text-sm">No upcoming meetings scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <MeetingRow key={m.id} meeting={m} />
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Past Meetings</h3>
        {past.length === 0 ? (
          <p className="text-white/40 text-sm">No past meetings found.</p>
        ) : (
          <div className="space-y-3">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Projects Tab ----
function ProjectsTab({ contact, opportunities, contactId, queryClient }: { contact: ContactDetail; opportunities: Opportunity[]; contactId: string; queryClient: ReturnType<typeof useQueryClient> }) {
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Extract project-like tags
  const projectTags = (contact.tags || []).filter(
    (t) => t.match(/^[A-Z]{2,}/) || t.toLowerCase().includes('project')
  )
  const availableCodes = PROJECT_CODES.filter(c => !projectTags.includes(c))

  async function handleAdd(code: string) {
    setSaving(true)
    try {
      await updateContactTag(contactId, 'add', code)
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
      setShowPicker(false)
    } catch (e) {
      console.error('Failed to add tag:', e)
    }
    setSaving(false)
  }

  async function handleRemove(code: string) {
    setSaving(true)
    try {
      await updateContactTag(contactId, 'remove', code)
      queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
    } catch (e) {
      console.error('Failed to remove tag:', e)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Linked projects with editor */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Linked Projects</h3>
          {availableCodes.length > 0 && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-sm font-medium"
              disabled={saving}
            >
              <Plus className="h-3.5 w-3.5" /> Add Project
            </button>
          )}
        </div>

        {showPicker && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            {availableCodes.map((code) => (
              <button
                key={code}
                onClick={() => handleAdd(code)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors text-sm"
              >
                {code}
              </button>
            ))}
          </div>
        )}

        {projectTags.length === 0 ? (
          <p className="text-white/40 text-sm">No projects linked. Click &quot;Add Project&quot; to assign one.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projectTags.map((tag) => (
              <div key={tag} className="glass-card-sm p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{tag}</p>
                </div>
                <button
                  onClick={() => handleRemove(tag)}
                  disabled={saving}
                  className="p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors"
                  title="Remove project"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pipeline opportunities */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pipeline Opportunities</h3>
        {opportunities.length === 0 ? (
          <div className="py-8 text-center">
            <Briefcase className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No pipeline opportunities found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((o) => (
              <div key={o.id} className="glass-card-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{o.name}</p>
                    <p className="text-sm text-white/50 mt-0.5">
                      {o.pipeline_name} &middot; {o.stage_name}
                    </p>
                  </div>
                  <div className="text-right">
                    {o.monetary_value != null && o.monetary_value > 0 && (
                      <p className="text-green-400 font-semibold">${o.monetary_value.toLocaleString()}</p>
                    )}
                    <p className={cn(
                      'text-xs mt-0.5',
                      o.status === 'won' ? 'text-green-400' : o.status === 'lost' ? 'text-red-400' : 'text-white/40'
                    )}>
                      {o.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Shared Components ----

function StatCard({ label, value, icon: Icon, color = 'text-white' }: {
  label: string
  value: number | string
  icon: typeof MessageSquare
  color?: string
}) {
  return (
    <div className="glass-card-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', color)} />
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function InteractionRow({ interaction: i, expanded = false }: { interaction: Interaction; expanded?: boolean }) {
  const icon = channelIcons[i.channel] || '📋'
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{i.subject}</span>
          {i.direction && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              i.direction === 'inbound' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
            )}>
              {i.direction}
            </span>
          )}
        </div>
        {expanded && i.snippet && (
          <p className="text-xs text-white/40 mt-1 line-clamp-2">{i.snippet}</p>
        )}
      </div>
      <span className="text-xs text-white/40 flex-shrink-0">{formatRelativeDate(i.occurred_at)}</span>
    </div>
  )
}

function MeetingRow({ meeting: m }: { meeting: Meeting }) {
  const isPast = new Date(m.start_time) < new Date()
  return (
    <div className={cn('p-4 rounded-xl border', isPast ? 'border-white/5 bg-white/[0.02]' : 'border-indigo-500/20 bg-indigo-500/5')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className={cn('h-5 w-5', isPast ? 'text-white/30' : 'text-indigo-400')} />
          <div>
            <p className={cn('font-medium', isPast ? 'text-white/60' : 'text-white')}>{m.title}</p>
            <p className="text-xs text-white/40 mt-0.5">
              {formatDate(m.start_time)}
              {m.end_time && ` — ${new Date(m.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
      </div>
      {m.location && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-white/40">
          <MapPin className="h-3 w-3" />
          {m.location}
        </div>
      )}
    </div>
  )
}
