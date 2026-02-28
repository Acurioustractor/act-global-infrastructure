'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  ChevronLeft,
  Search,
  Filter,
  Globe,
  Lock,
  ExternalLink,
  Eye,
  EyeOff,
  Tag,
  Calendar,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeItem {
  id: string
  title: string
  summary: string
  content?: string
  type: string
  project: string
  projectName: string
  topics: string[]
  publishedAt: string | null
  recordedAt: string
}

interface PublicKnowledgeResponse {
  count: number
  items: KnowledgeItem[]
}

interface AllKnowledgeItem {
  id: string
  title: string
  summary: string | null
  content: string | null
  knowledge_type: string
  project_code: string
  project_name: string
  topics: string[] | null
  public: boolean
  published_at: string | null
  recorded_at: string
}

const typeColors: Record<string, string> = {
  decision: 'bg-purple-500/20 text-purple-400',
  pattern: 'bg-blue-500/20 text-blue-400',
  solution: 'bg-emerald-500/20 text-emerald-400',
  meeting_note: 'bg-amber-500/20 text-amber-400',
  research: 'bg-cyan-500/20 text-cyan-400',
  action_item: 'bg-rose-500/20 text-rose-400',
}

export default function PublicKnowledgePage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [viewMode, setViewMode] = useState<'public' | 'manage'>('public')

  // Public items
  const { data: publicData, isLoading: publicLoading } = useQuery<PublicKnowledgeResponse>({
    queryKey: ['knowledge-public', searchQuery],
    queryFn: () => {
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      return fetch(`/api/knowledge/public?${params}`).then(r => r.json())
    },
  })

  // All items for manage mode
  const { data: allData, isLoading: allLoading } = useQuery<{ items: AllKnowledgeItem[] }>({
    queryKey: ['knowledge-all'],
    queryFn: () => fetch('/api/knowledge?limit=200').then(r => r.json()),
    enabled: viewMode === 'manage',
  })

  const togglePublicMutation = useMutation({
    mutationFn: async ({ id, isPublic }: { id: string; isPublic: boolean }) => {
      const res = await fetch('/api/knowledge/public', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, public: isPublic }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-public'] })
      queryClient.invalidateQueries({ queryKey: ['knowledge-all'] })
    },
  })

  const publicItems = publicData?.items || []

  // Get unique types and projects for filters
  const types = useMemo(() => {
    const set = new Set(publicItems.map(i => i.type))
    return [...set].sort()
  }, [publicItems])

  const projects = useMemo(() => {
    const set = new Set(publicItems.map(i => i.project))
    return [...set].sort()
  }, [publicItems])

  const filtered = useMemo(() => {
    let result = publicItems
    if (typeFilter) result = result.filter(i => i.type === typeFilter)
    if (projectFilter) result = result.filter(i => i.project === projectFilter)
    return result
  }, [publicItems, typeFilter, projectFilter])

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/knowledge" className="text-white/40 hover:text-white/60">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-emerald-400" />
            Public Knowledge Base
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('public')}
            className={cn(
              'px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors',
              viewMode === 'public' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}
          >
            <Globe className="w-4 h-4" />
            Public View
          </button>
          <button
            onClick={() => setViewMode('manage')}
            className={cn(
              'px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors',
              viewMode === 'manage' ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40 hover:text-white/60'
            )}
          >
            <Lock className="w-4 h-4" />
            Manage
          </button>
        </div>
      </div>

      {/* Public View */}
      {viewMode === 'public' && (
        <>
          {/* Search + Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search public knowledge..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
              />
            </div>
            {types.length > 1 && (
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 outline-none"
              >
                <option value="">All Types</option>
                {types.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            )}
            {projects.length > 1 && (
              <select
                value={projectFilter}
                onChange={e => setProjectFilter(e.target.value)}
                className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-lg px-3 py-2 outline-none"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
          </div>

          {/* Summary */}
          <p className="text-white/40 text-sm">
            {filtered.length} open-sourced learnings from the ACT ecosystem
          </p>

          {/* Items Grid */}
          {publicLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-32 glass-card rounded-lg animate-pulse bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <BookOpen className="h-12 w-12 text-white/20 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No Public Knowledge Yet</h2>
              <p className="text-white/50 max-w-md mx-auto">
                Switch to Manage view to mark knowledge items as public.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(item => (
                <div key={item.id} className="glass-card p-5 rounded-lg hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-white font-medium text-sm leading-tight">{item.title}</h3>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full shrink-0', typeColors[item.type] || 'bg-white/10 text-white/50')}>
                      {item.type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <p className="text-white/50 text-xs leading-relaxed mb-3 line-clamp-3">
                    {item.summary}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="w-3 h-3" />
                      {item.project}
                    </span>
                    {item.topics.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {item.topics.slice(0, 3).join(', ')}
                      </span>
                    )}
                    {item.publishedAt && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" />
                        {new Date(item.publishedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Export link */}
          {filtered.length > 0 && (
            <div className="flex gap-3">
              <a
                href="/api/knowledge/public?format=markdown"
                target="_blank"
                className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Export as Markdown
              </a>
              <a
                href="/api/knowledge/public?format=full"
                target="_blank"
                className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Export as JSON
              </a>
            </div>
          )}
        </>
      )}

      {/* Manage View */}
      {viewMode === 'manage' && (
        <>
          <p className="text-white/40 text-sm">
            Toggle items between public and private. Public items are visible to anyone via the API.
          </p>

          {allLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 glass-card rounded-lg animate-pulse bg-white/5" />
              ))}
            </div>
          ) : (
            <div className="glass-card rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">Project</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-center p-3">Public</th>
                  </tr>
                </thead>
                <tbody>
                  {(allData?.items || []).map((item: AllKnowledgeItem) => (
                    <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <p className="text-white/80 text-sm truncate max-w-[400px]">{item.title}</p>
                      </td>
                      <td className="p-3 text-white/50 text-xs">{item.project_code}</td>
                      <td className="p-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full', typeColors[item.knowledge_type] || 'bg-white/10 text-white/50')}>
                          {item.knowledge_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => togglePublicMutation.mutate({ id: item.id, isPublic: !item.public })}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            item.public
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-white/5 text-white/20 hover:text-white/40'
                          )}
                        >
                          {item.public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
