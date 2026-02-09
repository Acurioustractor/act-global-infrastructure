'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  Code2,
  ExternalLink,
  GitBranch,
  Globe,
  HardDrive,
  RefreshCw,
  Search,
  Tag,
  FolderOpen,
  Eye,
  X,
  ChevronDown,
  ChevronRight,
  Users,
  Briefcase,
  Hash,
  Plus,
  UserPlus,
  Loader2,
  BookOpen,
} from 'lucide-react'
import {
  getDevelopmentOverview,
  getRelationships,
  getProjectCodes,
  addRepoProjectLink,
  removeRepoProjectLink,
  addRepoContact,
  removeRepoContact,
  type DevelopmentOverviewResponse,
  type Contact,
  getContactName,
} from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatRelativeDate } from '@/lib/utils'

type CoreSite = DevelopmentOverviewResponse['coreSites'][number]
type SatelliteSite = DevelopmentOverviewResponse['satelliteSites'][number]
type Repo = DevelopmentOverviewResponse['repos'][number]
type LocalCodebase = DevelopmentOverviewResponse['localCodebases'][number]

// ─── Screenshot thumbnail ────────────────────────────────────────

function SiteThumbnail({
  screenshot,
  name,
  size = 'lg',
}: {
  screenshot: string | null
  name: string
  size?: 'lg' | 'md'
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 3)

  const height = size === 'lg' ? 'h-40' : 'h-28'

  // No screenshot or image failed — show gradient placeholder
  if (!screenshot || imgError) {
    return (
      <div
        className={cn(
          'w-full rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center',
          height
        )}
      >
        <span className="text-lg font-bold text-white/30">{initials}</span>
      </div>
    )
  }

  return (
    <div className={cn('w-full rounded-lg overflow-hidden bg-white/5 relative', height)}>
      {/* Shimmer placeholder while loading */}
      {!imgLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          <span className="text-sm font-bold text-white/20 z-10">{initials}</span>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={screenshot}
        alt={`${name} screenshot`}
        className={cn(
          'w-full h-full object-cover object-top transition-opacity duration-500',
          imgLoaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
    </div>
  )
}

// ─── Health Badge ────────────────────────────────────────────────

function HealthBadge({ status }: { status: string | null }) {
  if (!status) return null
  const config: Record<string, { color: string; label: string }> = {
    healthy: { color: 'bg-green-500/20 text-green-400', label: 'Healthy' },
    degraded: { color: 'bg-amber-500/20 text-amber-400', label: 'Degraded' },
    critical: { color: 'bg-red-500/20 text-red-400', label: 'Critical' },
  }
  const c = config[status] || config.healthy
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', c!.color)}>
      {c!.label}
    </span>
  )
}

// ─── Project Code Badge ──────────────────────────────────────────

function ProjectBadge({ code, name }: { code: string | null; name?: string | null }) {
  if (!code) return null
  // Show name if provided, or look up in PROJECT_INFO, or show short code (but truncate UUIDs)
  const info = PROJECT_INFO[code]
  const label = name || info?.name || (code.length > 10 ? code.slice(0, 8) + '...' : code)
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 font-semibold max-w-32 truncate', info?.color || 'text-indigo-400')}>
      {label}
    </span>
  )
}

// ─── Language Dot ────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: 'bg-blue-400',
  JavaScript: 'bg-yellow-400',
  Python: 'bg-green-400',
  HTML: 'bg-orange-400',
  CSS: 'bg-purple-400',
  Rust: 'bg-orange-600',
  Go: 'bg-cyan-400',
  Shell: 'bg-emerald-400',
}

function LanguageDot({ language }: { language: string | null }) {
  if (!language) return null
  return (
    <span className="flex items-center gap-1 text-xs text-white/40">
      <span className={cn('w-2 h-2 rounded-full', LANG_COLORS[language] || 'bg-gray-400')} />
      {language}
    </span>
  )
}

// ─── Core Site Card (Tier 1) ─────────────────────────────────────

function CoreSiteCard({ site }: { site: CoreSite }) {
  return (
    <div className="glass-card overflow-hidden group">
      <SiteThumbnail screenshot={site.screenshot} name={site.name} size="lg" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {site.name}
          </h3>
          <div className="flex items-center gap-1.5">
            <ProjectBadge code={site.projectCode} />
            <HealthBadge status={site.healthStatus} />
          </div>
        </div>
        {site.description && (
          <p className="text-xs text-white/40 mb-3 line-clamp-2">{site.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/compendium/${site.slug}`}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <BookOpen className="h-3 w-3" />
            Project
          </Link>
          {site.url && (
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Globe className="h-3 w-3" />
              {site.liveUrl ? 'Draft' : 'Visit'}
            </a>
          )}
          {site.liveUrl && (
            <a
              href={site.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Live
            </a>
          )}
          <a
            href={site.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
          >
            <GitBranch className="h-3 w-3" />
            GitHub
          </a>
          {site.language && <LanguageDot language={site.language} />}
          {site.lastPushed && (
            <span className="text-xs text-white/30">
              {formatRelativeDate(site.lastPushed)}
            </span>
          )}
        </div>
        {site.localPath && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-white/20">
            <FolderOpen className="h-3 w-3" />
            <span className="truncate font-mono">{site.localPath}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Satellite Site Card (Tier 2) ────────────────────────────────

function SatelliteSiteCard({ site }: { site: SatelliteSite }) {
  return (
    <div className="glass-card overflow-hidden group">
      <SiteThumbnail screenshot={site.screenshot} name={site.name} size="md" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">
            {site.name}
          </h3>
          <HealthBadge status={site.healthStatus} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {site.url && (
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              <Globe className="h-3 w-3" />
              Visit
            </a>
          )}
          {site.githubRepo && (
            <a
              href={`https://github.com/${site.githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/40 hover:text-white/60 flex items-center gap-1 transition-colors"
            >
              <GitBranch className="h-3 w-3" />
              Repo
            </a>
          )}
          {site.category && (
            <span className="text-[10px] text-white/30">{site.category}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Project Info Map ────────────────────────────────────────────

const PROJECT_INFO: Record<string, { name: string; color: string; description: string }> = {
  EL: { name: 'Empathy Ledger', color: 'text-pink-400', description: 'Indigenous cultural storytelling platform' },
  JH: { name: 'JusticeHub', color: 'text-blue-400', description: 'Digital justice platform' },
  GOODS: { name: 'Goods on Country', color: 'text-orange-400', description: 'Social enterprise marketplace' },
  TH: { name: 'The Harvest', color: 'text-green-400', description: 'Venue, workshops & retail' },
  TS: { name: 'ACT Studio', color: 'text-purple-400', description: 'Studio project — built through ACT' },
  TF: { name: 'The Farm', color: 'text-amber-400', description: 'R&D, manufacturing & gardens' },
  OPS: { name: 'Operations', color: 'text-slate-400', description: 'Infrastructure & tooling' },
  PICC: { name: 'PICC', color: 'text-teal-400', description: 'Palm Island Community Company' },
  WT: { name: 'World Tour', color: 'text-cyan-400', description: 'Field testing EL + JH' },
  ACT: { name: 'ACT Global', color: 'text-indigo-400', description: 'Overarching ACT ecosystem' },
}

// ─── Project Link Editor ─────────────────────────────────────────

function ProjectLinkEditor({ repo }: { repo: Repo }) {
  const [showAdd, setShowAdd] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  // Fetch all projects from Notion (78+)
  const { data: projectCodesData } = useQuery({
    queryKey: ['project-codes'],
    queryFn: getProjectCodes,
    staleTime: 10 * 60 * 1000,
    enabled: showAdd,
  })

  const currentLinks = repo.projectLinks || []
  const linkedCodes = new Set(currentLinks.map((l) => l.project_code))

  // Build available projects: Notion projects + hardcoded PROJECT_INFO codes, sorted alphabetically
  const allProjects = useMemo(() => {
    const projects: Array<{ code: string; name: string }> = []
    // Add hardcoded short codes
    for (const [code, info] of Object.entries(PROJECT_INFO)) {
      if (!linkedCodes.has(code)) {
        projects.push({ code, name: info.name })
      }
    }
    // Add Notion projects
    if (projectCodesData?.codes) {
      for (const p of projectCodesData.codes) {
        if (!linkedCodes.has(p.code) && !projects.some((x) => x.code === p.code)) {
          projects.push({ code: p.code, name: p.name })
        }
      }
    }
    return projects.sort((a, b) => a.name.localeCompare(b.name))
  }, [projectCodesData, linkedCodes])

  // Filter by search
  const filteredProjects = useMemo(() => {
    if (!projectSearch) return allProjects
    const q = projectSearch.toLowerCase()
    return allProjects.filter((p) => p.name.toLowerCase().includes(q))
  }, [allProjects, projectSearch])

  const handleAdd = async (code: string, name: string) => {
    setSaving(true)
    try {
      await addRepoProjectLink(repo.name, code, name)
      await queryClient.invalidateQueries({ queryKey: ['development', 'overview'] })
    } catch (err) {
      console.error('Failed to add project link:', err)
    }
    setSaving(false)
    setShowAdd(false)
    setProjectSearch('')
  }

  const handleRemove = async (code: string) => {
    setSaving(true)
    try {
      await removeRepoProjectLink(repo.name, code)
      await queryClient.invalidateQueries({ queryKey: ['development', 'overview'] })
    } catch (err) {
      console.error('Failed to remove project link:', err)
    }
    setSaving(false)
  }

  // Look up display name: stored project_name first, then PROJECT_INFO, then Notion lookup, then raw code
  const getProjectDisplayName = (code: string, storedName?: string | null) => {
    if (storedName) return storedName
    if (PROJECT_INFO[code]) return PROJECT_INFO[code].name
    const notionProject = projectCodesData?.codes?.find((p) => p.code === code)
    return notionProject?.name || code
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Briefcase className="h-3.5 w-3.5 text-white/40" />
        <span className="text-xs text-white/40">Projects</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-white/30" />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {currentLinks.map((link) => {
          const info = PROJECT_INFO[link.project_code]
          return (
            <span
              key={link.project_code}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500/10 group/tag"
            >
              <span className={cn('text-[11px] font-semibold', info?.color || 'text-indigo-400')}>
                {getProjectDisplayName(link.project_code, link.project_name)}
              </span>
              <button
                onClick={() => handleRemove(link.project_code)}
                className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/tag:opacity-100"
                title="Remove link"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )
        })}

        {currentLinks.length === 0 && !showAdd && (
          <span className="text-[11px] text-white/20">Not linked to any project</span>
        )}

        {showAdd ? (
          <div className="w-full mt-1">
            <div className="flex items-center gap-1 mb-1">
              <input
                type="text"
                placeholder="Search projects..."
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                autoFocus
                className="bg-white/5 border border-white/10 rounded text-[11px] text-white pl-2 pr-6 py-1 outline-none focus:border-indigo-500/50 w-52"
              />
              <button
                onClick={() => { setShowAdd(false); setProjectSearch('') }}
                className="text-white/30 hover:text-white/50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div
              className="rounded border border-white/5 bg-gray-900/80"
              style={{ maxHeight: '200px', overflowY: 'auto', overscrollBehavior: 'contain' }}
            >
              {filteredProjects.length === 0 ? (
                <p className="text-[11px] text-white/20 px-2 py-1.5">No projects found</p>
              ) : (
                filteredProjects.map((p) => (
                  <button
                    key={p.code}
                    onClick={() => handleAdd(p.code, p.name)}
                    className="w-full text-left px-2 py-1.5 hover:bg-white/5 text-[11px] text-white/70 hover:text-white transition-colors truncate block"
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-white/40 hover:text-white/60 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Link project
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Contact Tagger ──────────────────────────────────────────────

function ContactTagger({ repo }: { repo: Repo }) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const taggedContacts = repo.taggedContacts || []

  // Search GHL contacts
  const { data: searchResults } = useQuery({
    queryKey: ['contacts', 'search', searchInput],
    queryFn: () => getRelationships({ limit: 5, search: searchInput }),
    enabled: showSearch && searchInput.length >= 2,
    staleTime: 30 * 1000,
  })

  const taggedIds = new Set(taggedContacts.map((c) => c.contact_id))
  const filteredResults = (searchResults?.relationships || []).filter(
    (c) => !taggedIds.has(c.id)
  )

  const handleTag = async (contact: Contact) => {
    setSaving(true)
    try {
      await addRepoContact(repo.name, contact.id, getContactName(contact))
      await queryClient.invalidateQueries({ queryKey: ['development', 'overview'] })
    } catch (err) {
      console.error('Failed to tag contact:', err)
    }
    setSaving(false)
    setSearchInput('')
    setShowSearch(false)
  }

  const handleRemove = async (contactId: string) => {
    setSaving(true)
    try {
      await removeRepoContact(repo.name, contactId)
      await queryClient.invalidateQueries({ queryKey: ['development', 'overview'] })
    } catch (err) {
      console.error('Failed to remove contact:', err)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Users className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs text-white/40">Contacts</span>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-white/30" />}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {taggedContacts.map((c) => (
          <span
            key={c.contact_id}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 group/tag"
          >
            <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
              <span className="text-[8px] font-bold text-blue-400">
                {(c.contact_name || '?').charAt(0)}
              </span>
            </div>
            <span className="text-[11px] text-blue-300">{c.contact_name || 'Unknown'}</span>
            {c.role && (
              <span className="text-[9px] text-white/20">{c.role}</span>
            )}
            <button
              onClick={() => handleRemove(c.contact_id)}
              className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/tag:opacity-100"
              title="Remove"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {showSearch ? (
          <div className="w-full mt-1">
            <div className="flex items-center gap-1 mb-1">
              <input
                type="text"
                placeholder="Search contacts..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
                className="bg-white/5 border border-white/10 rounded text-[11px] text-white pl-2 pr-6 py-1 outline-none focus:border-blue-500/50 w-52"
              />
              <button
                onClick={() => { setShowSearch(false); setSearchInput('') }}
                className="text-white/30 hover:text-white/50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>

            {/* Inline search results */}
            {searchInput.length >= 2 && (
              <div
                className="rounded border border-white/5 bg-gray-900/80"
                style={{ maxHeight: '200px', overflowY: 'auto', overscrollBehavior: 'contain' }}
              >
                {filteredResults.length === 0 ? (
                  <p className="text-[11px] text-white/20 px-2 py-1.5">
                    {searchInput.length >= 2 ? 'No contacts found' : 'Type to search...'}
                  </p>
                ) : (
                  filteredResults.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleTag(c)}
                      className="w-full text-left px-2 py-1.5 hover:bg-white/5 flex items-center gap-2 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-blue-400">
                          {getContactName(c).charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] text-white truncate">{getContactName(c)}</p>
                        {(c.contact_email || c.email) && (
                          <p className="text-[10px] text-white/30 truncate">{c.contact_email || c.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-[11px] text-white/40 hover:text-white/60 transition-colors"
          >
            <UserPlus className="h-3 w-3" />
            Tag contact
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Repo Row (Tier 3) — expandable ─────────────────────────────

function RepoRow({ repo }: { repo: Repo }) {
  const [expanded, setExpanded] = useState(false)

  const project = repo.projectCode ? PROJECT_INFO[repo.projectCode] : null

  return (
    <div>
      {/* Collapsed row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-3">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-white/30 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
          )}
          <span className="text-sm font-medium text-white truncate">
            {repo.name}
          </span>
          {repo.isPrivate && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-white/10 text-white/40 shrink-0">
              Private
            </span>
          )}
          {/* Show all linked project badges */}
          {repo.projectLinks && repo.projectLinks.length > 0 ? (
            repo.projectLinks.map((l) => (
              <ProjectBadge key={l.project_code} code={l.project_code} name={l.project_name} />
            ))
          ) : (
            <ProjectBadge code={repo.projectCode} />
          )}
          {repo.description && !expanded && (
            <span className="text-xs text-white/30 truncate hidden md:inline">
              {repo.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {repo.taggedContacts && repo.taggedContacts.length > 0 && (
            <span className="text-[10px] text-blue-400/60 flex items-center gap-1">
              <Users className="h-3 w-3" />
              {repo.taggedContacts.length}
            </span>
          )}
          <LanguageDot language={repo.language} />
          {repo.lastPushed && (
            <span className="text-xs text-white/30 w-16 text-right">
              {formatRelativeDate(repo.lastPushed)}
            </span>
          )}
          <div className="flex items-center gap-1.5">
            {repo.homepage && (
              <a
                href={repo.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-indigo-400 transition-colors"
                title="Deployed site"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="h-3.5 w-3.5" />
              </a>
            )}
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/50 transition-colors"
              title="GitHub"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {repo.localPath && (
              <span className="text-white/20" title={repo.localPath}>
                <HardDrive className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mx-3 mb-3 mt-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex gap-4">
            {/* Left: screenshot (if available) */}
            {repo.screenshot && (
              <div className="shrink-0 w-48">
                <SiteThumbnail screenshot={repo.screenshot} name={repo.name} size="md" />
              </div>
            )}

            {/* Right: details */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Description */}
              {repo.description && (
                <p className="text-sm text-white/60">{repo.description}</p>
              )}

              {/* Editable project links */}
              <ProjectLinkEditor repo={repo} />

              {/* Topics / tags */}
              {repo.topics.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Hash className="h-3 w-3 text-white/20" />
                  {repo.topics.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              {/* Local path */}
              {repo.localPath && (
                <div className="flex items-center gap-1.5">
                  <FolderOpen className="h-3 w-3 text-purple-400" />
                  <code className="text-[11px] text-white/30 font-mono">{repo.localPath}</code>
                </div>
              )}

              {/* Links row */}
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <GitBranch className="h-3 w-3" />
                  View on GitHub
                </a>
                {repo.homepage && (
                  <a
                    href={repo.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    Live site
                  </a>
                )}
              </div>

              {/* Editable contact tags */}
              <ContactTagger repo={repo} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Filter Bar ──────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2.5 py-1 text-xs rounded-md transition-colors',
        active
          ? 'bg-indigo-500/30 text-indigo-300'
          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
      )}
    >
      {children}
    </button>
  )
}

// ─── Main Page ───────────────────────────────────────────────────

export default function DevelopmentPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'has-website' | 'has-local' | 'linked'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['development', 'overview'],
    queryFn: getDevelopmentOverview,
    staleTime: 5 * 60 * 1000,
  })

  // Filter repos
  const filteredRepos = useMemo(() => {
    let repos = data?.repos || []

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      repos = repos.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q) ||
          (r.language || '').toLowerCase().includes(q) ||
          (r.projectCode || '').toLowerCase().includes(q) ||
          r.topics.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Category filter
    if (filter === 'has-website') repos = repos.filter((r) => r.hasWebsite)
    if (filter === 'has-local') repos = repos.filter((r) => r.hasLocalCodebase)
    if (filter === 'linked') repos = repos.filter((r) => r.projectCode)

    return repos
  }, [data?.repos, searchQuery, filter])

  const stats = data?.stats

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <Link
          href="/today"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
              <Code2 className="h-7 w-7 md:h-8 md:w-8 text-indigo-400" />
              Development
            </h1>
            <p className="text-sm md:text-lg text-white/60 mt-1">
              Repos, deployments, and local codebases
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="btn-glass px-3 py-2 flex items-center gap-2 text-sm"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 md:mb-8">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                <GitBranch className="h-4 w-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Repos</p>
                <p className="text-lg font-bold text-white tabular-nums">{stats.totalRepos}</p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Deployments</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {stats.totalDeployments}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <HardDrive className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Local</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {stats.totalLocalCodebases}
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Tag className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Linked</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {stats.linkedRepos}
                  <span className="text-xs text-white/40 ml-1">({stats.linkedPercent}%)</span>
                </p>
              </div>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                <Code2 className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] text-white/50 uppercase tracking-wider">Languages</p>
                <p className="text-lg font-bold text-white tabular-nums">
                  {stats.languages.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="py-16 text-center text-white/40">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400 mx-auto mb-3" />
          Loading development overview...
        </div>
      )}

      {data && (
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-6 md:space-y-8">
            {/* Tier 1: Core Ecosystem */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-indigo-400" />
                Core Ecosystem
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {data.coreSites.map((site) => (
                  <CoreSiteCard key={site.name} site={site} />
                ))}
              </div>
            </section>

            {/* Tier 2: Satellite Sites */}
            {data.satelliteSites.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-400" />
                  Satellite Sites
                  <span className="text-xs text-white/30 font-normal">
                    ({data.satelliteSites.length})
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                  {data.satelliteSites.map((site) => (
                    <SatelliteSiteCard key={site.slug || site.name} site={site} />
                  ))}
                </div>
              </section>
            )}

            {/* Tier 3: All Repos */}
            <section>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-400" />
                  All Repositories
                  <span className="text-xs text-white/30 font-normal">
                    ({filteredRepos.length})
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search repos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-8 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500/50 w-48"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Filters */}
                  <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                    <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
                      All
                    </FilterPill>
                    <FilterPill
                      active={filter === 'has-website'}
                      onClick={() => setFilter('has-website')}
                    >
                      Has Site
                    </FilterPill>
                    <FilterPill
                      active={filter === 'has-local'}
                      onClick={() => setFilter('has-local')}
                    >
                      Local
                    </FilterPill>
                    <FilterPill active={filter === 'linked'} onClick={() => setFilter('linked')}>
                      Linked
                    </FilterPill>
                  </div>
                </div>
              </div>

              <div className="glass-card p-2">
                {filteredRepos.length === 0 ? (
                  <div className="py-8 text-center text-white/40">
                    <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No repos match your search</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {filteredRepos.map((repo) => (
                      <RepoRow key={repo.name} repo={repo} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar: Local Codebases */}
          <aside className="hidden lg:block w-64 shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-white w-full"
            >
              {sidebarOpen ? (
                <ChevronDown className="h-4 w-4 text-white/40" />
              ) : (
                <ChevronRight className="h-4 w-4 text-white/40" />
              )}
              <HardDrive className="h-4 w-4 text-purple-400" />
              Local Codebases
            </button>
            {sidebarOpen && (
              <div className="space-y-1.5">
                {(data.localCodebases || []).map((cb) => (
                  <div
                    key={cb.repoName}
                    className="glass-card-sm p-3 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="text-xs font-medium text-white truncate">
                        {cb.repoName}
                      </span>
                      <ProjectBadge code={cb.projectCode} />
                    </div>
                    <p className="text-[10px] text-white/20 font-mono truncate" title={cb.path}>
                      {cb.path}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <a
                        href={cb.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-white/30 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                      >
                        <GitBranch className="h-3 w-3" />
                        GitHub
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}
