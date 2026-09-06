/**
 * Pure helpers shared by scripts/vercel-sync.mjs (daily reconcile) and the
 * command-center Vercel webhook. No I/O here so both paths are testable.
 *
 * A "site" is one entry of a project's sites[] in the typed record
 * (@act/projects). A row in ecosystem_sites is one site, keyed by slug.
 */

const STATE_MAP = {
  READY: 'live',
  BUILDING: 'building',
  INITIALIZING: 'building',
  QUEUED: 'building',
  ERROR: 'broken',
  CANCELED: 'canceled',
};

export function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Map a Vercel deployment object to the ecosystem_sites status vocabulary. */
export function deploymentState(deployment) {
  if (!deployment) return { status: 'unknown', last_deployment_at: null };
  const state = deployment.readyState || deployment.state;
  const at = deployment.ready || deployment.createdAt || deployment.created;
  return {
    status: STATE_MAP[state] || 'unknown',
    last_deployment_at: at ? new Date(Number(at) || at).toISOString() : null,
  };
}

/**
 * Find the Vercel project for a registry site.
 * Order: pinned vercel_project_id, pinned vercel_project_name, github repo,
 * production host equal to `<name>.vercel.app`, and nothing else. Name guessing
 * is how the old sync mis-filed sites; an unmatched site is reported, not guessed.
 */
export function matchVercelProject(site, vercelProjects) {
  if (site.vercel_project_id) {
    const p = vercelProjects.find((v) => v.id === site.vercel_project_id);
    if (p) return { project: p, via: 'id' };
  }
  if (site.vercel_project_name) {
    const p = vercelProjects.find((v) => v.name === site.vercel_project_name);
    if (p) return { project: p, via: 'name' };
  }
  if (site.github_repo) {
    const want = site.github_repo.toLowerCase();
    const hits = vercelProjects.filter((v) => v.link?.type === 'github' && `${v.link.org}/${v.link.repo}`.toLowerCase() === want);
    if (hits.length === 1) return { project: hits[0], via: 'repo' };
    if (hits.length > 1) return { project: null, via: 'repo-ambiguous', candidates: hits.map((h) => h.name) };
  }
  const host = hostOf(site.production_url || '');
  if (host && host.endsWith('.vercel.app')) {
    // <name>.vercel.app, or <name>-<suffix>.vercel.app where Vercel appended a
    // scope or alias. Drop trailing dash segments until a project name matches.
    const parts = host.slice(0, -'.vercel.app'.length).split('-');
    for (let n = parts.length; n >= 1; n--) {
      const name = parts.slice(0, n).join('-');
      const p = vercelProjects.find((v) => v.name === name);
      if (p) return { project: p, via: 'vercel-host' };
    }
  }
  return { project: null, via: 'unmatched' };
}

export function siteSlug(project, site) {
  return site.role && site.role !== 'primary' ? `${project.canonical_slug}-${site.role}` : project.canonical_slug;
}

/** The row we write. Never touches columns the health checker owns (health_score, response_time_ms, ssl_expires_at). */
export function buildSiteRow({ project, site, vercelProject, deployment, now = new Date() }) {
  const { status, last_deployment_at } = deploymentState(deployment);
  return {
    slug: siteSlug(project, site),
    name: site.role && site.role !== 'primary' ? `${project.name} (${site.role})` : project.name,
    url: site.production_url || (vercelProject ? `https://${vercelProject.name}.vercel.app` : null),
    description: project.description || null,
    category: project.category || null,
    project_code: project.code,
    vercel_project_id: vercelProject?.id || null,
    vercel_project_name: vercelProject?.name || null,
    github_repo: site.github_repo || (vercelProject?.link?.type === 'github' ? `${vercelProject.link.org}/${vercelProject.link.repo}` : null),
    status: vercelProject ? status : 'external',
    last_deployment_at,
    last_check_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
}

/** Webhook payload -> partial row update, or null when the event is not a production deployment. */
export function rowFromWebhook(event) {
  const type = event?.type || '';
  if (!type.startsWith('deployment.')) return null;
  const payload = event.payload || {};
  const target = payload.target || payload.deployment?.target;
  if (target && target !== 'production') return null;
  const projectId = payload.project?.id || payload.projectId;
  if (!projectId) return null;
  const status =
    type === 'deployment.succeeded' || type === 'deployment.ready' ? 'live'
    : type === 'deployment.error' ? 'broken'
    : type === 'deployment.canceled' ? 'canceled'
    : type === 'deployment.created' ? 'building'
    : null;
  if (!status) return null;
  const at = event.createdAt ? new Date(Number(event.createdAt) || event.createdAt).toISOString() : new Date().toISOString();
  return { vercel_project_id: projectId, status, last_deployment_at: at, last_check_at: at, updated_at: at };
}
