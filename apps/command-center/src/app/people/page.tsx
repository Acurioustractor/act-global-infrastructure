'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getAllContacts,
  getEcosystemProjectCodes,
  getContactDuplicates,
  updateContactTag,
  bulkDeleteContacts,
  bulkUpdateContacts,
  mergeContacts,
  type AllContact,
  type EcosystemProjectCode,
  type DuplicateSet,
  type DuplicateContact,
} from '@/lib/api'
import { ghlContactUrl, formatRelativeDate } from '@/lib/utils'
import { ContactDrawer } from '@/components/contact-drawer'
import { LoadingPage } from '@/components/ui/loading'
import {
  Users,
  Search,
  ExternalLink,
  AlertCircle,
  Plus,
  X,
  ChevronDown,
  Tag,
  Filter,
  Trash2,
  Building2,
  ArrowUpDown,
  Mail,
  MailX,
  Copy,
  Check,
} from 'lucide-react'

// Category colours for project chips
const CATEGORY_COLORS: Record<string, string> = {
  justice: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  enterprise: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stories: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  indigenous: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  foundation: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  regenerative: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  platform: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  creative: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

function getChipColor(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-white/10 text-white/60 border-white/10'
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A→Z' },
  { value: 'recent', label: 'Recently Contacted' },
  { value: 'oldest', label: 'Oldest Contacted' },
  { value: 'company', label: 'Company A→Z' },
]

type ViewMode = 'contacts' | 'duplicates'

export default function PeoplePage() {
  const [view, setView] = useState<ViewMode>('contacts')
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [companyFilter, setCompanyFilter] = useState('')
  const [untaggedOnly, setUntaggedOnly] = useState(false)
  const [noEmailOnly, setNoEmailOnly] = useState(false)
  const [sort, setSort] = useState('name')
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTagDropdown, setBulkTagDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCompanyModal, setShowCompanyModal] = useState(false)
  const [companyInput, setCompanyInput] = useState('')
  const queryClient = useQueryClient()

  const { data: projectCodes } = useQuery({
    queryKey: ['ecosystem', 'project-codes'],
    queryFn: getEcosystemProjectCodes,
    staleTime: 5 * 60 * 1000,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', 'all', search, projectFilter, companyFilter, untaggedOnly, noEmailOnly, sort],
    queryFn: () => getAllContacts({
      search: search || undefined,
      project: projectFilter || undefined,
      company: companyFilter || undefined,
      untagged: untaggedOnly || undefined,
      noEmail: noEmailOnly || undefined,
      sort,
      limit: 200,
    }),
    placeholderData: keepPreviousData,
  })

  const tagMutation = useMutation({
    mutationFn: ({ id, action, tag }: { id: string; action: 'add' | 'remove'; tag: string }) =>
      updateContactTag(id, action, tag),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contacts'] }),
  })

  const bulkTagMutation = useMutation({
    mutationFn: async ({ ids, tag }: { ids: string[]; tag: string }) => {
      await Promise.all(ids.map(id => updateContactTag(id, 'add', tag)))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelectedIds(new Set())
      setBulkTagDropdown(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteContacts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelectedIds(new Set())
      setShowDeleteConfirm(false)
    },
  })

  const companyMutation = useMutation({
    mutationFn: ({ ids, companyName }: { ids: string[]; companyName: string }) =>
      bulkUpdateContacts(ids, { companyName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelectedIds(new Set())
      setShowCompanyModal(false)
      setCompanyInput('')
    },
  })

  const projects = projectCodes?.projects || []
  const contacts = data?.contacts || []
  const companies = data?.companies || []
  const total = data?.total || 0

  const toggleSelect = useCallback((ghlId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(ghlId)) next.delete(ghlId)
      else next.add(ghlId)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.ghl_id)))
    }
  }, [contacts, selectedIds.size])

  // Count active filters
  const activeFilterCount = [projectFilter, companyFilter, untaggedOnly, noEmailOnly].filter(Boolean).length

  if (isLoading && !data) return <LoadingPage />
  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="glass-card p-6 border-red-500/30">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load contacts. {(error as Error)?.message}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 pb-24 sm:pb-8">
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Users className="h-7 w-7 sm:h-8 sm:w-8 text-indigo-400" />
              People
            </h1>
            <p className="text-sm sm:text-lg text-white/60 mt-1">
              {total} contacts{activeFilterCount > 0 ? ` (${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''})` : ''}
            </p>
          </div>
          {/* View Toggle */}
          <div className="flex items-center bg-white/5 rounded-lg p-1 gap-1 self-start sm:self-auto">
            <button
              onClick={() => setView('contacts')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'contacts' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Users className="h-4 w-4 inline mr-1.5" />
              Contacts
            </button>
            <button
              onClick={() => setView('duplicates')}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                view === 'duplicates' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
              }`}
            >
              <Copy className="h-4 w-4 inline mr-1.5" />
              Duplicates
            </button>
          </div>
        </div>

        {/* Filters (contacts view only) */}
        {view === 'contacts' && <div className="space-y-3">
          {/* Search - full width */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Filter controls - wrap on mobile */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-lg py-2 pl-8 pr-7 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Project Filter */}
            <div className="relative">
              <select
                value={projectFilter}
                onChange={(e) => { setProjectFilter(e.target.value); setUntaggedOnly(false) }}
                className="appearance-none bg-white/5 border border-white/10 rounded-lg py-2 pl-2.5 pr-7 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer max-w-[150px] sm:max-w-none"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Company Filter */}
            <div className="relative">
              <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="appearance-none bg-white/5 border border-white/10 rounded-lg py-2 pl-7 pr-7 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer max-w-[150px] sm:max-w-[220px]"
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Untagged Filter */}
            <button
              onClick={() => { setUntaggedOnly(!untaggedOnly); setProjectFilter('') }}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                untaggedOnly
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Untagged
            </button>

            {/* No Email Filter */}
            <button
              onClick={() => setNoEmailOnly(!noEmailOnly)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                noEmailOnly
                  ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {noEmailOnly ? <MailX className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">No Email</span>
              <span className="sm:hidden">No Email</span>
            </button>
          </div>
        </div>}
      </header>

      {/* Duplicates View */}
      {view === 'duplicates' && (
        <DuplicatesView
          onDelete={(ids) => deleteMutation.mutate(ids)}
          isDeleting={deleteMutation.isPending}
        />
      )}

      {/* Bulk Actions Bar */}
      {view === 'contacts' && selectedIds.size > 0 && (
        <div className="mb-4 glass-card p-3 flex items-center gap-2 sm:gap-4 flex-wrap">
          <span className="text-xs sm:text-sm text-white/70">{selectedIds.size} selected</span>

          {/* Bulk Tag */}
          <div className="relative">
            <button
              onClick={() => setBulkTagDropdown(!bulkTagDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500/30 transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tag Selected</span>
              <span className="sm:hidden">Tag</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {bulkTagDropdown && (
              <ProjectDropdown
                projects={projects}
                onSelect={(tag) => {
                  bulkTagMutation.mutate({ ids: Array.from(selectedIds), tag })
                }}
                onClose={() => setBulkTagDropdown(false)}
              />
            )}
          </div>

          {/* Bulk Set Company */}
          <button
            onClick={() => setShowCompanyModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Set Company</span>
            <span className="sm:hidden">Company</span>
          </button>

          {/* Bulk Delete */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-white/40 hover:text-white/60 ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Contact List */}
      {view === 'contacts' && <>
        {contacts.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Users className="mx-auto h-12 w-12 text-white/20" />
            <p className="mt-4 text-white/60">No contacts found</p>
          </div>
        ) : (
          <>
            {/* Select all bar */}
            <div className="flex items-center gap-3 mb-3 px-1">
              <label className="flex items-center gap-2 text-xs text-white/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.size === contacts.length && contacts.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-indigo-500 rounded"
                />
                Select all
              </label>
              <span className="text-xs text-white/30">Showing {contacts.length} of {total}</span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="w-10 px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === contacts.length && contacts.length > 0}
                          onChange={toggleSelectAll}
                          className="accent-indigo-500 rounded"
                        />
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Name</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Email</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Company</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider min-w-[200px]">Projects</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Last Email</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">Pipeline</th>
                      <th className="w-12 px-3 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(contact => (
                      <ContactRow
                        key={contact.ghl_id}
                        contact={contact}
                        projects={projects}
                        isSelected={selectedIds.has(contact.ghl_id)}
                        onToggleSelect={() => toggleSelect(contact.ghl_id)}
                        onOpenDrawer={() => setSelectedContactId(contact.ghl_id)}
                        onAddTag={(tag) => tagMutation.mutate({ id: contact.ghl_id, action: 'add', tag })}
                        onRemoveTag={(tag) => tagMutation.mutate({ id: contact.ghl_id, action: 'remove', tag })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {contacts.map(contact => (
                <MobileContactCard
                  key={contact.ghl_id}
                  contact={contact}
                  projects={projects}
                  isSelected={selectedIds.has(contact.ghl_id)}
                  onToggleSelect={() => toggleSelect(contact.ghl_id)}
                  onOpenDrawer={() => setSelectedContactId(contact.ghl_id)}
                  onAddTag={(tag) => tagMutation.mutate({ id: contact.ghl_id, action: 'add', tag })}
                  onRemoveTag={(tag) => tagMutation.mutate({ id: contact.ghl_id, action: 'remove', tag })}
                />
              ))}
            </div>
          </>
        )}
      </>}

      {/* Contact Drawer */}
      {selectedContactId && (
        <ContactDrawer
          ghlId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Contacts"
          message={`Are you sure you want to delete ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''}? This removes them from Supabase but not from GHL.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          confirmColor="bg-red-600 hover:bg-red-700"
          onConfirm={() => deleteMutation.mutate(Array.from(selectedIds))}
          onCancel={() => setShowDeleteConfirm(false)}
          isPending={deleteMutation.isPending}
        />
      )}

      {/* Set Company Modal */}
      {showCompanyModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompanyModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCompanyModal(false)}>
            <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-white mb-1">Set Company</h3>
              <p className="text-sm text-white/50 mb-4">
                Set the company/organisation for {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}.
              </p>
              <input
                type="text"
                placeholder="Company name..."
                value={companyInput}
                onChange={(e) => setCompanyInput(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 mb-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && companyInput.trim()) {
                    companyMutation.mutate({ ids: Array.from(selectedIds), companyName: companyInput.trim() })
                  }
                }}
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowCompanyModal(false); setCompanyInput('') }}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => companyMutation.mutate({ ids: Array.from(selectedIds), companyName: companyInput.trim() })}
                  disabled={!companyInput.trim() || companyMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {companyMutation.isPending ? 'Updating...' : 'Set Company'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Duplicates View ──────────────────────────────────────────────

function DuplicatesView({ onDelete, isDeleting }: {
  onDelete: (ids: string[]) => void
  isDeleting: boolean
}) {
  const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [showMergeAllConfirm, setShowMergeAllConfirm] = useState(false)
  const [mergeAllProgress, setMergeAllProgress] = useState<{ done: number; total: number } | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', 'duplicates'],
    queryFn: getContactDuplicates,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => bulkDeleteContacts(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setSelectedForDelete(new Set())
      setShowConfirm(false)
    },
  })

  const mergeAllFn = useCallback(async () => {
    const allSets = data?.duplicate_sets || []
    setMergeAllProgress({ done: 0, total: allSets.length })
    let done = 0
    // Process in batches of 5 to avoid overwhelming the server
    for (let i = 0; i < allSets.length; i += 5) {
      const batch = allSets.slice(i, i + 5)
      await Promise.all(batch.map(ds => {
        const keepId = ds.contacts[0].ghl_id
        const mergeIds = ds.contacts.slice(1).map(c => c.ghl_id)
        return mergeContacts(keepId, mergeIds).catch(() => null) // skip failures
      }))
      done += batch.length
      setMergeAllProgress({ done, total: allSets.length })
    }
    setMergeAllProgress(null)
    setShowMergeAllConfirm(false)
    queryClient.invalidateQueries({ queryKey: ['contacts'] })
  }, [data, queryClient])

  if (isLoading) return <LoadingPage />
  if (error) return <div className="text-red-400 p-4">Failed to load duplicates</div>

  const sets = data?.duplicate_sets || []
  const blanks = data?.blank_contacts || []

  const toggleForDelete = (ghlId: string) => {
    setSelectedForDelete(prev => {
      const next = new Set(prev)
      if (next.has(ghlId)) next.delete(ghlId)
      else next.add(ghlId)
      return next
    })
  }

  return (
    <div>
      {/* Summary */}
      <div className="glass-card p-3 sm:p-4 mb-4">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <div>
            <span className="text-xl sm:text-2xl font-bold text-white">{sets.length}</span>
            <span className="text-xs sm:text-sm text-white/50 ml-1.5">groups</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-amber-400">{data?.total_duplicates || 0}</span>
            <span className="text-xs sm:text-sm text-white/50 ml-1.5">dupes</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-red-400">{blanks.length}</span>
            <span className="text-xs sm:text-sm text-white/50 ml-1.5">blank</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 mt-3 flex-wrap">
          {sets.length > 0 && !mergeAllProgress && (
            <button
              onClick={() => setShowMergeAllConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <Check className="h-4 w-4" />
              Merge All {sets.length}
            </button>
          )}
          {mergeAllProgress && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${(mergeAllProgress.done / mergeAllProgress.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-emerald-400 shrink-0">
                {mergeAllProgress.done}/{mergeAllProgress.total}
              </span>
            </div>
          )}
          {selectedForDelete.size > 0 && (
            <>
              <span className="text-xs text-white/60">{selectedForDelete.size} marked</span>
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
              <button
                onClick={() => setSelectedForDelete(new Set())}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Blank contacts */}
      {blanks.length > 0 && (
        <div className="glass-card overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-sm font-medium text-red-400">Blank Contacts (no name, no email)</h3>
            <button
              onClick={() => {
                const allBlankIds = new Set(selectedForDelete)
                blanks.forEach(b => allBlankIds.add(b.ghl_id))
                setSelectedForDelete(allBlankIds)
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Select all {blanks.length} for deletion
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {blanks.map(b => (
              <div key={b.ghl_id} className="px-4 py-2 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedForDelete.has(b.ghl_id)}
                  onChange={() => toggleForDelete(b.ghl_id)}
                  className="accent-red-500"
                />
                <span className="text-xs text-white/30 font-mono">{b.ghl_id.slice(0, 12)}...</span>
                <span className="text-xs text-white/40">{b.tags.length > 0 ? `tags: ${b.tags.join(', ')}` : 'no tags'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate groups */}
      <div className="space-y-3">
        {sets.map((ds, i) => (
          <DuplicateGroup
            key={`${ds.match_type}-${ds.key}-${i}`}
            duplicateSet={ds}
            selectedForDelete={selectedForDelete}
            onToggleDelete={toggleForDelete}
          />
        ))}
      </div>

      {sets.length === 0 && blanks.length === 0 && (
        <div className="glass-card p-16 text-center">
          <Check className="mx-auto h-12 w-12 text-emerald-400" />
          <p className="mt-4 text-white/60">No duplicates found — contacts are clean!</p>
        </div>
      )}

      {/* Delete confirmation */}
      {showConfirm && (
        <ConfirmModal
          title="Delete Duplicate Contacts"
          message={`Delete ${selectedForDelete.size} contact${selectedForDelete.size > 1 ? 's' : ''}? This removes them from Supabase but not from GHL.`}
          confirmLabel={deleteMutation.isPending ? 'Deleting...' : `Delete ${selectedForDelete.size}`}
          confirmColor="bg-red-600 hover:bg-red-700"
          onConfirm={() => deleteMutation.mutate(Array.from(selectedForDelete))}
          onCancel={() => setShowConfirm(false)}
          isPending={deleteMutation.isPending}
        />
      )}

      {/* Merge All confirmation */}
      {showMergeAllConfirm && (
        <ConfirmModal
          title="Merge All Duplicate Groups"
          message={`This will merge ${sets.length} duplicate groups, keeping the oldest contact in each group and combining tags/data from the rest. ${data?.total_duplicates || 0} duplicate contacts will be removed.`}
          confirmLabel="Merge All"
          confirmColor="bg-emerald-600 hover:bg-emerald-700"
          onConfirm={mergeAllFn}
          onCancel={() => setShowMergeAllConfirm(false)}
          isPending={!!mergeAllProgress}
        />
      )}
    </div>
  )
}

function DuplicateGroup({ duplicateSet, selectedForDelete, onToggleDelete }: {
  duplicateSet: DuplicateSet
  selectedForDelete: Set<string>
  onToggleDelete: (id: string) => void
}) {
  const [keepId, setKeepId] = useState(duplicateSet.contacts[0]?.ghl_id || '')
  const [merged, setMerged] = useState(false)
  const queryClient = useQueryClient()

  const mergeMutation = useMutation({
    mutationFn: () => {
      const mergeIds = duplicateSet.contacts
        .filter(c => c.ghl_id !== keepId)
        .map(c => c.ghl_id)
      return mergeContacts(keepId, mergeIds)
    },
    onSuccess: () => {
      setMerged(true)
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })

  if (merged) {
    return (
      <div className="glass-card p-4 flex items-center gap-3 opacity-60">
        <Check className="h-5 w-5 text-emerald-400" />
        <span className="text-sm text-emerald-400">Merged {duplicateSet.contacts.length} contacts into one</span>
        <span className="text-xs text-white/30">({duplicateSet.key})</span>
      </div>
    )
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-3">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          duplicateSet.match_type === 'email'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-amber-500/20 text-amber-400'
        }`}>
          {duplicateSet.match_type === 'email' ? 'Email Match' : 'Name Match'}
        </span>
        <span className="text-sm font-medium text-white">{duplicateSet.key}</span>
        <span className="text-xs text-white/30 ml-auto">{duplicateSet.contacts.length} contacts</span>
        <button
          onClick={() => mergeMutation.mutate()}
          disabled={mergeMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {mergeMutation.isPending ? 'Merging...' : 'Merge All'}
        </button>
      </div>
      {mergeMutation.isError && (
        <div className="px-4 py-2 bg-red-500/10 text-red-400 text-xs">
          Merge failed: {(mergeMutation.error as Error)?.message}
        </div>
      )}
      <div className="divide-y divide-white/5">
        {duplicateSet.contacts.map((c) => {
          const isKeep = c.ghl_id === keepId
          return (
            <div key={c.ghl_id} className={`px-3 py-2.5 hover:bg-white/5 ${isKeep ? 'bg-emerald-500/5' : ''}`}>
              <div className="flex items-start gap-2.5">
                <button
                  onClick={() => setKeepId(c.ghl_id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                    isKeep
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  title={isKeep ? 'Will be kept' : 'Click to keep this one'}
                >
                  {isKeep && <Check className="h-3 w-3 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white">{c.full_name}</span>
                    {isKeep && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">keep</span>
                    )}
                    {!isKeep && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400/60">merge away</span>
                    )}
                    {c.is_placeholder_email && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">placeholder</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/50 flex-wrap">
                    <span className={c.is_placeholder_email ? 'text-white/20' : ''}>{c.email || '—'}</span>
                    {c.company_name && <span>{c.company_name}</span>}
                    <span className="text-[10px] text-white/30">
                      {c.last_contact_date ? formatRelativeDate(c.last_contact_date) : 'never'}
                    </span>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {c.tags.slice(0, 4).map(t => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">{t}</span>
                      ))}
                      {c.tags.length > 4 && (
                        <span className="text-[10px] text-white/30">+{c.tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Confirm Modal ────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmColor, onConfirm, onCancel, isPending }: {
  title: string
  message: string
  confirmLabel: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
        <div className="bg-[#1a1d27] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-white/50 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${confirmColor}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Mobile Contact Card ──────────────────────────────────────────

function MobileContactCard({ contact, projects, isSelected, onToggleSelect, onOpenDrawer, onAddTag, onRemoveTag }: {
  contact: AllContact
  projects: EcosystemProjectCode[]
  isSelected: boolean
  onToggleSelect: () => void
  onOpenDrawer: () => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}) {
  const [showAddProject, setShowAddProject] = useState(false)
  const projectsMap = new Map(projects.map(p => [p.code, p]))
  const contactProjects = contact.projects
    .map(code => projectsMap.get(code))
    .filter(Boolean) as EcosystemProjectCode[]

  return (
    <div className="glass-card p-3" onClick={onOpenDrawer}>
      <div className="flex items-start gap-3">
        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="accent-indigo-500 rounded w-4 h-4"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-white truncate">{contact.full_name}</span>
            <a
              href={ghlContactUrl(contact.ghl_id)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/30 hover:text-indigo-400 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          {contact.email && (
            <p className="text-xs text-white/50 truncate mt-0.5">{contact.email}</p>
          )}
          {contact.company_name && (
            <p className="text-xs text-white/40 mt-0.5">{contact.company_name}</p>
          )}
          {/* Projects */}
          <div className="flex items-center gap-1.5 flex-wrap mt-2" onClick={(e) => e.stopPropagation()}>
            {contactProjects.map(p => (
              <span
                key={p.code}
                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${getChipColor(p.category)}`}
              >
                {p.code}
                <button onClick={() => onRemoveTag(p.ghlTag)} className="hover:text-white">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <div className="relative">
              <button
                onClick={() => setShowAddProject(!showAddProject)}
                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60"
              >
                <Plus className="h-3 w-3" />
              </button>
              {showAddProject && (
                <ProjectDropdown
                  projects={projects.filter(p => !contact.projects.includes(p.code))}
                  onSelect={(tag) => { onAddTag(tag); setShowAddProject(false) }}
                  onClose={() => setShowAddProject(false)}
                />
              )}
            </div>
          </div>
          {/* Last contact */}
          {contact.last_email_subject ? (
            <p className="text-[10px] text-white/30 mt-1.5 truncate">
              {contact.last_email_date ? formatRelativeDate(contact.last_email_date) : ''} — {contact.last_email_subject}
            </p>
          ) : (
            <p className={`text-[10px] mt-1.5 ${contact.days_since_contact === null ? 'text-red-400/60' : 'text-white/20'}`}>
              {contact.days_since_contact === null ? 'Never contacted' : 'No emails'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Contact Row ──────────────────────────────────────────────────

function ContactRow({ contact, projects, isSelected, onToggleSelect, onOpenDrawer, onAddTag, onRemoveTag }: {
  contact: AllContact
  projects: EcosystemProjectCode[]
  isSelected: boolean
  onToggleSelect: () => void
  onOpenDrawer: () => void
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
}) {
  const [showAddProject, setShowAddProject] = useState(false)

  // Map project codes to display info
  const projectsMap = new Map(projects.map(p => [p.code, p]))
  const contactProjects = contact.projects
    .map(code => projectsMap.get(code))
    .filter(Boolean) as EcosystemProjectCode[]

  return (
    <tr
      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
      onClick={onOpenDrawer}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="accent-indigo-500 rounded"
        />
      </td>
      <td className="px-3 py-3">
        <span className="text-sm font-medium text-white">{contact.full_name}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-sm text-white/60 truncate block max-w-[180px]">{contact.email || '—'}</span>
      </td>
      <td className="px-3 py-3">
        <span className="text-sm text-white/60 truncate block max-w-[140px]">{contact.company_name || '—'}</span>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {contactProjects.map(p => (
            <span
              key={p.code}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${getChipColor(p.category)}`}
            >
              {p.code}
              <button
                onClick={() => onRemoveTag(p.ghlTag)}
                className="hover:text-white ml-0.5"
                title={`Remove ${p.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <div className="relative">
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
              title="Add project tag"
            >
              <Plus className="h-3 w-3" />
            </button>
            {showAddProject && (
              <ProjectDropdown
                projects={projects.filter(p => !contact.projects.includes(p.code))}
                onSelect={(tag) => {
                  onAddTag(tag)
                  setShowAddProject(false)
                }}
                onClose={() => setShowAddProject(false)}
              />
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {contact.last_email_subject ? (
          <div className="min-w-0">
            <p className="text-xs text-white/60 truncate max-w-[180px]">{contact.last_email_subject}</p>
            <p className={`text-[10px] ${
              contact.days_since_contact === null ? 'text-red-400'
              : contact.days_since_contact > 30 ? 'text-amber-400'
              : 'text-white/30'
            }`}>
              {contact.last_email_date ? formatRelativeDate(contact.last_email_date) : '—'}
            </p>
          </div>
        ) : (
          <span className={`text-xs ${contact.days_since_contact === null ? 'text-red-400' : 'text-white/30'}`}>
            {contact.days_since_contact === null ? 'Never contacted' : 'No emails'}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          {(contact.pipeline_value || 0) > 0 && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 tabular-nums">
              ${(contact.pipeline_value || 0) >= 1000 ? `${((contact.pipeline_value || 0) / 1000).toFixed(0)}k` : contact.pipeline_value?.toLocaleString()}
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <a
          href={ghlContactUrl(contact.ghl_id)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-indigo-400 transition-colors"
          title="Open in GHL"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </td>
    </tr>
  )
}

// ─── Project Dropdown ─────────────────────────────────────────────

function ProjectDropdown({ projects, onSelect, onClose }: {
  projects: EcosystemProjectCode[]
  onSelect: (tag: string) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState('')

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.code.toLowerCase().includes(filter.toLowerCase())
  )

  // Group by category
  const grouped = new Map<string, EcosystemProjectCode[]>()
  for (const p of filtered) {
    const existing = grouped.get(p.category) || []
    existing.push(p)
    grouped.set(p.category, existing)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-[#1a1d27] border border-white/10 rounded-lg shadow-xl overflow-hidden">
        <div className="p-2 border-b border-white/10">
          <input
            type="text"
            placeholder="Filter projects..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/40">No projects found</p>
          ) : (
            Array.from(grouped.entries()).map(([category, categoryProjects]) => (
              <div key={category}>
                <p className="px-3 py-1 text-[10px] font-medium text-white/30 uppercase tracking-wider">{category}</p>
                {categoryProjects.map(p => (
                  <button
                    key={p.code}
                    onClick={() => onSelect(p.ghlTag)}
                    className="w-full text-left px-3 py-1.5 hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <span className={`w-2 h-2 rounded-full ${getChipColor(p.category).split(' ')[0]}`} />
                    <span className="text-xs text-white/80">{p.name}</span>
                    <span className="text-[10px] text-white/30 ml-auto">{p.code}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
