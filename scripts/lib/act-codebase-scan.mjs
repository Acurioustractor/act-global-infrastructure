/**
 * act-codebase-scan.mjs
 *
 * Multi-repo grep for ACT project codes (ACT-[A-Z]+) across the canonical
 * 9 active ACT codebases. Returns per-code counts with per-repo breakdown.
 *
 * Used by:
 *   scripts/synthesize-project-truth-state.mjs (Q2 of the Alignment Loop)
 *
 * Source-of-truth for the repo list: wiki/decisions/act-core-facts.md.
 * If you add or remove an active ACT codebase, update both this file
 * AND act-core-facts.md (the brand alignment map references the same list).
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { basename } from 'node:path'

// Canonical 9 active ACT codebases (one of which is the hub).
// Order matters only for stable output; not for correctness.
export const ACT_REPOS = [
  '/Users/benknight/Code/act-global-infrastructure',
  '/Users/benknight/Code/act-regenerative-studio',
  '/Users/benknight/Code/empathy-ledger-v2',
  '/Users/benknight/Code/JusticeHub',
  '/Users/benknight/Code/goods',
  '/Users/benknight/Code/grantscope',
  '/Users/benknight/Code/Palm Island Reposistory',
  '/Users/benknight/Code/act-farm',
  '/Users/benknight/Code/The Harvest Website',
]

export const HUB_REPO = ACT_REPOS[0]

// File-type allowlist. Bounds runtime + reduces false positives from binary
// or generated files. If a real file type is missed, add it here.
const FILE_TYPES = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'md', 'mdx', 'yaml', 'yml']

// Always exclude. node_modules is the big one; the rest catch generated output.
const EXCLUDES = ['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.cache', '.turbo', '.vercel']

const CODE_REGEX = 'ACT-[A-Z]\\{2,4\\}'

/**
 * Build the find + grep command for a single repo.
 * Filters by file extension; excludes generated dirs.
 */
function buildGrepCmd(repoPath) {
  const namePatterns = FILE_TYPES.map(ext => `-name "*.${ext}"`).join(' -o ')
  const excludeArgs = EXCLUDES.map(d => `-name "${d}" -prune -o`).join(' ')
  // -print at the end to limit pruning correctly
  return `find "${repoPath}" \\( ${excludeArgs} -type f \\( ${namePatterns} \\) -print \\) | xargs grep -ho "${CODE_REGEX}" 2>/dev/null | sort | uniq -c | sort -rn`
}

/**
 * Scan one repo. Returns { 'ACT-GD': N, 'ACT-JH': M, ... }.
 * Returns {} on any failure (missing dir, grep error, etc.) — never throws.
 */
export function scanRepo(repoPath) {
  if (!existsSync(repoPath)) {
    console.error(`[act-codebase-scan] missing: ${repoPath}`)
    return {}
  }
  try {
    const cmd = buildGrepCmd(repoPath)
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }).trim()
    const counts = {}
    if (!out) return counts
    for (const line of out.split('\n')) {
      const m = line.trim().match(/^(\d+)\s+(ACT-[A-Z]+)$/)
      if (m) counts[m[2]] = Number(m[1])
    }
    return counts
  } catch (err) {
    console.error(`[act-codebase-scan] error in ${repoPath}: ${err.message?.slice(0, 200)}`)
    return {}
  }
}

/**
 * Scan all 9 ACT codebases.
 * Returns:
 *   {
 *     'ACT-GD': { total: 540, byRepo: { hub: 152, goods: 380, ... } },
 *     ...
 *   }
 *
 * The byRepo keys are short repo names (basename), not full paths.
 */
export function scanAll(repos = ACT_REPOS) {
  const result = {}
  for (const repoPath of repos) {
    const repoKey = repoKeyFor(repoPath)
    const counts = scanRepo(repoPath)
    for (const [code, n] of Object.entries(counts)) {
      if (!result[code]) result[code] = { total: 0, byRepo: {} }
      result[code].total += n
      result[code].byRepo[repoKey] = n
    }
  }
  return result
}

/**
 * Short repo key — basename, lowercase, dashes preserved. Used in output
 * labels. "act-global-infrastructure" → "hub" (the hub is special).
 */
export function repoKeyFor(repoPath) {
  if (repoPath === HUB_REPO) return 'hub'
  return basename(repoPath)
    .replace(/\s+/g, '-')
    .toLowerCase()
}

/**
 * Top-N repos for a code, formatted as "hub:152 goods:380 EL:8".
 * Useful for the Q2 synthesis output column.
 */
export function topReposFor(byRepo, n = 3) {
  const entries = Object.entries(byRepo).sort((a, b) => b[1] - a[1])
  return entries.slice(0, n).map(([k, v]) => `${k}:${v}`).join(' ')
}
