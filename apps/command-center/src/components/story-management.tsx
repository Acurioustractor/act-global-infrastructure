'use client'

import { useEffect, useState } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Heart, MapPin, Shield, ShieldOff, User, Loader2 } from 'lucide-react'

interface Story {
  id: string
  storytellerName: string
  bio: string
  expertiseAreas: string[]
  mediaType: string | null
  consentGiven: boolean
  consentDate: string | null
  consentExpiry: string | null
  location: string | null
  createdAt: string
  updatedAt: string | null
  projectName: string | null
}

export function StoryManagement() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStories()
  }, [])

  const loadStories = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/stories')
      if (!response.ok) {
        throw new Error(`Failed to load stories: ${response.status}`)
      }
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Unknown error')
      }
      setStories(data.stories || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stories')
      console.error('Error loading stories:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading community stories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-card border-red-500/30 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-red-400">
              Could not load stories
            </h3>
            <p className="text-sm text-text-muted mt-1">{error}</p>
          </div>
          <button
            onClick={loadStories}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const consentedCount = stories.filter((s) => s.consentGiven).length

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-semibold text-pink-400">
            {stories.length}
          </p>
          <p className="mt-1 text-xs text-text-muted">Total storytellers</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-semibold text-green-400">
            {consentedCount}
          </p>
          <p className="mt-1 text-xs text-text-muted">Consent given</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-semibold text-amber-400">
            {stories.length - consentedCount}
          </p>
          <p className="mt-1 text-xs text-text-muted">Consent pending</p>
        </div>
      </div>

      {/* Story list */}
      {stories.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Heart className="mx-auto h-10 w-10 text-pink-400/40" />
          <h3 className="mt-4 text-lg font-medium text-text-primary">
            No storytellers yet
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            Community storytellers will appear here once they are added to the
            Empathy Ledger.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  )
}

function StoryCard({ story }: { story: Story }) {
  return (
    <div className="glass-card p-5 hover:border-pink-500/30 transition-colors">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-pink-500/20">
          <User className="h-5 w-5 text-pink-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate">
              {story.storytellerName}
            </h3>
            {story.consentGiven ? (
              <Shield className="h-4 w-4 text-green-400 flex-shrink-0" />
            ) : (
              <ShieldOff className="h-4 w-4 text-amber-400 flex-shrink-0" />
            )}
          </div>

          {story.projectName && (
            <p className="text-xs text-pink-400/80 mt-0.5">
              {story.projectName}
            </p>
          )}

          {story.bio && (
            <p className="mt-1.5 text-sm text-text-secondary line-clamp-2">
              {story.bio}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {story.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {story.location}
              </span>
            )}
            {story.mediaType && (
              <span className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono">
                {story.mediaType}
              </span>
            )}
            <span>{formatDate(story.createdAt)}</span>
          </div>

          {story.expertiseAreas.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {story.expertiseAreas.slice(0, 4).map((area) => (
                <span
                  key={area}
                  className="rounded-full bg-pink-500/10 px-2 py-0.5 text-xs text-pink-300"
                >
                  {area}
                </span>
              ))}
              {story.expertiseAreas.length > 4 && (
                <span className="text-xs text-text-muted">
                  +{story.expertiseAreas.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
