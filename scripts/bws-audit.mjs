#!/usr/bin/env node
/**
 * bws-audit.mjs — read-only audit of Bitwarden Secrets Manager
 *
 * Reports for each secret:
 *   - name + project
 *   - last revision date + age in days
 *   - whether the key appears in any of the 9 ACT repos' .env.local files
 *   - whether multiple repos define the same key (drift risk)
 *
 * Does NOT print any secret values. Metadata only. Safe to share output.
 *
 * Pre-requisites:
 *   - bws installed
 *   - BWS_ACCESS_TOKEN exported (or in ~/.config/bws/config)
 *
 * Usage:
 *   node scripts/bws-audit.mjs                 # full audit table
 *   node scripts/bws-audit.mjs --stale 30      # only show secrets >30 days old
 *   node scripts/bws-audit.mjs --orphans       # only show secrets not in any .env.local
 *   node scripts/bws-audit.mjs --missing       # only show env keys NOT in BWS
 *   node scripts/bws-audit.mjs --json          # JSON output for piping
 */
import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const argv = process.argv.slice(2)
const STALE_FLAG = argv.indexOf('--stale')
const STALE_DAYS = STALE_FLAG >= 0 ? Number(argv[STALE_FLAG + 1]) : 0
const ORPHANS_ONLY = argv.includes('--orphans')
const MISSING_ONLY = argv.includes('--missing')
const JSON_OUT = argv.includes('--json')

const ACT_REPOS = [
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

const ENV_FILES = ['.env.local', '.env', '.env.local.bak']

function precheck() {
  try {
    execSync('which bws', { stdio: 'pipe' })
  } catch {
    console.error('bws (Bitwarden Secrets Manager CLI) not installed.')
    process.exit(2)
  }
  if (!process.env.BWS_ACCESS_TOKEN && !existsSync(`${process.env.HOME}/.config/bws/config`)) {
    console.error('BWS_ACCESS_TOKEN not set and ~/.config/bws/config not found.')
    console.error('Run: export BWS_ACCESS_TOKEN="<your-token>"')
    console.error('Or save the token to ~/.config/bws/config (see operational-reference.md §13)')
    process.exit(3)
  }
}

function listProjects() {
  try {
    return JSON.parse(execSync('bws project list', { encoding: 'utf8', env: process.env }))
  } catch (err) {
    console.error('bws project list failed:', err.stderr?.toString().slice(0, 200) || err.message)
    process.exit(4)
  }
}

function listSecrets() {
  try {
    return JSON.parse(execSync('bws secret list', { encoding: 'utf8', env: process.env }))
  } catch (err) {
    console.error('bws secret list failed:', err.stderr?.toString().slice(0, 200) || err.message)
    process.exit(4)
  }
}

function envKeysFromRepo(repoPath) {
  const keys = {}
  for (const fname of ENV_FILES) {
    const fpath = join(repoPath, fname)
    if (!existsSync(fpath)) continue
    try {
      const lines = readFileSync(fpath, 'utf8').split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const m = trimmed.match(/^export\s+([A-Z_][A-Z0-9_]*)=/i) || trimmed.match(/^([A-Z_][A-Z0-9_]*)=/i)
        if (m) {
          const key = m[1]
          if (!keys[key]) keys[key] = []
          keys[key].push(fname)
        }
      }
    } catch {}
  }
  return keys
}

function gatherAllEnvKeys() {
  // Returns: { 'ANTHROPIC_API_KEY': ['hub:.env.local', 'JusticeHub:.env'], ... }
  const all = {}
  for (const repo of ACT_REPOS) {
    if (!existsSync(repo)) continue
    const repoName = repo.split('/').pop().replace(/\s+/g, '-').toLowerCase()
    const repoKeys = envKeysFromRepo(repo)
    for (const [key, files] of Object.entries(repoKeys)) {
      if (!all[key]) all[key] = []
      for (const f of files) {
        all[key].push(`${repoName}:${f}`)
      }
    }
  }
  return all
}

function ageInDays(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function main() {
  precheck()
  console.error('[bws-audit] reading Secrets Manager…')
  const projects = listProjects()
  const secrets = listSecrets()
  console.error(`[bws-audit] ${projects.length} projects, ${secrets.length} secrets`)
  console.error('[bws-audit] scanning .env.local files across 9 ACT repos…')
  const envKeys = gatherAllEnvKeys()
  console.error(`[bws-audit] ${Object.keys(envKeys).length} unique env keys found in repos\n`)

  const projById = Object.fromEntries(projects.map(p => [p.id, p.name]))

  // Build audit rows
  const audit = secrets.map(s => {
    const inEnv = envKeys[s.key] || []
    return {
      key: s.key,
      project: s.projectId ? (projById[s.projectId] || '(unknown)') : '(none)',
      revisionDate: s.revisionDate,
      ageDays: ageInDays(s.revisionDate),
      note: s.note?.slice(0, 60) || '',
      in_env_repos: inEnv,
      env_repo_count: inEnv.length,
      orphan: inEnv.length === 0,
    }
  })

  // Find env keys NOT in BWS — likely candidates to add to BWS for centralisation
  const bwsKeySet = new Set(secrets.map(s => s.key))
  const missingFromBws = Object.entries(envKeys).filter(([k]) => !bwsKeySet.has(k)).map(([k, repos]) => ({ key: k, in_env_repos: repos }))

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({ audit, missing_from_bws: missingFromBws, projects, summary: {
      total_secrets: secrets.length,
      total_env_keys: Object.keys(envKeys).length,
      orphans: audit.filter(a => a.orphan).length,
      missing_from_bws: missingFromBws.length,
    } }, null, 2) + '\n')
    return
  }

  // Filtered table view
  let rows = audit
  if (STALE_DAYS > 0) rows = rows.filter(a => a.ageDays !== null && a.ageDays >= STALE_DAYS)
  if (ORPHANS_ONLY) rows = rows.filter(a => a.orphan)

  if (!MISSING_ONLY) {
    console.log(`SECRETS IN BWS — ${rows.length} of ${audit.length} shown${STALE_DAYS > 0 ? ` (stale ≥${STALE_DAYS}d)` : ''}${ORPHANS_ONLY ? ' (orphans only)' : ''}`)
    console.log('')
    console.log('Age   Repos  Project          Key')
    console.log('----  -----  ---------------  ----------------')
    for (const r of rows.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0))) {
      const age = (r.ageDays ?? '?').toString().padStart(4)
      const reposCount = r.env_repo_count.toString().padStart(2)
      const orphanFlag = r.orphan ? ' ⚠️' : '  '
      const project = (r.project || '').slice(0, 16).padEnd(16)
      console.log(`${age}d  ${reposCount}${orphanFlag}  ${project}  ${r.key}`)
    }
    console.log('')
  }

  if (missingFromBws.length > 0 && !ORPHANS_ONLY) {
    console.log(`KEYS IN .env.local FILES BUT NOT IN BWS — ${missingFromBws.length}`)
    console.log('')
    console.log('Repos          Key')
    console.log('-------------  ----------------')
    for (const m of missingFromBws.sort((a, b) => a.key.localeCompare(b.key))) {
      const reposShort = m.in_env_repos.slice(0, 3).join(', ').slice(0, 60)
      console.log(`${m.in_env_repos.length.toString().padStart(2)} repos     ${m.key}  (${reposShort})`)
    }
    console.log('')
  }

  // Summary
  console.log('─────────────────────────────────────────────────────────')
  console.log('Summary:')
  console.log(`  ${secrets.length} secrets in BWS`)
  console.log(`  ${Object.keys(envKeys).length} unique env keys across .env.local files`)
  console.log(`  ${audit.filter(a => a.orphan).length} BWS secrets are ORPHANS (not in any .env.local)`)
  console.log(`  ${missingFromBws.length} env keys are MISSING FROM BWS`)
  if (STALE_DAYS === 0) {
    console.log(`  ${audit.filter(a => (a.ageDays || 0) >= 90).length} BWS secrets >90d old (run --stale 90 to filter)`)
  }
  console.log('')
  console.log('Next steps:')
  console.log('  Orphans → either add to a .env.local OR delete from BWS')
  console.log('  Missing → bws secret create "<key>" "<value>" <project-id>')
  console.log('  Stale (>90d) → consider rotation')
}

main()
