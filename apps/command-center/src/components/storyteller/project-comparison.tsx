'use client'

import Link from 'next/link'
import {
  Scale,
  Heart,
  ShoppingBag,
  Apple,
  Wheat,
  Palette,
} from 'lucide-react'
import type { ImpactRadarEntry } from '@/lib/api'
import type { LucideIcon } from 'lucide-react'

const PROJECT_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  JusticeHub: { icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'Empathy Ledger': { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/20' },
  Goods: { icon: ShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/20' },
  'The Harvest': { icon: Apple, color: 'text-green-400', bg: 'bg-green-500/20' },
  'The Farm': { icon: Wheat, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'The Studio': { icon: Palette, color: 'text-purple-400', bg: 'bg-purple-500/20' },
}

function getProjectMeta(name: string) {
  for (const [key, meta] of Object.entries(PROJECT_META)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return meta
  }
  return { icon: Heart, color: 'text-white/60', bg: 'bg-white/10' }
}

interface ProjectComparisonProps {
  radarData: ImpactRadarEntry[] | undefined
  /** Map of project name → project ID for linking to detail pages */
  projectIdMap?: Map<string, string>
}

export function ProjectComparison({ radarData, projectIdMap }: ProjectComparisonProps) {
  if (!radarData || radarData.length === 0) {
    return null
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-white/70 mb-4">Project Comparison</h3>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {radarData.map((project) => {
          const meta = getProjectMeta(project.project)
          const Icon = meta.icon
          const topDimension = (['healing', 'identity', 'empowerment', 'capability', 'connection', 'sovereignty'] as const)
            .reduce((best, dim) => (project[dim] > project[best] ? dim : best), 'healing' as const)

          const avgScore = (
            (project.healing + project.identity + project.empowerment +
              project.capability + project.connection + project.sovereignty) / 6
          ).toFixed(2)

          const projectId = projectIdMap?.get(project.project)

          const cardContent = (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg}`}>
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{project.project}</h4>
                  <p className="text-xs text-white/40">
                    {project.storytellerCount} storyteller{project.storytellerCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-white/40">Avg Impact</p>
                  <p className="text-white font-medium">{avgScore}</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="text-white/40">Strongest</p>
                  <p className="text-white font-medium capitalize">{topDimension}</p>
                </div>
              </div>
            </>
          )

          return projectId ? (
            <Link
              key={project.project}
              href={`/compendium/storytellers/project/${encodeURIComponent(projectId)}`}
              className="glass-card p-5 hover:border-indigo-500/30 transition-colors cursor-pointer"
            >
              {cardContent}
            </Link>
          ) : (
            <div key={project.project} className="glass-card p-5">
              {cardContent}
            </div>
          )
        })}
      </div>
    </div>
  )
}
