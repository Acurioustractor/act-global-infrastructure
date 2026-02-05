'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGoodsDashboard,
  updateContactNewsletter,
  updateContactTag,
  updateGoodsContact,
  createGoodsContact,
  getGoodsDuplicates,
  mergeGoodsContacts,
  searchAllContacts,
  type GoodsContact,
  type GoodsContent,
  type GoodsOutreach,
  type DuplicateGroup,
  type SearchContact,
} from '@/lib/api'
import { ghlContactUrl, ghlEmailMarketingUrl, formatRelativeDate } from '@/lib/utils'
import { ContactDrawer } from '@/components/contact-drawer'
import { LoadingPage } from '@/components/ui/loading'
import {
  ShoppingBag,
  Users,
  Mail,
  AlertCircle,
  Search,
  ExternalLink,
  BookOpen,
  FileText,
  Video,
  Megaphone,
  ToggleLeft,
  ToggleRight,
  Globe,
  Plus,
  X,
  Check,
  Pencil,
  Merge,
  AlertTriangle,
} from 'lucide-react'

type Tab = 'overview' | 'contacts' | 'content' | 'newsletter'
type Segment = 'all' | 'funder' | 'partner' | 'community' | 'supporter' | 'storyteller' | 'newsletter'

const SEGMENT_COLORS: Record<string, string> = {
  funder: 'bg-emerald-500/20 text-emerald-400',
  partner: 'bg-blue-500/20 text-blue-400',
  community: 'bg-purple-500/20 text-purple-400',
  supporter: 'bg-amber-500/20 text-amber-400',
  storyteller: 'bg-pink-500/20 text-pink-400',
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-amber-400',
  low: 'bg-blue-400',
}

const CONTENT_ICONS: Record<string, typeof BookOpen> = {
  story: BookOpen,
  article: FileText,
  video: Video,
}

export default function GoodsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [segment, setSegment] = useState<Segment>('all')
  const [search, setSearch] = useState('')
  const [showAddContact, setShowAddContact] = useState(false)
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [showDedupModal, setShowDedupModal] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['goods', 'dashboard'],
    queryFn: getGoodsDashboard,
  })

  const { data: dupData } = useQuery({
    queryKey: ['goods', 'duplicates'],
    queryFn: getGoodsDuplicates,
  })

  const newsletterMutation = useMutation({
    mutationFn: ({ id, subscribe }: { id: string; subscribe: boolean }) =>
      updateContactNewsletter(id, subscribe),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goods'] }),
  })

  const segmentMutation = useMutation({
    mutationFn: ({ id, oldSegment, newSegment }: { id: string; oldSegment: string; newSegment: string }) =>
      Promise.all([
        oldSegment !== 'community' ? updateContactTag(id, 'remove', `goods-${oldSegment}`) : Promise.resolve({ ok: true }),
        newSegment !== 'community' ? updateContactTag(id, 'add', `goods-${newSegment}`) : Promise.resolve({ ok: true }),
      ]),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goods'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, string> }) =>
      updateGoodsContact(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goods'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: { email: string; firstName?: string; lastName?: string; companyName?: string; website?: string; tags?: string[] }) =>
      createGoodsContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goods'] })
      setShowAddContact(false)
    },
  })

  if (isLoading) return <LoadingPage />
  if (error || !data) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load Goods dashboard. {(error as Error)?.message}</span>
          </div>
        </div>
      </div>
    )
  }

  const { segments, contacts, content, outreach } = data

  // Filter contacts for contacts/newsletter tabs
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = !search ||
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.website?.toLowerCase().includes(search.toLowerCase())

    if (tab === 'newsletter') return matchesSearch && c.newsletter_consent

    if (segment === 'all') return matchesSearch
    if (segment === 'newsletter') return matchesSearch && c.newsletter_consent
    return matchesSearch && c.segment === segment
  })

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ShoppingBag className="h-8 w-8 text-emerald-400" />
              Goods Intelligence
            </h1>
            <p className="text-lg text-white/60 mt-1">
              {segments.total} contacts across the Goods network
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddExisting(true)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
            >
              <Search className="h-4 w-4" />
              Add from CRM
            </button>
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Contact
            </button>
            <a
              href={ghlEmailMarketingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <Megaphone className="h-4 w-4" />
              Open GHL Marketing
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-indigo-400" />}
            iconBg="bg-indigo-500/20"
            value={segments.total}
            label="Total Contacts"
          />
          <StatCard
            icon={<Mail className="h-5 w-5 text-emerald-400" />}
            iconBg="bg-emerald-500/20"
            value={segments.newsletter}
            label="Newsletter Subscribers"
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-amber-400" />}
            iconBg="bg-amber-500/20"
            value={segments.needingAttention}
            label="Need Attention"
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-purple-400" />}
            iconBg="bg-purple-500/20"
            value={content.length}
            label="Content Pieces"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-white/10 pb-1">
        {(['overview', 'contacts', 'content', 'newsletter'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setSegment('all') }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'bg-white/10 text-white border-b-2 border-emerald-400'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <OverviewTab
          outreach={outreach}
          content={content}
          segments={segments}
        />
      )}

      {tab === 'contacts' && (
        <>
          {dupData && dupData.count > 0 && (
            <div className="mb-4 glass-card p-4 border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-amber-300">
                  {dupData.count} duplicate contact{dupData.count > 1 ? 's' : ''} found
                </span>
              </div>
              <button
                onClick={() => setShowDedupModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 transition-colors"
              >
                <Merge className="h-3.5 w-3.5" />
                Review &amp; Merge
              </button>
            </div>
          )}
          <ContactsTab
            contacts={filteredContacts}
            segment={segment}
            setSegment={setSegment}
            search={search}
            setSearch={setSearch}
            segments={segments}
            onToggleNewsletter={(id, subscribe) => newsletterMutation.mutate({ id, subscribe })}
            onUpdateContact={(id, updates) => updateMutation.mutate({ id, updates })}
            onSelectContact={(ghlId) => setSelectedContactId(ghlId)}
          />
        </>
      )}

      {tab === 'content' && (
        <ContentTab content={content} />
      )}

      {tab === 'newsletter' && (
        <NewsletterTab
          contacts={filteredContacts}
          totalSubscribers={segments.newsletter}
          contentCount={content.length}
          search={search}
          setSearch={setSearch}
          onToggleNewsletter={(id, subscribe) => newsletterMutation.mutate({ id, subscribe })}
        />
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Add Existing Contact Picker */}
      {showAddExisting && (
        <AddExistingModal
          onClose={() => setShowAddExisting(false)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ['goods'] })}
        />
      )}

      {/* Contact Detail Drawer */}
      {selectedContactId && (
        <ContactDrawer
          ghlId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      {/* Dedup Modal */}
      {showDedupModal && dupData && (
        <DedupModal
          duplicates={dupData.duplicates}
          onClose={() => setShowDedupModal(false)}
          onMerge={async (keepId, mergeIds) => {
            await mergeGoodsContacts(keepId, mergeIds)
            queryClient.invalidateQueries({ queryKey: ['goods'] })
          }}
        />
      )}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({ icon, iconBg, value, label }: {
  icon: React.ReactNode
  iconBg: string
  value: number
  label: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-white/50">{label}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Inline Edit Field ───────────────────────────────────────────

function InlineEditField({ value, onSave, placeholder, className }: {
  value: string
  onSave: (val: string) => void
  placeholder?: string
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft.trim() !== value) {
      onSave(draft.trim())
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(value); setEditing(true) }}
        className={`text-left truncate group flex items-center gap-1 ${className || ''}`}
        title="Click to edit"
      >
        <span className="truncate">{value || <span className="text-white/30 italic">{placeholder || 'Add...'}</span>}</span>
        <Pencil className="h-3 w-3 text-white/20 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value); setEditing(false) }
      }}
      placeholder={placeholder}
      className="bg-white/10 border border-emerald-500/50 rounded px-1.5 py-0.5 text-sm text-white w-full outline-none"
    />
  )
}

// ─── Add Contact Modal ───────────────────────────────────────────

function AddContactModal({ onClose, onSubmit, isLoading }: {
  onClose: () => void
  onSubmit: (data: { email: string; firstName?: string; lastName?: string; companyName?: string; website?: string; tags?: string[] }) => void
  isLoading: boolean
}) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', companyName: '', website: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) return
    onSubmit({
      email: form.email,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      companyName: form.companyName || undefined,
      website: form.website || undefined,
      tags: ['goods'],
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Add Goods Contact</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/60">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">Email *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="name@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1">First Name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="First"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Last Name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Last"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Company</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Organisation name"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">Website</label>
            <input
              value={form.website}
              onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="https://..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.email}
              className="px-4 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────

function OverviewTab({ outreach, content, segments }: {
  outreach: GoodsOutreach[]
  content: GoodsContent[]
  segments: { funders: number; partners: number; community: number; supporters: number; storytellers: number }
}) {
  // Segment breakdown
  const segmentData = [
    { name: 'Funders', count: segments.funders, color: 'text-emerald-400' },
    { name: 'Partners', count: segments.partners, color: 'text-blue-400' },
    { name: 'Community', count: segments.community, color: 'text-purple-400' },
    { name: 'Supporters', count: segments.supporters, color: 'text-amber-400' },
    { name: 'Storytellers', count: segments.storytellers, color: 'text-pink-400' },
  ]

  const unusedContent = content.filter(c => c.times_used_newsletter === 0).slice(0, 5)

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Outreach Recommendations */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Outreach Recommendations
        </h2>
        {outreach.length === 0 ? (
          <p className="text-white/50 text-sm">All contacts are up to date!</p>
        ) : (
          <div className="space-y-3">
            {outreach.slice(0, 8).map(rec => (
              <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-2 ${PRIORITY_DOT[rec.priority]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white truncate">{rec.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${SEGMENT_COLORS[rec.segment] || 'bg-white/10 text-white/60'}`}>
                      {rec.segment}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mt-0.5">{rec.reason}</p>
                </div>
                <a
                  href={ghlContactUrl(rec.ghl_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 shrink-0"
                >
                  Open in GHL
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Segments + Content */}
      <div className="space-y-6">
        {/* Segment Breakdown */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Segments</h2>
          <div className="space-y-3">
            {segmentData.map(s => (
              <div key={s.name} className="flex items-center justify-between">
                <span className={`text-sm ${s.color}`}>{s.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color.replace('text-', 'bg-')}`}
                      style={{ width: `${Math.max(2, (s.count / Math.max(segments.funders, segments.partners, segments.community, segments.supporters, segments.storytellers, 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white w-8 text-right">{s.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Ready */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Content Ready for Newsletter</h2>
          {unusedContent.length === 0 ? (
            <p className="text-white/50 text-sm">All content has been used.</p>
          ) : (
            <div className="space-y-3">
              {unusedContent.map(c => {
                const Icon = CONTENT_ICONS[c.content_type] || FileText
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                    <Icon className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.title}</p>
                      <p className="text-xs text-white/40">
                        {c.content_type} {c.emotional_tone ? `· ${c.emotional_tone}` : ''}
                      </p>
                    </div>
                    {c.url && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Contacts Tab ─────────────────────────────────────────────────

function ContactsTab({ contacts, segment, setSegment, search, setSearch, segments, onToggleNewsletter, onUpdateContact, onSelectContact }: {
  contacts: GoodsContact[]
  segment: Segment
  setSegment: (s: Segment) => void
  search: string
  setSearch: (s: string) => void
  segments: { total: number; newsletter: number; funders: number; partners: number; community: number; supporters: number; storytellers: number }
  onToggleNewsletter: (id: string, subscribe: boolean) => void
  onUpdateContact: (id: string, updates: Record<string, string>) => void
  onSelectContact: (ghlId: string) => void
}) {
  const chips: { key: Segment; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: segments.total },
    { key: 'funder', label: 'Funders', count: segments.funders },
    { key: 'partner', label: 'Partners', count: segments.partners },
    { key: 'community', label: 'Community', count: segments.community },
    { key: 'supporter', label: 'Supporters', count: segments.supporters },
    { key: 'storyteller', label: 'Storytellers', count: segments.storytellers },
    { key: 'newsletter', label: 'Newsletter', count: segments.newsletter },
  ]

  return (
    <div>
      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {chips.map(chip => (
          <button
            key={chip.key}
            onClick={() => setSegment(chip.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              segment === chip.key
                ? 'bg-emerald-500/30 text-emerald-300 ring-1 ring-emerald-500/50'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, company, or website..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Contacts</h2>
          <span className="text-sm text-white/50">{contacts.length} shown</span>
        </div>

        {contacts.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-white/60">No contacts found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_140px_90px_1fr_60px_60px] gap-3 px-3 py-2 text-xs text-white/40 uppercase tracking-wider">
              <span>Name</span>
              <span>Company</span>
              <span>Email</span>
              <span>Segment</span>
              <span>Last Email</span>
              <span>News</span>
              <span>Links</span>
            </div>
            {contacts.map(contact => (
              <ContactRow
                key={contact.id}
                contact={contact}
                onToggleNewsletter={onToggleNewsletter}
                onUpdateContact={onUpdateContact}
                onSelect={() => onSelectContact(contact.ghl_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContactRow({ contact, onToggleNewsletter, onUpdateContact, onSelect }: {
  contact: GoodsContact
  onToggleNewsletter: (id: string, subscribe: boolean) => void
  onUpdateContact: (id: string, updates: Record<string, string>) => void
  onSelect: () => void
}) {
  return (
    <div className="grid grid-cols-[1fr_140px_140px_90px_1fr_60px_60px] gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors items-center cursor-pointer" onClick={onSelect}>
      {/* Name (inline editable) */}
      <div className="min-w-0">
        <InlineEditField
          value={contact.full_name}
          onSave={(val) => {
            const parts = val.split(' ')
            const firstName = parts[0] || ''
            const lastName = parts.slice(1).join(' ') || ''
            onUpdateContact(contact.ghl_id, { firstName, lastName })
          }}
          className="text-sm font-medium text-white"
        />
      </div>
      {/* Company + Website */}
      <div className="min-w-0">
        <InlineEditField
          value={contact.company_name || ''}
          onSave={(val) => onUpdateContact(contact.ghl_id, { companyName: val })}
          placeholder="Company"
          className="text-xs text-white/60"
        />
        {contact.website ? (
          <a
            href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 truncate mt-0.5"
          >
            <Globe className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{contact.website.replace(/^https?:\/\//, '')}</span>
          </a>
        ) : (
          <InlineEditField
            value=""
            onSave={(val) => onUpdateContact(contact.ghl_id, { website: val })}
            placeholder="Website"
            className="text-[10px] text-white/30 mt-0.5"
          />
        )}
      </div>
      <span className="text-sm text-white/60 truncate">{contact.email || '—'}</span>
      <span className={`text-xs px-2 py-1 rounded-full w-fit ${SEGMENT_COLORS[contact.segment] || 'bg-white/10 text-white/60'}`}>
        {contact.segment}
      </span>
      <div className="min-w-0">
        {contact.last_email_subject ? (
          <>
            <p className="text-xs text-white/60 truncate">{contact.last_email_subject}</p>
            <p className={`text-[10px] ${
              contact.days_since_contact === null ? 'text-red-400'
              : contact.days_since_contact > 30 ? 'text-amber-400'
              : 'text-white/30'
            }`}>
              {contact.last_email_date ? formatRelativeDate(contact.last_email_date) : '—'}
            </p>
          </>
        ) : (
          <span className={`text-xs ${contact.days_since_contact === null ? 'text-red-400' : 'text-white/30'}`}>
            {contact.days_since_contact === null ? 'Never contacted' : 'No emails'}
          </span>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleNewsletter(contact.id, !contact.newsletter_consent) }}
        className="flex items-center"
        title={contact.newsletter_consent ? 'Unsubscribe from newsletter' : 'Subscribe to newsletter'}
      >
        {contact.newsletter_consent ? (
          <ToggleRight className="h-6 w-6 text-emerald-400" />
        ) : (
          <ToggleLeft className="h-6 w-6 text-white/30" />
        )}
      </button>
      <a
        href={ghlContactUrl(contact.ghl_id)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
        title="Open in GHL"
        onClick={(e) => e.stopPropagation()}
      >
        GHL
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

// ─── Content Tab ──────────────────────────────────────────────────

function ContentTab({ content }: { content: GoodsContent[] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{content.length} Content Pieces</h2>
      </div>

      {content.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-white/20" />
          <p className="mt-4 text-white/60">No content in the library yet</p>
          <p className="text-sm text-white/40">Run the content sync to populate</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {content.map(item => {
            const Icon = CONTENT_ICONS[item.content_type] || FileText
            return (
              <div key={item.id} className="glass-card p-5 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {item.content_type}
                  </span>
                  {item.times_used_newsletter > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Used {item.times_used_newsletter}x
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-white mb-2 line-clamp-2">{item.title}</h3>
                {item.excerpt && (
                  <p className="text-sm text-white/50 mb-3 line-clamp-3">{item.excerpt}</p>
                )}
                {item.key_message && (
                  <p className="text-xs text-emerald-400/80 italic mb-3">
                    &ldquo;{item.key_message}&rdquo;
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {item.audience_fit?.map(a => (
                    <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{a}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{item.emotional_tone || '—'}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Newsletter Tab ───────────────────────────────────────────────

function NewsletterTab({ contacts, totalSubscribers, contentCount, search, setSearch, onToggleNewsletter }: {
  contacts: GoodsContact[]
  totalSubscribers: number
  contentCount: number
  search: string
  setSearch: (s: string) => void
  onToggleNewsletter: (id: string, subscribe: boolean) => void
}) {
  return (
    <div>
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Mail className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalSubscribers}</p>
            <p className="text-xs text-white/50">Subscribers</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{contentCount}</p>
            <p className="text-xs text-white/50">Content Available</p>
          </div>
        </div>
        <a
          href={ghlEmailMarketingUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="glass-card p-4 flex items-center gap-3 hover:border-emerald-500/30 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Open GHL Email Marketing</p>
            <p className="text-xs text-white/50">Build &amp; send newsletters</p>
          </div>
          <ExternalLink className="h-4 w-4 text-emerald-400 ml-auto" />
        </a>
      </div>

      {/* Search */}
      <div className="glass-card p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search subscribers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Subscriber List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Newsletter Subscribers</h2>
          <span className="text-sm text-white/50">{contacts.length} shown</span>
        </div>

        {contacts.length === 0 ? (
          <div className="py-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-white/60">No subscribers found</p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="grid grid-cols-[1fr_200px_120px_80px_100px] gap-4 px-3 py-2 text-xs text-white/40 uppercase tracking-wider">
              <span>Name</span>
              <span>Email</span>
              <span>Segment</span>
              <span>Subscribed</span>
              <span>Actions</span>
            </div>
            {contacts.map(contact => (
              <div
                key={contact.id}
                className="grid grid-cols-[1fr_200px_120px_80px_100px] gap-4 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
                  {contact.company_name && (
                    <p className="text-xs text-white/40 truncate">{contact.company_name}</p>
                  )}
                </div>
                <span className="text-sm text-white/60 truncate">{contact.email || '—'}</span>
                <span className={`text-xs px-2 py-1 rounded-full w-fit ${SEGMENT_COLORS[contact.segment] || 'bg-white/10 text-white/60'}`}>
                  {contact.segment}
                </span>
                <button
                  onClick={() => onToggleNewsletter(contact.id, !contact.newsletter_consent)}
                  className="flex items-center"
                >
                  {contact.newsletter_consent ? (
                    <ToggleRight className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-white/30" />
                  )}
                </button>
                <a
                  href={ghlContactUrl(contact.ghl_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  Open in GHL
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add Existing Contact Picker ──────────────────────────────────

function AddExistingModal({ onClose, onAdded }: {
  onClose: () => void
  onAdded: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchContact[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchAllContacts(query)
        setResults(data.contacts)
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const handleAdd = async (contact: SearchContact) => {
    setAdding(prev => new Set(prev).add(contact.ghl_id))
    try {
      await updateContactTag(contact.ghl_id, 'add', 'goods')
      setAdded(prev => new Set(prev).add(contact.ghl_id))
      onAdded()
    } finally {
      setAdding(prev => {
        const next = new Set(prev)
        next.delete(contact.ghl_id)
        return next
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add Existing Contact to Goods</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {query.length < 2 ? (
            <p className="text-sm text-white/40 text-center py-8">Type at least 2 characters to search</p>
          ) : searching ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-sm text-white/40 text-center py-8">No contacts found</p>
          ) : (
            <div className="space-y-1">
              {results.map(contact => {
                const isAdded = added.has(contact.ghl_id) || contact.already_goods
                const isAdding = adding.has(contact.ghl_id)
                return (
                  <div
                    key={contact.ghl_id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{contact.full_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {contact.email && (
                          <span className="text-xs text-white/40 truncate">{contact.email}</span>
                        )}
                        {contact.company_name && (
                          <span className="text-xs text-white/30">· {contact.company_name}</span>
                        )}
                      </div>
                    </div>
                    {isAdded ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                        <Check className="h-3.5 w-3.5" />
                        In Goods
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(contact)}
                        disabled={isAdding}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 disabled:opacity-50 transition-colors shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                        {isAdding ? 'Adding...' : 'Add'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {added.size > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-emerald-400">{added.size} contact{added.size > 1 ? 's' : ''} added to Goods</span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Dedup Modal ──────────────────────────────────────────────────

function DedupModal({ duplicates, onClose, onMerge }: {
  duplicates: DuplicateGroup[]
  onClose: () => void
  onMerge: (keepId: string, mergeIds: string[]) => Promise<void>
}) {
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const group of duplicates) {
      const sorted = [...group.contacts].sort((a, b) => b.tags.length - a.tags.length)
      initial[group.email] = sorted[0].ghl_id
    }
    return initial
  })
  const [merging, setMerging] = useState(false)
  const [merged, setMerged] = useState<Set<string>>(new Set())

  const handleMerge = async (email: string) => {
    const keepId = selections[email]
    const group = duplicates.find(d => d.email === email)
    if (!group) return
    const mergeIds = group.contacts.filter(c => c.ghl_id !== keepId).map(c => c.ghl_id)
    setMerging(true)
    try {
      await onMerge(keepId, mergeIds)
      setMerged(prev => new Set(prev).add(email))
    } finally {
      setMerging(false)
    }
  }

  const allMerged = merged.size === duplicates.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Merge className="h-5 w-5 text-amber-400" />
            Merge Duplicate Contacts
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        {allMerged ? (
          <div className="py-8 text-center">
            <Check className="mx-auto h-12 w-12 text-emerald-400" />
            <p className="mt-4 text-white/70">All duplicates merged!</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {duplicates.filter(d => !merged.has(d.email)).map(group => (
              <div key={group.email} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-white">{group.email}</p>
                  <span className="text-xs text-white/40">{group.contacts.length} contacts</span>
                </div>
                <div className="space-y-2 mb-3">
                  {group.contacts.map(c => (
                    <label
                      key={c.ghl_id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selections[group.email] === c.ghl_id
                          ? 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`keep-${group.email}`}
                        checked={selections[group.email] === c.ghl_id}
                        onChange={() => setSelections(prev => ({ ...prev, [group.email]: c.ghl_id }))}
                        className="accent-emerald-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{c.full_name}</span>
                        {c.company_name && (
                          <span className="text-xs text-white/40 ml-2">{c.company_name}</span>
                        )}
                        <div className="flex gap-1 mt-1">
                          {c.tags.slice(0, 5).map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">{t}</span>
                          ))}
                          {c.tags.length > 5 && (
                            <span className="text-[10px] text-white/30">+{c.tags.length - 5}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-white/30 shrink-0">
                        {formatRelativeDate(c.created_at)}
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => handleMerge(group.email)}
                  disabled={merging}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-lg hover:bg-amber-500/30 disabled:opacity-50 transition-colors"
                >
                  <Merge className="h-3.5 w-3.5" />
                  {merging ? 'Merging...' : 'Merge — keep selected'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
