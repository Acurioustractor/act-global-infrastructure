/**
 * Vercel deployment feed for the ecosystem hub — the latest PRODUCTION deploy
 * state of each ACT site, so "is the site up / did the last ship succeed" reads
 * right next to the belonging funnel. (Surfaces e.g. act.place's failed deploy.)
 *
 * Reads a team-scoped Vercel token at request time. The repo's existing
 * VERCEL_TOKEN / VERCEL_ACCESS_TOKEN are PROJECT-scoped (403 on team reads), so
 * set a read-only team-scoped token as VERCEL_ANALYTICS_TOKEN to light this up.
 * Until then the feed degrades gracefully (configured:false) — the hub shows a
 * "connect a team-scoped token" note rather than erroring.
 *
 * Project IDs + team verified via the Vercel API 2026-06-02.
 */

const TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_3aAWFPdRQ92RkkJ2LehJ209u'

interface ActProject {
  id: string
  project: string
  label: string
  url: string
}

// The seven ACT ecosystem front-doors (verified live URLs → Vercel project IDs).
const ACT_PROJECTS: ActProject[] = [
  { id: 'prj_Hz7eQOE4Zh1Dw9O6OZDn6ExRuWuk', project: 'act-regenerative-studio', label: 'act.place', url: 'https://act.place' },
  { id: 'prj_BFQcUhajUO5R1cocWJQhjgIzZn5S', project: 'grantscope', label: 'CivicGraph', url: 'https://civicgraph.app' },
  { id: 'prj_XGQL3gT1C6N7BolooQevgMJuIf1G', project: 'goods-on-country', label: 'Goods', url: 'https://www.goodsoncountry.com' },
  { id: 'prj_h9btWxQZN2jX4DLhLPLxV1G4On4X', project: 'justicehub', label: 'JusticeHub', url: 'https://www.justicehub.com.au' },
  { id: 'prj_keWe0zABA9pjApRWXssQjxG1qOfF', project: 'the-harvest', label: 'The Harvest', url: 'https://www.theharvestwitta.com.au' },
  { id: 'prj_6Kie4tffJpHj05jt1kKvx5mk63Zw', project: 'empathy-ledger-v2', label: 'Empathy Ledger', url: 'https://www.empathyledger.com' },
  { id: 'prj_HxI2s12KP1IlZ0b5vkbux9FeRcki', project: 'act-global-infrastructure', label: 'Command Center / Wiki', url: 'https://wiki.act.place' },
]

export interface SiteDeploy {
  project: string
  label: string
  url: string
  /** READY | ERROR | BUILDING | QUEUED | CANCELED | forbidden | unknown | none */
  state: string
  createdAt: string | null
  commitMessage: string | null
  commitRef: string | null
  inspectorUrl: string | null
}

export interface VercelDeployFeed {
  configured: boolean
  teamId: string
  sites: SiteDeploy[]
  note?: string
}

interface RawDeployment {
  state?: string
  readyState?: string
  created?: number
  createdAt?: number
  inspectorUrl?: string
  meta?: { githubCommitMessage?: string; githubCommitRef?: string }
}

async function latestProductionDeploy(p: ActProject, token: string): Promise<SiteDeploy> {
  const base: SiteDeploy = {
    project: p.project,
    label: p.label,
    url: p.url,
    state: 'unknown',
    createdAt: null,
    commitMessage: null,
    commitRef: null,
    inspectorUrl: null,
  }
  try {
    const u = `https://api.vercel.com/v6/deployments?projectId=${p.id}&target=production&limit=1&teamId=${TEAM_ID}`
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
    if (!r.ok) return { ...base, state: r.status === 403 ? 'forbidden' : `http_${r.status}` }
    const j = (await r.json()) as { deployments?: RawDeployment[] }
    const d = j.deployments?.[0]
    if (!d) return { ...base, state: 'none' }
    const ts = d.created ?? d.createdAt ?? null
    return {
      ...base,
      state: d.state ?? d.readyState ?? 'unknown',
      createdAt: ts ? new Date(ts).toISOString() : null,
      commitMessage: d.meta?.githubCommitMessage ?? null,
      commitRef: d.meta?.githubCommitRef ?? null,
      inspectorUrl: d.inspectorUrl ?? null,
    }
  } catch {
    return { ...base, state: 'unknown' }
  }
}

export async function getVercelDeployFeed(): Promise<VercelDeployFeed> {
  const token =
    process.env.VERCEL_ANALYTICS_TOKEN ||
    process.env.VERCEL_TOKEN ||
    process.env.VERCEL_ACCESS_TOKEN
  if (!token) {
    return {
      configured: false,
      teamId: TEAM_ID,
      sites: [],
      note: 'Set a read-only, team-scoped VERCEL_ANALYTICS_TOKEN to show live deploy status.',
    }
  }

  const sites = await Promise.all(ACT_PROJECTS.map((p) => latestProductionDeploy(p, token)))
  const allForbidden = sites.length > 0 && sites.every((s) => s.state === 'forbidden')

  return {
    configured: !allForbidden,
    teamId: TEAM_ID,
    sites,
    note: allForbidden
      ? 'The configured Vercel token is project-scoped (403 on team reads). Add a team-scoped VERCEL_ANALYTICS_TOKEN.'
      : undefined,
  }
}
