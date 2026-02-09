import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ─── Static Mappings ─────────────────────────────────────────────

const CORE_SITES = [
  {
    name: 'Empathy Ledger',
    slug: 'empathy-ledger',
    url: 'https://empathyledger.com',
    github: 'Acurioustractor/empathy-ledger-v2',
    projectCode: 'EL',
    localPath: '/Users/benknight/Code/empathy-ledger-v2',
  },
  {
    name: 'JusticeHub',
    slug: 'justicehub',
    url: 'https://justicehub.com.au',
    github: 'Acurioustractor/justicehub-platform',
    projectCode: 'JH',
    localPath: '/Users/benknight/Code/JusticeHub',
  },
  {
    name: 'Goods on Country',
    slug: 'goods-on-country',
    url: 'https://goodsoncountry.au',
    github: 'Acurioustractor/goods-asset-tracker',
    projectCode: 'GOODS',
    localPath: '/Users/benknight/Code/Goods Asset Register',
  },
  {
    name: 'The Harvest',
    slug: 'the-harvest',
    url: 'https://theharvestwitta.com.au',
    github: 'Acurioustractor/theharvest',
    projectCode: 'TH',
    localPath: '/Users/benknight/Code/The Harvest Website',
  },
  {
    name: 'ACT Regenerative Studio',
    slug: 'act-studio',
    url: 'https://act-regenerative-studio-benjamin-knights-projects.vercel.app',
    liveUrl: 'https://act.place', // Current Webflow site — migrating to Vercel
    github: 'Acurioustractor/act-regenerative-studio',
    projectCode: 'TS',
    localPath: '/Users/benknight/Code/act-regenerative-studio',
  },
  {
    name: 'The Farm',
    slug: 'act-farm',
    url: 'https://act-farm.vercel.app',
    github: 'Acurioustractor/act-farm',
    projectCode: 'TF',
    localPath: null,
  },
  {
    name: 'ACT Command Center',
    slug: 'command-center',
    url: null, // Internal
    github: 'Acurioustractor/act-global-infrastructure',
    projectCode: 'OPS',
    localPath: '/Users/benknight/Code/act-global-infrastructure',
  },
]

const LOCAL_CODEBASES: Record<string, string> = {
  'empathy-ledger-v2': '/Users/benknight/Code/empathy-ledger-v2',
  'justicehub-platform': '/Users/benknight/Code/JusticeHub',
  'goods-asset-tracker': '/Users/benknight/Code/Goods Asset Register',
  'theharvest': '/Users/benknight/Code/The Harvest Website',
  'act-global-infrastructure': '/Users/benknight/Code/act-global-infrastructure',
  'act-regenerative-studio': '/Users/benknight/Code/act-regenerative-studio',
}

// Maps repo names → screenshot slugs (for repos with Vercel deployments)
const REPO_SCREENSHOT_MAP: Record<string, string> = {
  'barkly-research-platform': 'barkly-research',
  'Oonchiumpa': 'oonchiumpa',
  'act-farm': 'act-farm',
  'palm-island-repository': 'palm-island',
  'diagrama-australia': 'diagrama',
  'picc-station-site-plan': 'picc-station',
  'custodian-economy-platform': 'custodian-economy',
  'mount-isa-service-map': 'mount-isa-services',
  'bail-program-wiki': 'bail-program',
  'qld-youth-justice-tracker': 'youth-justice',
  'Great-Palm-Island-PICC': 'great-palm-island-picc',
  'mounty-yarns': 'mounty-yarns',
}

// Fallback static map — used when DB hasn't been seeded yet
const STATIC_REPO_PROJECT_MAP: Record<string, string> = {
  // Core ecosystem
  'empathy-ledger-v2': 'EL',
  'justicehub-platform': 'JH',
  'goods-asset-tracker': 'GOODS',
  'theharvest': 'TH',
  'act-regenerative-studio': 'TS',
  'act-global-infrastructure': 'OPS',
  'act-farm': 'TF',
  'the-farm-website': 'TF',
  // Studio projects — sites built through ACT Studio
  'barkly-research-platform': 'TS',
  'Oonchiumpa': 'TS',
  'palm-island-repository': 'TS',
  'Great-Palm-Island-PICC': 'TS',
  'picc-station-site-plan': 'TS',
  'custodian-economy-platform': 'TS',
  'mount-isa-service-map': 'TS',
  'bail-program-wiki': 'TS',
  'qld-youth-justice-tracker': 'TS',
  'diagrama-australia': 'TS',
  'mounty-yarns': 'TS',
}

// ─── Types ───────────────────────────────────────────────────────

interface GitHubRepo {
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  pushed_at: string
  updated_at: string
  archived: boolean
  private: boolean
  fork: boolean
  stargazers_count: number
  topics: string[]
}

// ─── Handler ─────────────────────────────────────────────────────

export async function GET() {
  try {
    // Fetch GitHub repos, ecosystem sites, and DB links in parallel
    const [reposResult, ecosystemResult, linksResult, repoContactsResult] = await Promise.allSettled([
      fetchGitHubRepos(),
      fetchEcosystemSites(),
      fetchRepoProjectLinks(),
      fetchRepoContacts(),
    ])

    const repos = reposResult.status === 'fulfilled' ? reposResult.value : []
    const ecosystemSites = ecosystemResult.status === 'fulfilled' ? ecosystemResult.value : []
    const dbLinks = linksResult.status === 'fulfilled' ? linksResult.value : []
    const dbContacts = repoContactsResult.status === 'fulfilled' ? repoContactsResult.value : []

    // Build repo→project map: DB links override static defaults
    const REPO_PROJECT_MAP: Record<string, string> = { ...STATIC_REPO_PROJECT_MAP }
    // Group DB links by repo — first link per repo becomes the primary project code
    const repoLinksMap: Record<string, Array<{ project_code: string; project_name: string | null; notes: string | null }>> = {}
    for (const link of dbLinks) {
      REPO_PROJECT_MAP[link.repo_name] = link.project_code
      if (!repoLinksMap[link.repo_name]) repoLinksMap[link.repo_name] = []
      repoLinksMap[link.repo_name].push({ project_code: link.project_code, project_name: link.project_name, notes: link.notes })
    }

    // Group DB contacts by repo
    const repoContactsMap: Record<string, Array<{ contact_id: string; contact_name: string | null; role: string | null }>> = {}
    for (const rc of dbContacts) {
      if (!repoContactsMap[rc.repo_name]) repoContactsMap[rc.repo_name] = []
      repoContactsMap[rc.repo_name].push({ contact_id: rc.contact_id, contact_name: rc.contact_name, role: rc.role })
    }

    // Build core ecosystem tier — match ecosystem_sites by name (DB has different org/URLs)
    const coreNames = new Set(CORE_SITES.map((s) => s.name.toLowerCase()))
    const coreRepoNames = new Set(CORE_SITES.map((s) => s.github.split('/')[1]))

    const coreSites = CORE_SITES.map((site) => {
      const repo = repos.find((r) => r.full_name === site.github)
      const repoName = site.github.split('/')[1]
      const ecoSite = ecosystemSites.find(
        (s) =>
          s.name?.toLowerCase() === site.name.toLowerCase() ||
          s.github_repo?.endsWith(`/${repoName}`) ||
          s.url === site.url
      )
      return {
        name: site.name,
        slug: site.slug,
        url: site.url,
        liveUrl: ('liveUrl' in site ? site.liveUrl : null) as string | null,
        screenshot: `/screenshots/${site.slug}.png`,
        githubUrl: repo ? repo.html_url : `https://github.com/${site.github}`,
        githubRepo: site.github,
        projectCode: site.projectCode,
        localPath: site.localPath,
        language: repo?.language || null,
        lastPushed: repo?.pushed_at || null,
        description: repo?.description || null,
        healthStatus: ecoSite?.health_status || ecoSite?.status || null,
        healthScore: ecoSite?.health_score || null,
      }
    })

    // Build satellite tier — ecosystem sites NOT in Tier 1 and with public URLs
    const satelliteSites = ecosystemSites
      .filter((s) => {
        // Exclude sites that match core by name or repo name
        const nameMatch = coreNames.has((s.name || '').toLowerCase())
        const repoMatch = s.github_repo && coreRepoNames.has(s.github_repo.split('/').pop() || '')
        // Exclude localhost and empty URLs
        const hasPublicUrl = s.url && !s.url.includes('localhost')
        return !nameMatch && !repoMatch && hasPublicUrl
      })
      .map((s) => {
        const repoName = s.github_repo?.split('/').pop() || ''
        const screenshotSlug = REPO_SCREENSHOT_MAP[repoName]
        return {
          name: s.name,
          url: s.url,
          slug: s.slug,
          screenshot: screenshotSlug ? `/screenshots/${screenshotSlug}.png` : null,
          category: s.category,
          healthStatus: s.health_status || s.status,
          healthScore: s.health_score,
          githubRepo: s.github_repo,
          vercelProject: s.vercel_project_name,
        }
      })

    // Build repos tier — all non-archived, non-fork repos
    const allRepos = repos
      .filter((r) => !r.archived && !r.fork)
      .map((r) => {
        const screenshotSlug = REPO_SCREENSHOT_MAP[r.name]
        return {
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          url: r.html_url,
          homepage: r.homepage,
          screenshot: screenshotSlug ? `/screenshots/${screenshotSlug}.png` : null,
          language: r.language,
          lastPushed: r.pushed_at,
          isPrivate: r.private,
          stars: r.stargazers_count,
          topics: r.topics || [],
          projectCode: REPO_PROJECT_MAP[r.name] || null,
          projectLinks: (repoLinksMap[r.name] || []).map((l) => ({ project_code: l.project_code, project_name: l.project_name, notes: l.notes })),
          taggedContacts: repoContactsMap[r.name] || [],
          localPath: LOCAL_CODEBASES[r.name] || null,
          hasWebsite: !!r.homepage,
          hasLocalCodebase: !!LOCAL_CODEBASES[r.name],
        }
      })
      .sort(
        (a, b) =>
          new Date(b.lastPushed).getTime() - new Date(a.lastPushed).getTime()
      )

    // Build local codebases list
    const localCodebases = Object.entries(LOCAL_CODEBASES).map(
      ([repoName, path]) => {
        const repo = repos.find((r) => r.name === repoName)
        return {
          repoName,
          path,
          githubUrl: repo?.html_url || `https://github.com/Acurioustractor/${repoName}`,
          projectCode: REPO_PROJECT_MAP[repoName] || null,
        }
      }
    )

    // Stats
    const stats = {
      totalRepos: allRepos.length,
      totalDeployments: ecosystemSites.length,
      totalLocalCodebases: localCodebases.length,
      linkedRepos: allRepos.filter((r) => r.projectCode).length,
      linkedPercent:
        allRepos.length > 0
          ? Math.round(
              (allRepos.filter((r) => r.projectCode).length / allRepos.length) *
                100
            )
          : 0,
      languages: [...new Set(allRepos.map((r) => r.language).filter(Boolean))],
    }

    return NextResponse.json({
      coreSites,
      satelliteSites,
      repos: allRepos,
      localCodebases,
      stats,
    })
  } catch (error) {
    console.error('Development overview error:', error)
    return NextResponse.json(
      {
        coreSites: [],
        satelliteSites: [],
        repos: [],
        localCodebases: [],
        stats: {
          totalRepos: 0,
          totalDeployments: 0,
          totalLocalCodebases: 0,
          linkedRepos: 0,
          linkedPercent: 0,
          languages: [],
        },
        error: 'Failed to fetch development overview',
      },
      { status: 500 }
    )
  }
}

// ─── Data Fetchers ───────────────────────────────────────────────

async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  const allRepos: GitHubRepo[] = []
  let page = 1
  const perPage = 100

  // Paginate through all repos
  while (true) {
    const res = await fetch(
      `https://api.github.com/users/Acurioustractor/repos?per_page=${perPage}&page=${page}&sort=pushed`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ACT-Command-Center',
          ...(process.env.GITHUB_TOKEN
            ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    )

    if (!res.ok) {
      console.error(`GitHub API error: ${res.status} ${res.statusText}`)
      break
    }

    const repos: GitHubRepo[] = await res.json()
    allRepos.push(...repos)

    if (repos.length < perPage) break
    page++
  }

  return allRepos
}

async function fetchEcosystemSites() {
  const { data, error } = await supabase
    .from('ecosystem_sites')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Ecosystem sites error:', error)
    return []
  }

  return data || []
}

async function fetchRepoProjectLinks() {
  const { data, error } = await supabase
    .from('repo_project_links')
    .select('repo_name, project_code, project_name, notes')

  if (error) {
    console.error('Repo project links error:', error)
    return []
  }

  return data || []
}

async function fetchRepoContacts() {
  const { data, error } = await supabase
    .from('repo_contacts')
    .select('repo_name, contact_id, contact_name, role')

  if (error) {
    console.error('Repo contacts error:', error)
    return []
  }

  return data || []
}
