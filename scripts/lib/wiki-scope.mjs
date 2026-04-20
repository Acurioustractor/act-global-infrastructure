/**
 * Canonical Tractorpedia scope.
 *
 * The repo-root wiki now contains several content classes:
 * - canonical graph: encyclopedia-like articles that belong in the main wiki graph
 * - support layers: sources summaries and narrative claim-store material
 * - operational/output layers: raw ingests, generated reports, library drafts, dashboards
 *
 * The lint and viewer scripts should operate on the canonical graph by default so
 * health signals stay actionable and the public-facing viewer stays coherent.
 */

export const CANONICAL_GRAPH_DIRS = new Set([
  'concepts',
  'projects',
  'communities',
  'people',
  'stories',
  'art',
  'finance',
  'technical',
  'decisions',
  'research',
  'synthesis',
])

export const SUPPORT_DIRS = new Set([
  'sources',
  'narrative',
])

export const NON_GRAPH_DIRS = new Set([
  'raw',
  '.obsidian',
  'output',
  'library',
  'dashboards',
])

export const WALK_SKIP_DIRS = new Set([
  ...SUPPORT_DIRS,
  ...NON_GRAPH_DIRS,
])

export function normalizeWikiRelativePath(relPath) {
  return relPath.replaceAll('\\', '/')
}

export function getWikiTopLevelDir(relPath) {
  const normalized = normalizeWikiRelativePath(relPath)
  return normalized.includes('/') ? normalized.split('/')[0] : '.'
}

export function isCanonicalGraphFile(relPath) {
  const normalized = normalizeWikiRelativePath(relPath)
  if (normalized === 'index.md') return true
  return CANONICAL_GRAPH_DIRS.has(getWikiTopLevelDir(normalized))
}

export function countCanonicalArticlesByDomain(relativePaths) {
  const counts = {}

  for (const relPath of relativePaths) {
    const normalized = normalizeWikiRelativePath(relPath)
    if (!isCanonicalGraphFile(normalized) || normalized === 'index.md') continue
    const domain = getWikiTopLevelDir(normalized)
    counts[domain] = (counts[domain] || 0) + 1
  }

  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  )
}
