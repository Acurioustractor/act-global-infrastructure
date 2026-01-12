import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'

function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const articleTypeLabels: Record<string, { label: string; color: string }> = {
  story_feature: { label: 'Story Feature', color: 'bg-purple-100 text-purple-700' },
  program_spotlight: { label: 'Program Spotlight', color: 'bg-blue-100 text-blue-700' },
  research_summary: { label: 'Research', color: 'bg-green-100 text-green-700' },
  community_news: { label: 'Community News', color: 'bg-orange-100 text-orange-700' },
  editorial: { label: 'Editorial', color: 'bg-stone-100 text-stone-700' },
  impact_report: { label: 'Impact Report', color: 'bg-teal-100 text-teal-700' },
  project_update: { label: 'Project Update', color: 'bg-indigo-100 text-indigo-700' },
  tutorial: { label: 'Tutorial', color: 'bg-yellow-100 text-yellow-700' }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  return Math.ceil(words / wordsPerMinute)
}

function extractFirstImage(content: string | null | undefined) {
  if (!content) return null
  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (htmlMatch?.[1]) return htmlMatch[1]
  const dataSrcMatch = content.match(/data-src=["']([^"']+)["']/i)
  if (dataSrcMatch?.[1]) return dataSrcMatch[1]
  const mdMatch = content.match(/!\[[^\]]*\]\(([^)]+)\)/)
  if (mdMatch?.[1]) return mdMatch[1]
  return null
}

function resolveAssetUrl(url: string | null | undefined, sourceUrl?: string | null) {
  if (!url) return null
  const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3030'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/images/')) return `${appBase}${url}`
  if (url.startsWith('/') && sourceUrl) {
    try {
      const origin = new URL(sourceUrl).origin
      return `${origin}${url}`
    } catch {
      return url
    }
  }
  return url
}

export default async function StoriesPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const project = typeof searchParams?.project === 'string' ? searchParams.project : ''
  const tag = typeof searchParams?.tag === 'string' ? searchParams.tag : ''
  const theme = typeof searchParams?.theme === 'string' ? searchParams.theme : ''
  const destination = typeof searchParams?.destination === 'string' ? searchParams.destination : ''
  const publishedAfter = typeof searchParams?.after === 'string' ? searchParams.after : ''
  const publishedBefore = typeof searchParams?.before === 'string' ? searchParams.before : ''

  const supabase = createSupabaseClient()

  let query = supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      subtitle,
      excerpt,
      author_name,
      article_type,
      primary_project,
      published_at,
      tags,
      content,
      themes,
      syndication_destinations,
      import_metadata,
      source_url,
      featured_image_id,
      visibility
    `)
    .eq('status', 'published')
    .eq('visibility', 'public')

  if (project) query = query.eq('primary_project', project)
  if (tag) query = query.contains('tags', [tag])
  if (theme) query = query.contains('themes', [theme])
  if (destination) query = query.contains('syndication_destinations', [destination])
  if (publishedAfter) query = query.gte('published_at', publishedAfter)
  if (publishedBefore) query = query.lte('published_at', publishedBefore)

  const { data } = await query.order('published_at', { ascending: false })

  const featuredImageIds = Array.from(
    new Set((data || []).map((item) => item.featured_image_id).filter(Boolean))
  )
  const featuredImagesById: Record<string, { url: string; alt_text: string | null }> = {}

  if (featuredImageIds.length > 0) {
    const { data: images } = await supabase
      .from('media_assets')
      .select('id, url, alt_text')
      .in('id', featuredImageIds as string[])

    for (const image of images || []) {
      featuredImagesById[image.id] = { url: image.url, alt_text: image.alt_text }
    }
  }

  const stories = (data || []).map((story) => {
    const sourceUrl = story.source_url || story.import_metadata?.sourceUrl || null
    const featuredFromMedia = story.featured_image_id
      ? featuredImagesById[story.featured_image_id] || null
      : null
    const featuredFromImport =
      story.import_metadata?.featuredImageUrl
        ? { url: story.import_metadata.featuredImageUrl, alt_text: null }
        : null
    const featuredFromContent = extractFirstImage(story.content)
      ? { url: extractFirstImage(story.content), alt_text: null }
      : null

    return {
      ...story,
      featuredImage: featuredFromMedia
        ? { ...featuredFromMedia, url: resolveAssetUrl(featuredFromMedia.url, sourceUrl) }
        : featuredFromImport
          ? { ...featuredFromImport, url: resolveAssetUrl(featuredFromImport.url, sourceUrl) }
          : featuredFromContent
            ? { ...featuredFromContent, url: resolveAssetUrl(featuredFromContent.url, sourceUrl) }
            : null
    }
  })

  const projectOptions = Array.from(
    new Set((data || []).map((item) => item.primary_project).filter(Boolean))
  )
  const tagOptions = Array.from(
    new Set((data || []).flatMap((item) => item.tags || []))
  )
  const themeOptions = Array.from(
    new Set((data || []).flatMap((item) => item.themes || []))
  )
  const destinationOptions = Array.from(
    new Set((data || []).flatMap((item) => item.syndication_destinations || []))
  )

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <nav className="text-xs uppercase tracking-[0.4em] text-stone-500">
            <Link href="/" className="hover:text-stone-700">Home</Link>
            <span className="mx-2">/</span>
            <span>Stories</span>
          </nav>
          <p className="mt-4 text-xs uppercase tracking-[0.4em] text-stone-500">
            Empathy Ledger Stories
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-stone-900">
            Stories and field notes
          </h1>
          <p className="mt-3 text-base text-stone-600 max-w-2xl">
            One place for every story across the ACT ecosystem.
          </p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <form className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Project
            </label>
            <select
              name="project"
              defaultValue={project}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All projects</option>
              {projectOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Tag
            </label>
            <select
              name="tag"
              defaultValue={tag}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All tags</option>
              {tagOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Theme
            </label>
            <select
              name="theme"
              defaultValue={theme}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All themes</option>
              {themeOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Destination
            </label>
            <select
              name="destination"
              defaultValue={destination}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">All destinations</option>
              {destinationOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              After
            </label>
            <input
              type="date"
              name="after"
              defaultValue={publishedAfter}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-stone-500">
              Before
            </label>
            <input
              type="date"
              name="before"
              defaultValue={publishedBefore}
              className="mt-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white"
            >
              Apply Filters
            </button>
            <Link
              href="/stories"
              className="rounded-full border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-stone-600"
            >
              Reset
            </Link>
          </div>
        </form>
        {stories.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-stone-600">
            No public stories yet.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => {
              const typeConfig = articleTypeLabels[story.article_type] || {
                label: story.article_type || 'Story',
                color: 'bg-stone-100 text-stone-700'
              }
              const readingTime = calculateReadingTime(story.content || '')
              return (
                <Link
                  key={story.id}
                  href={`/articles/${story.slug}`}
                  className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="aspect-[4/3] bg-stone-100">
                    {story.featuredImage?.url ? (
                      <img
                        src={story.featuredImage.url}
                        alt={story.featuredImage.alt_text || story.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-stone-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                      <Badge className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                      {story.primary_project ? (
                        <Badge variant="outline">
                          {story.primary_project.replace('-', ' ')}
                        </Badge>
                      ) : null}
                      {story.syndication_destinations?.length ? (
                        <Badge variant="secondary">
                          {story.syndication_destinations.slice(0, 1).join(', ')}
                        </Badge>
                      ) : null}
                    </div>

                    <h2 className="text-xl font-semibold text-stone-900 group-hover:text-stone-700 transition-colors">
                      {story.title}
                    </h2>

                    <p className="text-sm text-stone-600 line-clamp-3">
                      {story.excerpt || story.subtitle || 'Story from the Empathy Ledger.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500">
                      {story.published_at ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(story.published_at)}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {readingTime} min read
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
      <Footer />
    </div>
  )
}
