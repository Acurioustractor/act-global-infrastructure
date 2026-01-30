'use client'

import Link from 'next/link'
import {
  BookOpen,
  Scale,
  Heart,
  Apple,
  ShoppingBag,
  Palette,
  Wheat,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { StoryManagement } from '@/components/story-management'

const coreProjects = [
  {
    slug: 'justicehub',
    name: 'JusticeHub',
    description: 'Youth justice transformation through community-led solutions',
    icon: Scale,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    actPlaceUrl: 'https://act.place/projects/justicehub',
  },
  {
    slug: 'empathy-ledger',
    name: 'Empathy Ledger',
    description: 'Community storytelling platform that centers data sovereignty',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/30',
    actPlaceUrl: 'https://act.place/projects/empathy-ledger',
  },
  {
    slug: 'goods',
    name: 'Goods',
    description: 'Economic empowerment through community-owned enterprises',
    icon: ShoppingBag,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    border: 'border-orange-500/30',
    actPlaceUrl: 'https://act.place/projects/goods-on-country',
  },
  {
    slug: 'the-harvest',
    name: 'The Harvest',
    description: 'Regenerative agriculture and community food systems',
    icon: Apple,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    border: 'border-green-500/30',
    actPlaceUrl: 'https://act.place/projects/the-harvest',
  },
  {
    slug: 'the-farm',
    name: 'The Farm',
    description: 'Land-based healing and cultural connection',
    icon: Wheat,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    actPlaceUrl: 'https://act.place/farm',
  },
  {
    slug: 'the-studio',
    name: 'The Studio',
    description: 'Creative technology and regenerative design',
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/30',
    actPlaceUrl: 'https://regenerative.studio',
  },
]

export default function CompendiumPage() {
  return (
    <div className="min-h-screen p-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-8 w-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-white">Project Compendium</h1>
        </div>
        <p className="text-lg text-white/60">
          Deep documentation for ACT's core ecosystem projects
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {coreProjects.map((project) => {
          const Icon = project.icon
          return (
            <Link
              key={project.slug}
              href={`/compendium/${project.slug}`}
              className={cn(
                'glass-card p-6 hover:border-white/20 transition-all group',
                project.border
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0', project.bg)}>
                  <Icon className={cn('h-7 w-7', project.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={cn('text-xl font-semibold', project.color)}>
                    {project.name}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    {project.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors flex items-center gap-1">
                  View Compendium
                  <ArrowRight className="h-4 w-4" />
                </span>
                <a
                  href={project.actPlaceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  act.place
                </a>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Community Stories Section */}
      <section className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="h-7 w-7 text-pink-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Community Stories</h2>
            <p className="text-sm text-white/50">
              Storytellers from the Empathy Ledger and community projects
            </p>
          </div>
        </div>
        <StoryManagement />
      </section>
    </div>
  )
}
