'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWikiStructure, getWikiPage, searchWiki, type WikiSection, type WikiPage } from '@/lib/api'
import {
  Book, Search, ChevronRight, ChevronDown, FileText,
  Home, Users, Map, Layers, Heart, Settings, Calendar,
  ArrowLeft, ExternalLink
} from 'lucide-react'
import { LoadingPage } from '@/components/ui/loading'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const sectionIcons: Record<string, typeof Book> = {
  '01-identity': Heart,
  '02-place': Map,
  '03-ecosystem': Layers,
  '04-story': Book,
  '05-operations': Settings,
  '06-roadmap': Calendar,
  'appendices': FileText,
}

export default function WikiPage() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['01-identity']))

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

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const sections = structure?.sections || []

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
                    setSelectedPath(result.path)
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
                            onClick={() => setSelectedPath(p.path)}
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
              <p className="text-lg font-bold text-white">
                {sections.reduce((acc, s) => acc + s.pages.length, 0)}
              </p>
              <p className="text-xs text-white/50">Pages</p>
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

              <div className="grid grid-cols-2 gap-4">
                {sections.slice(0, 6).map((section) => {
                  const Icon = sectionIcons[section.id] || FileText
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setExpandedSections(new Set([section.id]))
                        if (section.pages.length > 0) {
                          setSelectedPath(section.pages[0].path)
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
                  onClick={() => setSelectedPath(null)}
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
                      <a
                        href={href}
                        className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {children}
                        {href?.startsWith('http') && <ExternalLink className="inline h-3 w-3 ml-1" />}
                      </a>
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
