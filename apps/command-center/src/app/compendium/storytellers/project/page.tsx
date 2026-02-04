'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, FolderKanban, Loader2, Users, Sparkles } from 'lucide-react'
import { getStorytellerFilters } from '@/lib/api'

export default function ProjectsListPage() {
  const filterOptions = useQuery({
    queryKey: ['storyteller-filters'],
    queryFn: getStorytellerFilters,
  })

  const projects = useMemo(() => {
    return (filterOptions.data?.projects || []).sort((a, b) => b.count - a.count)
  }, [filterOptions.data?.projects])

  if (filterOptions.isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <Link
          href="/compendium/storytellers"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Storyteller Intelligence
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <FolderKanban className="h-8 w-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">Storyteller Projects</h1>
        </div>
        <p className="text-lg text-white/60">
          {projects.length} projects with storyteller data
        </p>
      </header>

      {projects.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40 text-sm">
          No projects found
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/compendium/storytellers/project/${encodeURIComponent(project.id)}`}
              className="glass-card p-5 hover:border-indigo-500/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white">{project.name}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.count} storyteller{project.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
