'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  Scale,
  Heart,
  Apple,
  ShoppingBag,
  Palette,
  Wheat,
  ExternalLink,
  Globe,
  Github,
  Users,
  Target,
  Lightbulb,
  Zap,
  FileText,
  Calendar,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Edit3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getProjectByCode, getNotionProjectsRaw, type NotionProject } from '@/lib/api'

// Project configurations with rich data
const projectData: Record<string, {
  name: string
  tagline: string
  icon: typeof Scale
  color: string
  bg: string
  actPlaceUrl: string
  website?: string
  github?: string
  lcaa: {
    listen?: string
    curiosity?: string
    action?: string
    art?: string
  }
  keyMetrics?: Array<{ label: string; value: string }>
  sections: Array<{
    title: string
    icon: typeof BookOpen
    content: string
  }>
}> = {
  'justicehub': {
    name: 'JusticeHub',
    tagline: 'Transforming youth justice through community-led solutions',
    icon: Scale,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    actPlaceUrl: 'https://act.place/projects/justicehub',
    website: 'https://justicehub.com.au',
    github: 'act-now-coalition/justicehub',
    lcaa: {
      listen: 'Deep listening with young people, families, and communities affected by the justice system',
      curiosity: 'Exploring what authentic community-led justice looks like',
      action: 'Building platforms and programs that center community voice',
      art: 'Storytelling that shifts narratives around youth and justice',
    },
    keyMetrics: [
      { label: 'Young People Engaged', value: '2,400+' },
      { label: 'Community Partners', value: '45' },
      { label: 'Stories Collected', value: '180+' },
    ],
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'JusticeHub exists to transform how communities and systems respond to young people. We believe that those closest to the problem are closest to the solution.',
      },
      {
        title: 'How It Works',
        icon: Lightbulb,
        content: 'We partner with communities to co-design justice responses that address root causes, not just symptoms. Our platform connects young people with mentors, resources, and pathways forward.',
      },
      {
        title: 'Key Initiatives',
        icon: Zap,
        content: '• Diagrama partnership (Spain)\n• Quandamooka Justice Strategy\n• Youth Voice programs across Queensland\n• Community-led diversion programs',
      },
    ],
  },
  'empathy-ledger': {
    name: 'Empathy Ledger',
    tagline: 'Community storytelling that centers data sovereignty',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-500/20',
    actPlaceUrl: 'https://act.place/projects/empathy-ledger',
    website: 'https://empathy-ledger.vercel.app',
    github: 'act-now-coalition/empathy-ledger-v2',
    lcaa: {
      listen: 'Creating safe spaces for community members to share their stories',
      curiosity: 'Understanding how stories can measure and communicate impact',
      action: 'Building technology that gives communities control over their narratives',
      art: 'Amplifying voices through multimedia storytelling',
    },
    keyMetrics: [
      { label: 'Storytellers', value: '320+' },
      { label: 'Stories Captured', value: '450+' },
      { label: 'Communities', value: '12' },
    ],
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'Empathy Ledger puts storytelling power back in community hands. We believe stories are data, and communities should control how their stories are shared and used.',
      },
      {
        title: 'Data Sovereignty',
        icon: Lightbulb,
        content: 'Every storyteller owns their content. They decide who can access their stories, how they can be used, and can revoke access at any time. This is true data sovereignty.',
      },
      {
        title: 'ALMA Framework',
        icon: Zap,
        content: 'ALMA (Active Listening, Measuring, Amplifying) is our methodology for capturing impact through stories. It connects lived experience to measurable outcomes.',
      },
    ],
  },
  'goods': {
    name: 'Goods',
    tagline: 'Economic empowerment through community-owned enterprise',
    icon: ShoppingBag,
    color: 'text-orange-400',
    bg: 'bg-orange-500/20',
    actPlaceUrl: 'https://act.place/projects/goods-on-country',
    website: 'https://goodsoncountry.netlify.app',
    lcaa: {
      listen: 'Understanding community economic aspirations and barriers',
      curiosity: 'Exploring models of community ownership and wealth building',
      action: 'Creating platforms for community enterprise and exchange',
      art: 'Celebrating the story and provenance of community-made goods',
    },
    keyMetrics: [
      { label: 'Community Enterprises', value: '23' },
      { label: 'Products Listed', value: '150+' },
      { label: 'Locations', value: '8' },
    ],
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'Goods creates pathways for community economic self-determination. We support community enterprises to thrive through connection, capability building, and market access.',
      },
      {
        title: 'The Model',
        icon: Lightbulb,
        content: 'We partner with communities to identify, develop, and scale local enterprises. Our platform connects makers with markets while keeping ownership and profits in community.',
      },
      {
        title: 'Active Locations',
        icon: Zap,
        content: '• Tennant Creek\n• Mount Isa\n• Palm Island\n• Alice Springs\n• Witta (Sunshine Coast)\n• Brisbane',
      },
    ],
  },
  'the-harvest': {
    name: 'The Harvest',
    tagline: 'Regenerative agriculture and community food systems',
    icon: Apple,
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    actPlaceUrl: 'https://act.place/projects/the-harvest',
    website: 'https://theharvestwitta.com.au',
    lcaa: {
      listen: 'Learning from land and community about what thriving food systems look like',
      curiosity: 'Exploring regenerative growing practices and community distribution',
      action: 'Growing, harvesting, and distributing food through community networks',
      art: 'Celebrating food as culture, connection, and healing',
    },
    keyMetrics: [
      { label: 'Acres Under Cultivation', value: '15' },
      { label: 'CSA Members', value: '120' },
      { label: 'Volunteer Hours/Year', value: '2,400+' },
    ],
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'The Harvest grows food and community together. We practice regenerative agriculture that heals land while building local food resilience.',
      },
      {
        title: 'How We Grow',
        icon: Lightbulb,
        content: 'We use no-till, organic methods that build soil health. Every crop we grow leaves the land better than we found it. Community members participate in planting, tending, and harvesting.',
      },
      {
        title: 'Distribution',
        icon: Zap,
        content: '• Weekly CSA boxes\n• Local market stalls\n• Restaurant partnerships\n• Community food programs\n• Seed saving and sharing',
      },
    ],
  },
  'the-farm': {
    name: 'The Farm',
    tagline: 'Land-based healing and cultural connection',
    icon: Wheat,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    actPlaceUrl: 'https://act.place/farm',
    lcaa: {
      listen: 'Sitting with Country and learning its rhythms and needs',
      curiosity: 'Exploring how land connection supports wellbeing and healing',
      action: 'Creating spaces for retreats, workshops, and cultural practice',
      art: 'Expressing the relationship between people and place',
    },
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'The Farm is where ACT\'s work is rooted - literally. This land in Witta serves as a living laboratory for regenerative practice and a sanctuary for healing.',
      },
      {
        title: 'What Happens Here',
        icon: Lightbulb,
        content: 'Retreats, workshops, team gatherings, and cultural exchanges. The Farm hosts individuals and groups seeking connection with land and each other.',
      },
      {
        title: 'The Land',
        icon: Zap,
        content: '50 acres in the Sunshine Coast Hinterland, including rainforest, orchards, gardens, and gathering spaces. We acknowledge this as Kabi Kabi Country.',
      },
    ],
  },
  'the-studio': {
    name: 'The Studio',
    tagline: 'Creative technology for regenerative futures',
    icon: Palette,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    actPlaceUrl: 'https://regenerative.studio',
    website: 'https://regenerative.studio',
    github: 'act-now-coalition/act-regenerative-studio',
    lcaa: {
      listen: 'Understanding what communities need from technology',
      curiosity: 'Exploring how tech can serve rather than extract',
      action: 'Building tools that amplify community capacity',
      art: 'Design and development as creative practice',
    },
    sections: [
      {
        title: 'Mission',
        icon: Target,
        content: 'The Studio builds technology that serves community self-determination. We create tools, platforms, and systems that amplify rather than extract.',
      },
      {
        title: 'Our Approach',
        icon: Lightbulb,
        content: 'Community-first design. Open source everything. Build for handover. Create space for community ownership of technology.',
      },
      {
        title: 'Current Projects',
        icon: Zap,
        content: '• Empathy Ledger platform\n• ACT Command Center\n• Community data infrastructure\n• AI agents for community work\n• ALMA measurement framework',
      },
    ],
  },
}

interface PageParams {
  params: Promise<{ project: string }>
}

export default function CompendiumProjectPage({ params }: PageParams) {
  const { project: projectSlug } = use(params)

  const projectInfo = projectData[projectSlug]

  // Fetch enriched data from API
  const { data: enrichedProject } = useQuery({
    queryKey: ['project', 'enriched', projectSlug],
    queryFn: () => getProjectByCode(projectSlug),
  })

  // Fetch Notion data
  const { data: notionData } = useQuery({
    queryKey: ['projects', 'notion', 'raw'],
    queryFn: getNotionProjectsRaw,
  })

  const notionProject = notionData?.projects?.find(p =>
    p.name.toLowerCase().includes(projectSlug.replace(/-/g, ' '))
  )

  if (!projectInfo) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white">Project not found</h1>
          <p className="mt-2 text-white/60">Slug: {projectSlug}</p>
          <Link href="/compendium" className="btn-glass mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Compendium
          </Link>
        </div>
      </div>
    )
  }

  const Icon = projectInfo.icon

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <Link href="/compendium" className="inline-flex items-center gap-2 text-white/50 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Compendium
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0', projectInfo.bg)}>
              <Icon className={cn('h-8 w-8', projectInfo.color)} />
            </div>
            <div>
              <h1 className={cn('text-3xl font-bold', projectInfo.color)}>
                {projectInfo.name}
              </h1>
              <p className="text-lg text-white/60 mt-1">{projectInfo.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {projectInfo.github && (
              <a href={`https://github.com/${projectInfo.github}`} target="_blank" rel="noopener noreferrer" className="btn-glass p-3">
                <Github className="h-5 w-5" />
              </a>
            )}
            {projectInfo.website && (
              <a href={projectInfo.website} target="_blank" rel="noopener noreferrer" className="btn-glass p-3">
                <Globe className="h-5 w-5" />
              </a>
            )}
            <a
              href={projectInfo.actPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-4 py-3 flex items-center gap-2"
            >
              <ExternalLink className="h-5 w-5" />
              View on ACT
            </a>
          </div>
        </div>
      </header>

      {/* Key Metrics */}
      {projectInfo.keyMetrics && (
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-3 gap-4">
            {projectInfo.keyMetrics.map((metric, idx) => (
              <div key={idx} className="text-center">
                <p className={cn('text-3xl font-bold', projectInfo.color)}>{metric.value}</p>
                <p className="text-sm text-white/50">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - LCAA Journey */}
        <div className="lg:col-span-2 space-y-6">
          {/* LCAA Journey */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              LCAA Journey
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projectInfo.lcaa.listen && (
                <div className="glass-card-sm p-4 border-l-2 border-indigo-500">
                  <h3 className="text-sm font-medium text-indigo-400 mb-2">Listen</h3>
                  <p className="text-sm text-white/60">{projectInfo.lcaa.listen}</p>
                </div>
              )}
              {projectInfo.lcaa.curiosity && (
                <div className="glass-card-sm p-4 border-l-2 border-violet-500">
                  <h3 className="text-sm font-medium text-violet-400 mb-2">Curiosity</h3>
                  <p className="text-sm text-white/60">{projectInfo.lcaa.curiosity}</p>
                </div>
              )}
              {projectInfo.lcaa.action && (
                <div className="glass-card-sm p-4 border-l-2 border-emerald-500">
                  <h3 className="text-sm font-medium text-emerald-400 mb-2">Action</h3>
                  <p className="text-sm text-white/60">{projectInfo.lcaa.action}</p>
                </div>
              )}
              {projectInfo.lcaa.art && (
                <div className="glass-card-sm p-4 border-l-2 border-amber-500">
                  <h3 className="text-sm font-medium text-amber-400 mb-2">Art</h3>
                  <p className="text-sm text-white/60">{projectInfo.lcaa.art}</p>
                </div>
              )}
            </div>
          </div>

          {/* Content Sections */}
          {projectInfo.sections.map((section, idx) => {
            const SectionIcon = section.icon
            return (
              <div key={idx} className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                  <SectionIcon className="h-5 w-5 text-white/60" />
                  {section.title}
                </h2>
                <div className="text-white/70 whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column - Quick Info */}
        <div className="space-y-6">
          {/* Project Health */}
          {enrichedProject && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Project Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Health Score</span>
                  <span className={cn(
                    'text-lg font-semibold',
                    enrichedProject.healthScore >= 70 ? 'text-green-400' :
                    enrichedProject.healthScore >= 40 ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {enrichedProject.healthScore}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/50">Active Contacts</span>
                  <span className="text-lg font-semibold text-white">{enrichedProject.contacts || 0}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <ExternalLink className="h-5 w-5 text-indigo-400" />
              Quick Links
            </h2>
            <div className="space-y-2">
              <Link
                href={`/projects/${projectSlug}`}
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <FileText className="h-4 w-4 text-white/60" />
                <span className="text-sm text-white">Project Dashboard</span>
              </Link>
              {projectInfo.website && (
                <a
                  href={projectInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Globe className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm text-white">Live Website</span>
                </a>
              )}
              {projectInfo.github && (
                <a
                  href={`https://github.com/${projectInfo.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <Github className="h-4 w-4 text-white/60" />
                  <span className="text-sm text-white">GitHub Repository</span>
                </a>
              )}
              <a
                href={projectInfo.actPlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-white">View on ACT</span>
              </a>
            </div>
          </div>

          {/* Edit Prompt */}
          <div className="glass-card p-6 border-dashed border-white/20">
            <div className="text-center">
              <Edit3 className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">
                This compendium page can be expanded with more documentation, stories, and resources.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
