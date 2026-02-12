'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { getProjects, type Project } from '@/lib/api'
import { Archive, ArrowLeft, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  justice: 'bg-red-500/20 text-red-400',
  indigenous: 'bg-green-500/20 text-green-400',
  stories: 'bg-purple-500/20 text-purple-400',
  enterprise: 'bg-blue-500/20 text-blue-400',
  regenerative: 'bg-emerald-500/20 text-emerald-400',
  health: 'bg-pink-500/20 text-pink-400',
  community: 'bg-orange-500/20 text-orange-400',
  arts: 'bg-violet-500/20 text-violet-400',
  events: 'bg-cyan-500/20 text-cyan-400',
  funding: 'bg-yellow-500/20 text-yellow-400',
  tech: 'bg-slate-500/20 text-slate-400',
}

export default function ArchivedProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'archived'],
    queryFn: () => getProjects({ includeArchived: true }),
  })

  const allProjects = data?.projects || []
  const archivedProjects = allProjects.filter(
    (p) => p.status === 'archived' || p.status === 'sunsetting' || p.status === 'transferred'
  )

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link
          href="/projects"
          className="text-sm text-white/40 hover:text-white/70 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Projects
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Archive className="h-8 w-8 text-white/40" />
          Archived Projects
        </h1>
        <p className="text-lg text-white/50 mt-1">
          {archivedProjects.length} archived, sunsetting, or transferred projects
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : archivedProjects.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No archived projects</p>
        </div>
      ) : (
        <div className="space-y-3">
          {archivedProjects.map((project) => (
            <ArchivedProjectCard key={project.code} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ArchivedProjectCard({ project }: { project: Project }) {
  const categoryClass = CATEGORY_COLORS[project.category || ''] || 'bg-white/10 text-white/50'

  return (
    <div className="glass-card p-4 opacity-70 hover:opacity-100 transition-opacity">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-white/30" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{project.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">{project.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {project.category && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', categoryClass)}>
              {project.category}
            </span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">
            {project.status}
          </span>
          {project.description && (
            <p className="text-xs text-white/30 max-w-xs truncate hidden lg:block">
              {project.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
