#!/usr/bin/env node
/**
 * Set elder_approved_at on a specific EL v2 story, with named provenance.
 *
 * This script exists because elder review is a per-story cultural act, not a
 * bulk operation. Each application records:
 *   - The story being approved (by id or title)
 *   - The elder or cultural authority giving the approval
 *   - The date the approval was given
 *   - A free-form reason / context
 *
 * Every run writes an audit file to wiki/output/el-elder-approvals/<ts>.md
 * so the cultural-authority chain is always recoverable.
 *
 * Safety
 * ------
 * - Dry-run by default
 * - Refuses to run if the story already has elder_approved_at set (use
 *   --overwrite to force — but that's a deliberate act of replacing one
 *   elder's approval with another and should be rare)
 *
 * Usage
 * -----
 *   node scripts/update-el-story-elder-approval.mjs \
 *     --story-id f99e581e \
 *     --approved-by "Brodie Germaine (BG Fit)" \
 *     --approved-on 2026-04-18 \
 *     --reason "Per-story approval — Brodie extended org-level approval to cover Jay's specific story"
 *
 *   node scripts/update-el-story-elder-approval.mjs ... --apply
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'el-elder-approvals')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const OVERWRITE = args.includes('--overwrite')
function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null }
const STORY_ID = arg('--story-id')
const TITLE_MATCH = arg('--title') // exact title match (alternative to --story-id)
const APPROVED_BY = arg('--approved-by')
const APPROVED_ON = arg('--approved-on') || new Date().toISOString().slice(0, 10)
const REASON = arg('--reason') || 'Elder approval given'

if ((!STORY_ID && !TITLE_MATCH) || !APPROVED_BY) {
  console.error('Usage: (--story-id <full-uuid-or-prefix> | --title "<exact title>") --approved-by "<name + role>" [--approved-on YYYY-MM-DD] [--reason "..."] [--apply]')
  process.exit(1)
}

const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local')
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8')
  for (const line of elEnv.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0 && !process.env[`EL_${key}`]) process.env[`EL_${key}`] = rest.join('=').trim()
  }
} catch {}

const URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] Missing EL_SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

async function g(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`GET ${p}: ${r.status} ${await r.text()}`)
  return r.json()
}

async function patch(p, body) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`)
  return r.json()
}

// Resolve story by either full UUID, short prefix (via candidate scan), or exact title.
let story = null
if (TITLE_MATCH) {
  const matches = await g(`stories?select=id,title,elder_approved_at,organization_id,cultural_sensitivity_level&title=eq.${encodeURIComponent(TITLE_MATCH)}`)
  if (matches.length > 1) {
    console.error(`[fatal] Multiple stories match title "${TITLE_MATCH}" — use --story-id to disambiguate`)
    process.exit(2)
  }
  story = matches[0]
} else if (STORY_ID.length === 36) {
  // Full UUID
  const matches = await g(`stories?select=id,title,elder_approved_at,organization_id,cultural_sensitivity_level&id=eq.${STORY_ID}`)
  story = matches[0]
} else {
  // Short prefix — scan a reasonable window (can be slow but safe)
  const all = await g(`stories?select=id,title,elder_approved_at,organization_id,cultural_sensitivity_level&limit=1000`)
  story = all.find((s) => s.id.startsWith(STORY_ID))
}
if (!story) {
  console.error(`[fatal] No story found matching: ${STORY_ID || TITLE_MATCH}`)
  process.exit(2)
}

console.log('===== update-el-story-elder-approval =====')
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
console.log(`Story:            ${story.id}`)
console.log(`Title:            ${story.title}`)
console.log(`Sensitivity:      ${story.cultural_sensitivity_level}`)
console.log(`Current approval: ${story.elder_approved_at || '(none)'}`)
console.log(`New approval:     ${APPROVED_ON}T00:00:00Z`)
console.log(`Approved by:      ${APPROVED_BY}`)
console.log(`Reason:           ${REASON}`)
console.log('')

if (story.elder_approved_at && !OVERWRITE) {
  console.error(`[fatal] Story already has elder_approved_at=${story.elder_approved_at}. Pass --overwrite to replace.`)
  process.exit(3)
}

if (!APPLY) {
  console.log('(dry-run) Re-run with --apply to write.')
  process.exit(0)
}

const result = await patch(`stories?id=eq.${story.id}`, {
  elder_approved_at: new Date(`${APPROVED_ON}T00:00:00Z`).toISOString(),
})
console.log(`✓ Patched. elder_approved_at is now: ${result[0]?.elder_approved_at}`)

// Audit
if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
const safe = (story.title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
const auditPath = join(AUDIT_DIR, `${stamp}-${safe}.md`)
const audit = [
  `# Elder approval — ${story.title}`,
  '',
  `Applied: ${new Date().toISOString()}`,
  `Story id: ${story.id}`,
  `Approved by: ${APPROVED_BY}`,
  `Approved on: ${APPROVED_ON}`,
  `Reason: ${REASON}`,
  `Previous elder_approved_at: ${story.elder_approved_at || '(none)'}`,
  `New elder_approved_at: ${result[0]?.elder_approved_at}`,
  `Cultural sensitivity: ${story.cultural_sensitivity_level}`,
  '',
].join('\n')
writeFileSync(auditPath, audit)
console.log(`✓ Audit: ${auditPath.replace(REPO_ROOT + '/', '')}`)
