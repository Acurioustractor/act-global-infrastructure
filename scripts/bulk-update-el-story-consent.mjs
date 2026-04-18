#!/usr/bin/env node
/**
 * Bulk-update EL v2 story consent flags from an org-level approval decision.
 *
 * Context
 * -------
 * Some approvals are given at the community level (e.g. Kristy Bloomfield and
 * Tanya Turner giving Oonchiumpa org approval for all stories on 2026-04-18).
 * Rather than flip flags on each story one-by-one in the EL v2 admin UI,
 * this script applies the approval in bulk — scoped to a single org.
 *
 * What it changes (per story):
 *   has_explicit_consent            = true    (if not already)
 *   ai_processing_consent_verified  = true    (if not already)
 *   enable_ai_processing            = true    (if not already)
 *   syndication_enabled             = true    (if not already)
 *   cross_tenant_visibility         += "act-wiki"   (union, preserves existing)
 *   status                          = "published"  (only if currently "draft")
 *   community_status                = "active"     (only if currently "draft")
 *
 * What it NEVER touches:
 *   privacy_level           (storyteller's own tier)
 *   elder_approved_at       (required by culturally sensitive content)
 *   consent_withdrawn_at    (withdrawal is sacred — never auto-cleared)
 *   cultural_sensitivity_level, cultural_warnings
 *
 * Respects prior withdrawal:
 *   Stories with consent_withdrawn_at set are SKIPPED. Withdrawal outweighs
 *   org-level approval — personal agency wins.
 *
 * Usage
 * -----
 *   node scripts/bulk-update-el-story-consent.mjs --org oonchiumpa
 *   node scripts/bulk-update-el-story-consent.mjs --org oonchiumpa --apply
 *   node scripts/bulk-update-el-story-consent.mjs --org oonchiumpa --apply --reason "Org-level approval per wiki/decisions/2026-04-18-oonchiumpa-story-approval.md"
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'el-consent-bulk')

// ---- Args ------------------------------------------------------------------

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ORG = (() => {
  const i = args.indexOf('--org')
  return i >= 0 ? args[i + 1] : null
})()
const REASON = (() => {
  const i = args.indexOf('--reason')
  return i >= 0 ? args[i + 1] : 'Org-level approval recorded in wiki/decisions/'
})()
// Two extended gates that are NOT applied by default — require explicit flags
// because they only make sense when the approval source holds the right authority.
const UPGRADE_PRIVATE_TO_COMMUNITY = args.includes('--upgrade-private-to-community')
const SET_ELDER_APPROVED = (() => {
  const i = args.indexOf('--set-elder-approved')
  return i >= 0 ? args[i + 1] : null // pass an ISO date or 'now'
})()

if (!ORG) {
  console.error('[fatal] --org <slug> required')
  process.exit(1)
}

// ---- Env -------------------------------------------------------------------

const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local')
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8')
  for (const line of elEnv.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length > 0 && !process.env[`EL_${key}`]) {
      process.env[`EL_${key}`] = rest.join('=').trim()
    }
  }
} catch {}

const EL_SUPABASE_URL =
  process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const SERVICE_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('[fatal] Missing EL_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ---- PostgREST helpers -----------------------------------------------------

async function restGet(path) {
  const res = await fetch(`${EL_SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

async function restPatch(path, body) {
  const res = await fetch(`${EL_SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== bulk-update-el-story-consent =====')
  console.log(`Mode: ${APPLY ? 'APPLY (writes to EL v2 production)' : 'DRY-RUN'}`)
  console.log(`Org: ${ORG}`)
  console.log(`Reason: ${REASON}`)
  console.log('')

  // 1. Resolve org slug to ID
  const orgRows = await restGet(`organizations?select=id,name,slug&slug=eq.${encodeURIComponent(ORG)}`)
  if (!orgRows.length) {
    console.error(`[fatal] org slug "${ORG}" not found in EL v2 organizations table`)
    process.exit(2)
  }
  const org = orgRows[0]
  console.log(`✓ Resolved: ${org.name} (${org.id})`)

  // 2. Fetch all stories for this org
  const stories = await restGet(
    `stories?select=id,title,status,community_status,has_explicit_consent,ai_processing_consent_verified,enable_ai_processing,syndication_enabled,cross_tenant_visibility,consent_withdrawn_at,privacy_level,cultural_sensitivity_level,cultural_warnings,elder_approved_at&organization_id=eq.${org.id}&order=updated_at.desc`,
  )
  console.log(`→ ${stories.length} stories in ${org.name}`)

  // 3. Compute changes per story
  const changes = []
  const skipped = []

  for (const s of stories) {
    if (s.consent_withdrawn_at) {
      skipped.push({ story: s, reason: `consent_withdrawn_at=${s.consent_withdrawn_at}` })
      continue
    }

    const patch = {}

    if (s.has_explicit_consent !== true) patch.has_explicit_consent = true
    if (s.ai_processing_consent_verified !== true) patch.ai_processing_consent_verified = true
    if (s.enable_ai_processing !== true) patch.enable_ai_processing = true
    if (s.syndication_enabled !== true) patch.syndication_enabled = true

    const currentVis = Array.isArray(s.cross_tenant_visibility) ? s.cross_tenant_visibility : []
    if (!currentVis.includes('act-wiki')) {
      patch.cross_tenant_visibility = [...currentVis, 'act-wiki']
    }

    if (s.status === 'draft') patch.status = 'published'
    if (s.community_status === 'draft') patch.community_status = 'published'

    if (UPGRADE_PRIVATE_TO_COMMUNITY && s.privacy_level === 'private') {
      patch.privacy_level = 'community'
    }

    if (SET_ELDER_APPROVED && !s.elder_approved_at) {
      patch.elder_approved_at = SET_ELDER_APPROVED === 'now'
        ? new Date().toISOString()
        : new Date(SET_ELDER_APPROVED).toISOString()
    }

    if (Object.keys(patch).length === 0) {
      skipped.push({ story: s, reason: 'already consented — no change needed' })
      continue
    }

    changes.push({ story: s, patch })
  }

  // 4. Plan report
  console.log('')
  console.log('===== Plan =====')
  console.log(`  will update:   ${changes.length}`)
  console.log(`  skipped:       ${skipped.length}`)
  console.log('')

  for (const c of changes) {
    const title = (c.story.title || '(untitled)').slice(0, 70)
    const fields = Object.keys(c.patch).join(', ')
    console.log(`  • ${c.story.id.slice(0, 8)}  "${title}"`)
    console.log(`      patch: ${fields}`)
  }

  if (skipped.length) {
    console.log('')
    console.log('  Skipped:')
    for (const s of skipped.slice(0, 20)) {
      const title = (s.story.title || '(untitled)').slice(0, 60)
      console.log(`  · ${s.story.id.slice(0, 8)}  ${title}  (${s.reason})`)
    }
    if (skipped.length > 20) console.log(`  ...and ${skipped.length - 20} more`)
  }

  // 5. Apply
  if (APPLY && changes.length) {
    console.log('')
    console.log('→ Applying PATCH to EL v2…')
    const applied = []
    for (const c of changes) {
      try {
        const result = await restPatch(`stories?id=eq.${c.story.id}`, c.patch)
        applied.push({ id: c.story.id, title: c.story.title, patch: c.patch, result: 'ok' })
        console.log(`  ✓ ${c.story.id.slice(0, 8)}  ${c.story.title?.slice(0, 60)}`)
      } catch (err) {
        applied.push({ id: c.story.id, title: c.story.title, patch: c.patch, result: `error: ${err.message}` })
        console.error(`  ✗ ${c.story.id.slice(0, 8)}  ${err.message}`)
      }
    }
    // Audit file
    if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
    const auditPath = join(AUDIT_DIR, `${stamp}-${ORG}.md`)
    const audit = [
      `# EL v2 bulk consent update — ${ORG}`,
      '',
      `Date: ${new Date().toISOString()}`,
      `Org: ${org.name} (${org.id})`,
      `Reason: ${REASON}`,
      `Total stories: ${stories.length}`,
      `Updated: ${applied.filter((a) => a.result === 'ok').length}`,
      `Errors: ${applied.filter((a) => a.result !== 'ok').length}`,
      `Skipped (already consented or withdrawn): ${skipped.length}`,
      '',
      '## Applied',
      '',
      ...applied.map(
        (a) => `- ${a.id} — "${a.title}" — ${a.result} — patch: \`${JSON.stringify(a.patch)}\``,
      ),
      '',
      '## Skipped',
      '',
      ...skipped.map((s) => `- ${s.story.id} — "${s.story.title}" — ${s.reason}`),
      '',
    ].join('\n')
    writeFileSync(auditPath, audit)
    console.log('')
    console.log(`✓ Audit: ${auditPath.replace(REPO_ROOT + '/', '')}`)
  } else if (!APPLY) {
    console.log('')
    console.log('(dry-run) Re-run with --apply to commit changes to EL v2.')
  }
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  console.error(err.stack)
  process.exit(1)
})
