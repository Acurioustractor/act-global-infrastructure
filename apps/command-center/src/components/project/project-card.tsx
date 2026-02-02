'use client'

import { type Project } from '@/lib/api'
import { formatRelativeDate, cn, getLCAAColor, getLCAABg } from '@/lib/utils'
import { FolderKanban, Activity, Clock, Ear, Search, Zap, Palette } from 'lucide-react'

interface ProjectCardProps {
  project: Project
}

const stageIcons = {
  listen: Ear,
  curiosity: Search,
  action: Zap,
  art: Palette,
}

export function ProjectCard({ project }: ProjectCardProps) {
  const StageIcon = project.lcaa_stage
    ? stageIcons[project.lcaa_stage]
    : FolderKanban
  const stageColor = getLCAAColor(project.lcaa_stage || '')
  const stageBg = getLCAABg(project.lcaa_stage || '')

  return (
    <div className="group card hover:border-listen/30 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl',
            stageBg
          )}
        >
          <StageIcon className={cn('h-5 w-5', stageColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate">
              {project.name}
            </h3>
            {project.code && (
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs font-mono text-text-muted">
                {project.code}
              </span>
            )}
          </div>

          {project.description && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {project.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-text-muted">
            {project.lcaa_stage && (
              <span className={cn('flex items-center gap-1 font-medium', stageColor)}>
                <StageIcon className="h-3 w-3" />
                {project.lcaa_stage.charAt(0).toUpperCase() + project.lcaa_stage.slice(1)}
              </span>
            )}

            {project.status && (
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {project.status}
              </span>
            )}

            {project.last_activity && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(project.last_activity)}
              </span>
            )}

            {project.health_score !== undefined && (
              <span
                className={cn(
                  'font-medium',
                  project.health_score >= 80
                    ? 'text-action'
                    : project.health_score >= 50
                      ? 'text-orange-400'
                      : 'text-red-400'
                )}
              >
                {project.health_score}% health
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
