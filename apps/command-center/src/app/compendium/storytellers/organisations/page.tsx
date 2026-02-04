'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, Loader2, Search, FolderKanban } from 'lucide-react'
import { getStorytellerFilters } from '@/lib/api'

export default function OrganisationsListPage() {
  const [search, setSearch] = useState('')

  const filterOptions = useQuery({
    queryKey: ['storyteller-filters'],
    queryFn: getStorytellerFilters,
  })

  const organisations = useMemo(() => {
    const orgs = filterOptions.data?.organisations || []
    if (!search) return orgs
    const q = search.toLowerCase()
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.projectNames.some((p) => p.toLowerCase().includes(q))
    )
  }, [filterOptions.data?.organisations, search])

  if (filterOptions.isLoading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/40">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading organisations...</p>
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
          <Building2 className="h-8 w-8 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Organisations</h1>
        </div>
        <p className="text-lg text-white/60">
          {filterOptions.data?.organisations?.length || 0} organisations linked to storyteller projects
        </p>
      </header>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Search organisations or projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {organisations.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40 text-sm">
          {search ? 'No organisations match your search' : 'No organisations found'}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {organisations.map((org) => (
            <Link
              key={org.id}
              href={`/compendium/storytellers/organisations/${encodeURIComponent(org.id)}`}
              className="glass-card p-5 hover:border-blue-500/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{org.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    {org.projectIds.length} project{org.projectIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {org.projectNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {org.projectNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300"
                    >
                      <FolderKanban className="h-2.5 w-2.5" />
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
