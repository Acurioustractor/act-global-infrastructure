import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A guard failure: which project, which field, why. `severity: 'error'` means the
 * file is malformed and nothing should load it. `severity: 'gap'` means the record
 * is well formed but a field a live project needs is empty. `check.mjs` exits 1 on
 * errors always and on gaps only with --strict.
 */
export function runGuards(projects, { repoRoot, wikiIndex }) {
  const failures = [];
  const fail = (severity, project, field, why) =>
    failures.push({ severity, code: project.code, tier: project.tier, status: project.status, field, why });

  const slugs = new Map();
  for (const p of Object.values(projects)) {
    if (slugs.has(p.canonical_slug)) {
      fail('error', p, 'canonical_slug', `duplicate of ${slugs.get(p.canonical_slug)}`);
    }
    slugs.set(p.canonical_slug, p.code);
  }

  for (const p of Object.values(projects)) {
    const live = p.status === 'active' || p.status === 'ideation' || p.status === 'sunsetting';

    if (p.wiki_path) {
      if (!existsSync(join(repoRoot, p.wiki_path))) fail('error', p, 'wiki_path', `${p.wiki_path} does not exist`);
    } else if (live) {
      const hits = wikiIndex.get(p.canonical_slug) || [];
      if (hits.length === 0) fail('gap', p, 'wiki_path', 'no wiki page found for canonical_slug');
      else if (hits.length > 1) fail('gap', p, 'wiki_path', `ambiguous: ${hits.join(', ')}`);
    }

    if (p.tier === 'ecosystem' && live) {
      if (p.sites.length === 0 && !p.internal) fail('gap', p, 'sites', 'ecosystem project has no site');
      if (!p.notion.page_id && !p.notion_page_id) fail('gap', p, 'notion.page_id', 'ecosystem project has no Notion page');
    }

    if (p.production_url && !p.sites.some((s) => s.production_url === p.production_url)) {
      fail('error', p, 'sites', `production_url ${p.production_url} is not one of sites[]`);
    }

    const hasArt = Boolean(p.art_medium || p.art);
    if (hasArt) {
      if (!p.art) fail('gap', p, 'art', 'art_medium set but no art block');
      else {
        if (p.art.connected_code && !projects[p.art.connected_code]) fail('error', p, 'art.connected_code', `${p.art.connected_code} is not a project code`);
        if (p.empathy_ledger?.tracked !== false && !p.empathy_ledger?.project_id && !(p.empathy_ledger?.partner_codes || []).length) {
          fail('gap', p, 'empathy_ledger.project_id', 'art piece has no Empathy Ledger project');
        }
        const wikiHit = p.art.wiki_path || (wikiIndex.get(p.art.piece_slug) || [])[0];
        if (!wikiHit) fail('gap', p, 'art.wiki_path', `no wiki page for piece ${p.art.piece_slug}`);
        else if (!existsSync(join(repoRoot, wikiHit))) fail('error', p, 'art.wiki_path', `${wikiHit} does not exist`);
      }
    }

    for (const s of p.sites) {
      if (!s.production_url && !s.vercel_project_id && !s.vercel_project_name && !s.github_repo) {
        fail('error', p, 'sites', 'a site needs at least one of production_url, vercel_project_id, vercel_project_name, github_repo');
      }
    }
  }

  return failures;
}
