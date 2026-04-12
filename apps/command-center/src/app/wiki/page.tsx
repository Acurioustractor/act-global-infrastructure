'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWikiStructure, getWikiPage, searchWiki, getWikiStatus, type WikiSection, type WikiPage } from '@/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Book, Search, ChevronRight, ChevronDown, FileText,
  Home, Users, Map, Layers, Heart, Settings, Calendar, AlertTriangle, Link2, Sprout,
  ExternalLink
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const sectionIcons: Record<string, typeof Book> = {
  concepts: Layers,
  projects: Settings,
  communities: Map,
  people: Users,
  stories: Book,
  art: Heart,
  research: Search,
  technical: Settings,
  finance: Calendar,
  decisions: FileText,
  synthesis: Book,
}

type RepairEntry = {
  stem: string
  title: string
  relative_path: string
  page_path: string
}

type BrokenLinkRepairEntry = RepairEntry & {
  missing_target: string
}

type BacklinkRepairEntry = RepairEntry & {
  target: RepairEntry
}

export default function WikiPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['concepts']))

  useEffect(() => {
    const pageParam = searchParams.get('page')
    setSelectedPath(pageParam)
  }, [searchParams])

  const { data: structure, isLoading: structureLoading } = useQuery({
    queryKey: ['wiki', 'structure'],
    queryFn: getWikiStructure,
  })

  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ['wiki', 'page', selectedPath],
    queryFn: () => selectedPath ? getWikiPage(selectedPath) : Promise.resolve(null),
    enabled: !!selectedPath,
  })

  const { data: searchResults } = useQuery({
    queryKey: ['wiki', 'search', searchQuery],
    queryFn: () => searchWiki(searchQuery),
    enabled: searchQuery.length >= 2,
  })

  const { data: wikiStatus } = useQuery({
    queryKey: ['wiki', 'status'],
    queryFn: getWikiStatus,
  })

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const openPage = (path: string | null) => {
    setSelectedPath(path)
    if (path) {
      router.replace(`/wiki?page=${encodeURIComponent(path)}`)
    } else {
      router.replace('/wiki')
    }
  }

  const getInternalWikiPath = (href?: string) => {
    if (!href?.startsWith('/wiki?page=')) return null
    const [, query = ''] = href.split('?')
    const params = new URLSearchParams(query)
    return params.get('page')
  }

  const sections = structure?.sections || []
  const totalPages = sections.reduce((acc, s) => acc + s.pages.length, 0)
  const formattedGeneratedAt = wikiStatus
    ? new Date(wikiStatus.generated_at).toLocaleString('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null
  const brokenLinkQueue = wikiStatus?.repair_queue.broken_links.slice(0, 4) || []
  const missingIndexQueue = wikiStatus?.repair_queue.missing_from_index.slice(0, 4) || []
  const missingBacklinkQueue = wikiStatus?.repair_queue.missing_backlinks?.slice(0, 4) || []
  const advisoryBacklinkQueue = wikiStatus?.repair_queue.advisory_backlinks?.slice(0, 4) || []
  const orphanQueue = wikiStatus?.repair_queue.orphan_pages.slice(0, 4) || []
  const topStub = wikiStatus?.repair_queue.stubs[0] || null

  const renderQueueItem = (
    item: RepairEntry,
    subtitle: ReactNode,
    accentClass = 'border-white/10 hover:border-white/20',
    keySuffix?: string,
  ) => (
    <button
      key={`${item.page_path}-${item.relative_path}${keySuffix ? `-${keySuffix}` : ''}`}
      onClick={() => openPage(item.page_path)}
      className={`w-full rounded-xl border bg-black/20 px-4 py-3 text-left transition-colors ${accentClass}`}
    >
      <p className="truncate text-sm font-medium text-white">{item.title}</p>
      <div className="mt-1 text-xs text-white/50">{subtitle}</div>
      <p className="mt-2 truncate font-mono text-[11px] text-white/35">{item.relative_path}</p>
    </button>
  )

  const renderBrokenLinkItem = (item: BrokenLinkRepairEntry) =>
    renderQueueItem(
      item,
      <>
        Missing wikilink{' '}
        <span className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-rose-200">
          [[{item.missing_target}]]
        </span>
      </>,
      'border-rose-500/20 hover:border-rose-400/40',
      item.missing_target,
    )

  const renderBacklinkItem = (
    item: BacklinkRepairEntry,
    label: string,
    accentClass = 'border-white/10 hover:border-white/20',
  ) =>
    renderQueueItem(
      item,
      <>
        {label}{' '}
        <span className="rounded bg-white/10 px-1 py-0.5 text-[11px] text-white/70">
          {item.target.title}
        </span>
      </>,
      accentClass,
      item.target.page_path,
    )

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 bg-black/20 flex flex-col flex-shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Book className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ACT Compendium</h1>
              <p className="text-xs text-white/50">Living knowledge wiki</p>
            </div>
          </div>

          {wikiStatus && (
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="flex items-center gap-2 text-emerald-300 mb-2">
                <Sprout className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">Canonical Health</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/20 p-2">
                  <p className="text-lg font-bold text-white">{wikiStatus.summary.total_articles}</p>
                  <p className="text-[11px] text-white/55">Canonical articles</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <p className="text-lg font-bold text-white">{wikiStatus.summary.total_links}</p>
                  <p className="text-[11px] text-white/55">Wikilinks</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <p className="text-lg font-bold text-amber-300">{wikiStatus.summary.orphans}</p>
                  <p className="text-[11px] text-white/55">Orphans</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2">
                  <p className="text-lg font-bold text-rose-300">{wikiStatus.summary.broken_links}</p>
                  <p className="text-[11px] text-white/55">Broken links</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-white/45">
                {wikiStatus.scope} · refreshed {formattedGeneratedAt}
              </p>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search wiki..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && searchResults?.results && (
          <div className="p-4 border-b border-white/10 max-h-64 overflow-y-auto">
            <p className="text-xs text-white/50 mb-2">
              {searchResults.results.length} results for "{searchQuery}"
            </p>
            <div className="space-y-2">
              {searchResults.results.map((result) => (
                <button
                  key={result.path}
                  onClick={() => {
                    openPage(result.path)
                    setSearchQuery('')
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <p className="text-sm font-medium text-white truncate">{result.title}</p>
                  <p className="text-xs text-white/40 truncate">{result.snippet}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {structureLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map((section) => {
                const Icon = sectionIcons[section.id] || FileText
                const isExpanded = expandedSections.has(section.id)

                return (
                  <div key={section.id}>
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-white/80 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-white/40" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white/40" />
                      )}
                      <Icon className="h-4 w-4 text-indigo-400" />
                      <span className="text-sm font-medium">{section.title}</span>
                      <span className="ml-auto text-xs text-white/30">{section.pages.length}</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {section.pages.map((p) => (
                          <button
                            key={p.path}
                            onClick={() => openPage(p.path)}
                            className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              selectedPath === p.path
                                ? 'bg-indigo-500/20 text-indigo-300'
                                : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                            }`}
                          >
                            {p.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </nav>

        {/* Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-white">{sections.length}</p>
              <p className="text-xs text-white/50">Sections</p>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <p className="text-lg font-bold text-white">{totalPages}</p>
              <p className="text-xs text-white/50">Visible pages</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {!selectedPath ? (
          <div className="p-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <Book className="h-10 w-10 text-indigo-400" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">ACT Compendium 2026</h1>
                <p className="text-lg text-white/60">
                  A regenerative innovation studio stewarding a working farm on Jinibara Country.
                </p>
              </div>

              {wikiStatus && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="glass-card p-4 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2 text-emerald-300">
                      <Sprout className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.16em]">Canon</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{wikiStatus.summary.total_articles}</p>
                    <p className="text-sm text-white/55">articles in the live graph</p>
                  </div>
                  <div className="glass-card p-4 border border-sky-500/20">
                    <div className="flex items-center gap-2 mb-2 text-sky-300">
                      <Link2 className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.16em]">Links</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{wikiStatus.summary.total_links}</p>
                    <p className="text-sm text-white/55">cross-links in play</p>
                  </div>
                  <div className="glass-card p-4 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2 text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.16em]">Orphans</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{wikiStatus.summary.orphans}</p>
                    <p className="text-sm text-white/55">pages needing graph connection</p>
                  </div>
                  <div className="glass-card p-4 border border-rose-500/20">
                    <div className="flex items-center gap-2 mb-2 text-rose-300">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.16em]">Broken</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{wikiStatus.summary.broken_links}</p>
                    <p className="text-sm text-white/55">links to repair next</p>
                  </div>
                </div>
              )}

              {wikiStatus && (
                <div className="mb-8">
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Repair Queue</p>
                      <h2 className="mt-1 text-2xl font-semibold text-white">Fix the graph where it breaks first</h2>
                    </div>
                    <p className="max-w-md text-right text-sm text-white/45">
                      These cards are pulled from the canonical lint artifact. Open the source page, repair the graph, then rerun the wiki pipeline.
                    </p>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="glass-card border border-rose-500/20 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15">
                          <Link2 className="h-5 w-5 text-rose-300" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Broken links</h3>
                          <p className="text-xs text-white/50">{wikiStatus.summary.broken_links} issues in the live graph</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {brokenLinkQueue.length > 0 ? brokenLinkQueue.map(renderBrokenLinkItem) : (
                          <p className="text-sm text-white/50">No broken links in the current canonical lint run.</p>
                        )}
                      </div>
                    </div>

                    <div className="glass-card border border-sky-500/20 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15">
                          <FileText className="h-5 w-5 text-sky-300" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Missing from index</h3>
                          <p className="text-xs text-white/50">{wikiStatus.summary.missing_from_index} pages need catalog coverage</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {missingIndexQueue.length > 0 ? missingIndexQueue.map((item) => (
                          renderQueueItem(
                            item,
                            <span>Visible in the graph, absent from <span className="font-mono text-[11px] text-sky-200">wiki/index.md</span></span>,
                            'border-sky-500/20 hover:border-sky-400/40'
                          )
                        )) : (
                          <p className="text-sm text-white/50">Everything in the graph is indexed.</p>
                        )}
                      </div>
                    </div>

                    <div className="glass-card border border-amber-500/20 p-5">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
                          <AlertTriangle className="h-5 w-5 text-amber-300" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">Orphans</h3>
                          <p className="text-xs text-white/50">{wikiStatus.summary.orphans} pages have no incoming graph support</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {orphanQueue.length > 0 ? orphanQueue.map((item) => (
                          renderQueueItem(
                            item,
                            <span>Add an index entry or backlink so this page becomes reachable.</span>,
                            'border-amber-500/20 hover:border-amber-400/40'
                          )
                        )) : (
                          <p className="text-sm text-white/50">No orphan pages in the current canonical lint run.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {topStub && (
                    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Next enrichment candidate</p>
                          <p className="mt-1 text-sm text-white/70">
                            <span className="font-medium text-white">{topStub.title}</span> is still a stub at {topStub.lines} lines.
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-white/40">{topStub.relative_path}</p>
                        </div>
                        <button
                          onClick={() => openPage(topStub.page_path)}
                          className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:border-emerald-300/50 hover:bg-emerald-400/15"
                        >
                          Open stub
                        </button>
                      </div>
                    </div>
                  )}

                  {wikiStatus && (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Cross-link Signals</p>
                          <h3 className="mt-1 text-lg font-semibold text-white">Backlinks are guidance, not blanket repair work</h3>
                        </div>
                        <div className="text-sm text-white/55 md:text-right">
                          <p>{wikiStatus.summary.missing_backlinks} direct suggestions</p>
                          <p>{wikiStatus.summary.advisory_backlinks ?? 0} advisory hub references</p>
                        </div>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm text-white/50">
                        {wikiStatus.backlink_policy?.missing_backlinks || 'Reciprocal links are most useful when two non-hub pages genuinely need each other for navigation.'}{' '}
                        {wikiStatus.backlink_policy?.advisory_backlinks || 'Hub, portfolio, and cluster pages often work as one-way references.'}
                      </p>

                      <div className="mt-4 grid gap-4 xl:grid-cols-2">
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Direct suggestions</p>
                          <div className="space-y-3">
                            {missingBacklinkQueue.length > 0 ? missingBacklinkQueue.map((item) => (
                              renderBacklinkItem(
                                item,
                                'Consider a reciprocal link from',
                                'border-indigo-500/20 hover:border-indigo-400/40',
                              )
                            )) : (
                              <p className="text-sm text-white/50">No direct backlink suggestions in the current lint run.</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Advisory hub references</p>
                          <div className="space-y-3">
                            {advisoryBacklinkQueue.length > 0 ? advisoryBacklinkQueue.map((item) => (
                              renderBacklinkItem(
                                item,
                                'Hub/list reference to',
                                'border-white/10 hover:border-white/20',
                              )
                            )) : (
                              <p className="text-sm text-white/50">No advisory hub references in the current lint run.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {sections.slice(0, 6).map((section) => {
                  const Icon = sectionIcons[section.id] || FileText
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setExpandedSections(new Set([section.id]))
                        if (section.pages.length > 0) {
                          openPage(section.pages[0].path)
                        }
                      }}
                      className="glass-card p-6 text-left hover:border-indigo-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {section.title}
                          </h3>
                          <p className="text-xs text-white/50">{section.pages.length} pages</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {section.pages.slice(0, 3).map((p) => (
                          <p key={p.path} className="text-sm text-white/60 truncate">
                            {p.title}
                          </p>
                        ))}
                        {section.pages.length > 3 && (
                          <p className="text-xs text-white/40">
                            +{section.pages.length - 3} more
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : pageLoading ? (
          <LoadingPage />
        ) : page ? (
          <div className="p-8">
            <div className="max-w-3xl mx-auto">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 mb-6 text-sm">
                <button
                  onClick={() => openPage(null)}
                  className="text-white/50 hover:text-white transition-colors flex items-center gap-1"
                >
                  <Home className="h-4 w-4" />
                  Home
                </button>
                <ChevronRight className="h-4 w-4 text-white/30" />
                <span className="text-white/50">{page.path.split('/')[0]}</span>
                <ChevronRight className="h-4 w-4 text-white/30" />
                <span className="text-indigo-400">{page.title}</span>
              </div>

              {/* Page Content */}
              <article className="prose prose-invert prose-indigo max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-3xl font-bold text-white mb-6">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-2xl font-semibold text-white mt-8 mb-4 border-b border-white/10 pb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-xl font-medium text-white mt-6 mb-3">{children}</h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-white/70 mb-4 leading-relaxed">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-white/70 space-y-2 mb-4">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-white/70 space-y-2 mb-4">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-white/70">{children}</li>
                    ),
                    a: ({ href, children }) => (
                      getInternalWikiPath(href) ? (
                        <button
                          type="button"
                          onClick={() => openPage(getInternalWikiPath(href))}
                          className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                        >
                          {children}
                        </button>
                      ) : (
                        <a
                          href={href}
                          className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                          target={href?.startsWith('http') ? '_blank' : undefined}
                          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {children}
                          {href?.startsWith('http') && <ExternalLink className="inline h-3 w-3 ml-1" />}
                        </a>
                      )
                    ),
                    code: ({ children }) => (
                      <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm text-indigo-300">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-black/40 border border-white/10 rounded-lg p-4 overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-indigo-500/50 pl-4 italic text-white/60 my-4">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-6 rounded-lg border border-white/10">
                        <table className="min-w-full divide-y divide-white/10">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-white/5">{children}</thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody className="divide-y divide-white/5">{children}</tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="hover:bg-white/5 transition-colors">{children}</tr>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-3 text-sm text-white/70">
                        {children}
                      </td>
                    ),
                    hr: () => <hr className="border-white/10 my-8" />,
                  }}
                >
                  {page.content}
                </ReactMarkdown>
              </article>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50">Page not found</p>
          </div>
        )}
      </main>
    </div>
  )
}
