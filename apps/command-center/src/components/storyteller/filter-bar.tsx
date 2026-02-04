'use client'

import Link from 'next/link'
import { X, FolderKanban, Building2 } from 'lucide-react'
import { FilterDropdown } from './filter-dropdown'
import type { StorytellerFilterOptions } from '@/lib/api'

export interface StorytellerFilters {
  projectIds: string[]
  themes: string[]
  culturalBackgrounds: string[]
  organisationNames: string[]
  isElder: boolean
  isFeatured: boolean
}

export const EMPTY_FILTERS: StorytellerFilters = {
  projectIds: [],
  themes: [],
  culturalBackgrounds: [],
  organisationNames: [],
  isElder: false,
  isFeatured: false,
}

interface FilterBarProps {
  filters: StorytellerFilters
  onChange: (filters: StorytellerFilters) => void
  filterOptions: StorytellerFilterOptions | undefined
}

export function FilterBar({ filters, onChange, filterOptions }: FilterBarProps) {
  const hasActive =
    filters.projectIds.length > 0 ||
    filters.themes.length > 0 ||
    filters.culturalBackgrounds.length > 0 ||
    filters.organisationNames.length > 0 ||
    filters.isElder ||
    filters.isFeatured

  return (
    <div className="glass-card p-3 flex flex-wrap items-center gap-2">
      <FilterDropdown
        label="Project"
        options={(filterOptions?.projects || []).map((p) => ({
          value: p.id,
          label: p.name,
          count: p.count,
        }))}
        selected={filters.projectIds}
        onChange={(projectIds) => onChange({ ...filters, projectIds })}
      />

      {(filterOptions?.organisations?.length ?? 0) > 0 && (
        <FilterDropdown
          label="Organisation"
          options={(filterOptions?.organisations || []).map((o) => ({
            value: o.name,
            label: o.name,
            count: o.projectIds.length,
          }))}
          selected={filters.organisationNames}
          onChange={(organisationNames) => onChange({ ...filters, organisationNames })}
          searchable
        />
      )}

      <FilterDropdown
        label="Theme"
        options={(filterOptions?.themes || []).slice(0, 50).map((t) => ({
          value: t.theme,
          label: t.theme,
          count: t.count,
        }))}
        selected={filters.themes}
        onChange={(themes) => onChange({ ...filters, themes })}
        searchable
      />

      <FilterDropdown
        label="Culture"
        options={(filterOptions?.culturalBackgrounds || []).map((b) => ({
          value: b.background,
          label: b.background,
          count: b.count,
        }))}
        selected={filters.culturalBackgrounds}
        onChange={(culturalBackgrounds) => onChange({ ...filters, culturalBackgrounds })}
      />

      {/* Toggle pills */}
      <button
        onClick={() => onChange({ ...filters, isElder: !filters.isElder })}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          filters.isElder
            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30'
            : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
        }`}
      >
        Elder
      </button>

      <button
        onClick={() => onChange({ ...filters, isFeatured: !filters.isFeatured })}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          filters.isFeatured
            ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/30'
            : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20'
        }`}
      >
        Featured
      </button>

      {hasActive && (
        <button
          onClick={() => onChange(EMPTY_FILTERS)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <X className="h-3 w-3" />
          Clear All
        </button>
      )}

      <div className="flex-1" />

      {/* Navigation links */}
      <Link
        href="/compendium/storytellers/project"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
      >
        <FolderKanban className="h-3 w-3" />
        Browse Projects
      </Link>
      {(filterOptions?.organisations?.length ?? 0) > 0 && (
        <Link
          href="/compendium/storytellers/organisations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <Building2 className="h-3 w-3" />
          Browse Organisations
        </Link>
      )}
    </div>
  )
}
