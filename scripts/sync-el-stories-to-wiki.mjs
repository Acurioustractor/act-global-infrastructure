#!/usr/bin/env node
/**
 * Sync Empathy Ledger v2 stories → wiki/stories/
 *
 * Philosophy
 * ----------
 * EL v2 will grow to thousands of stories across many communities. Not all of
 * them belong inside ACT's knowledge base. This sync is opt-in by design:
 * a story only flows to wiki/stories/ if it matches an entry in
 * config/wiki-story-sync.json AND passes every OCAP gate in policy.ocap_gates.
 *
 * The OCAP gate chain
 * -------------------
 * Drawing on the five-pillar OCAP framework (Ownership, Control, Access,
 * Possession) and EL v2's richer consent signals:
 *
 *   Active/not-withdrawn:
 *     · community_status ∈ {active,published,approved}
 *     · status = 'published'
 *     · is_archived = false, deleted_at IS NULL, archived_at IS NULL
 *     · consent_withdrawn_at IS NULL   (primary withdrawal flag)
 *
 *   Consent (Ownership / Control):
 *     · has_explicit_consent = true
 *     · ai_processing_consent_verified = true  (agents may read)
 *     · enable_ai_processing = true
 *     · syndication_enabled = true     (explicit opt-in for downstream distribution)
 *
 *   Access:
 *     · privacy_level ∈ allowed_privacy_levels
 *     · cross_tenant_visibility includes wiki tenant OR story is public
 *
 *   Cultural safety:
 *     · elder_approved_at NOT NULL when cultural_sensitivity_level is
 *       elevated
 *     · cultural_warnings does not include blocked terms
 *     · secondary safety: body-text sacred-keyword scan
 *
 * Stories previously synced but now failing the gates are renamed with a
 * `withdrawn-YYYY-MM-DD-` prefix — NEVER silently deleted. Audit trail stays.
 *
 * Usage
 * -----
 *   node scripts/sync-el-stories-to-wiki.mjs                 # dry-run, print plan
 *   node scripts/sync-el-stories-to-wiki.mjs --apply         # write files
 *   node scripts/sync-el-stories-to-wiki.mjs --limit 5       # cap rows (testing)
 *   node scripts/sync-el-stories-to-wiki.mjs --project ACT-OO
 *   node scripts/sync-el-stories-to-wiki.mjs --verbose       # log per-skip reasons
 *
 * Outputs
 * -------
 *   wiki/stories/<allow-key>-<slug>.md  (auto-stamped with `source: el-v2-auto`)
 *   wiki/output/story-sync/<YYYY-MM-DD-HHMM>.md  (run manifest)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { inferConnectedPages } from './lib/wiki-source-bridge.mjs'
import { checkSacredContent } from './lib/cultural-guard.mjs'

// ---- Paths -----------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const WIKI_STORIES_DIR = join(REPO_ROOT, 'wiki', 'stories')
const MANIFEST_DIR = join(REPO_ROOT, 'wiki', 'output', 'story-sync')
const CONFIG_PATH = join(REPO_ROOT, 'config', 'wiki-story-sync.json')

// ---- Args ------------------------------------------------------------------

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const LIMIT = (() => {
  const i = args.indexOf('--limit')
  return i >= 0 ? parseInt(args[i + 1], 10) : null
})()
const PROJECT_FILTER = (() => {
  const i = args.indexOf('--project')
  return i >= 0 ? args[i + 1] : null
})()
const VERBOSE = args.includes('--verbose')

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
} catch {
  console.warn(`Could not load EL v2 env at ${EL_ENV_PATH}`)
}

const EL_SUPABASE_URL =
  process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const SERVICE_KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error('[fatal] Missing EL_SUPABASE_SERVICE_ROLE_KEY')
  console.error('        Set in ~/Code/empathy-ledger-v2/.env.local as SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ---- PostgREST helpers -----------------------------------------------------

async function restGet(path) {
  const url = `${EL_SUPABASE_URL}/rest/v1/${path}`
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

// ---- Schema verification ---------------------------------------------------

const REQUIRED_STORY_COLUMNS = [
  'id',
  'title',
  'content',
  'summary',
  'privacy_level',
  'cultural_sensitivity_level',
  'cultural_warnings',
  'elder_approved_at',
  'community_status',
  'status',
  'ai_processing_consent_verified',
  'enable_ai_processing',
  'has_explicit_consent',
  'syndication_enabled',
  'consent_withdrawn_at',
  'is_archived',
  'deleted_at',
  'cross_tenant_visibility',
  'project_id',
  'organization_id',
  'storyteller_id',
  'linked_storytellers',
  'tags',
  'themes',
  'cultural_themes',
  'updated_at',
]

async function verifySchema() {
  const probe = await restGet('stories?select=*&limit=1')
  const columns = probe.length ? Object.keys(probe[0]) : []
  const missing = REQUIRED_STORY_COLUMNS.filter((c) => !columns.includes(c))
  return { columns, missing }
}

// ---- Config ----------------------------------------------------------------

function loadConfig() {
  const raw = readFileSync(CONFIG_PATH, 'utf8')
  const cfg = JSON.parse(raw)
  if (cfg.schema_version !== 2) {
    throw new Error(`Unsupported config schema_version: ${cfg.schema_version}`)
  }
  return cfg
}

// Resolve allow-list (codes, slugs) to EL v2 IDs at startup. Fail loud if any
// allow-list entry doesn't resolve — prevents silent zero-match surprises.
async function resolveAllowListIds(config) {
  const resolved = {
    projectIds: new Set(), // project_id
    projectCodeById: new Map(), // project_id → act_project_code (for labelling)
    organizationIds: new Set(), // organization_id
    orgSlugById: new Map(),
    storytellerIds: new Set(Object.values(config.allow.storytellers || []).map((s) => s.id).filter(Boolean)),
    tags: (config.allow.tags || []).map((t) => t.tag.toLowerCase()),
    unresolved: [],
  }

  // Projects — look up by act_project_code
  for (const p of config.allow.projects || []) {
    try {
      const rows = await restGet(
        `projects?select=id,name,slug,act_project_code,organization_id&act_project_code=eq.${encodeURIComponent(p.act_project_code)}`,
      )
      if (!rows.length) {
        resolved.unresolved.push(`project code ${p.act_project_code} → no match in EL v2 projects`)
        continue
      }
      for (const r of rows) {
        resolved.projectIds.add(r.id)
        resolved.projectCodeById.set(r.id, r.act_project_code)
      }
    } catch (err) {
      resolved.unresolved.push(`project code ${p.act_project_code}: ${err.message}`)
    }
  }

  // Organizations — look up by slug
  for (const o of config.allow.organizations || []) {
    try {
      const rows = await restGet(`organizations?select=id,name,slug&slug=eq.${encodeURIComponent(o.slug)}`)
      if (!rows.length) {
        resolved.unresolved.push(`org slug ${o.slug} → no match in EL v2 organizations`)
        continue
      }
      for (const r of rows) {
        resolved.organizationIds.add(r.id)
        resolved.orgSlugById.set(r.id, r.slug)
      }
    } catch (err) {
      resolved.unresolved.push(`org slug ${o.slug}: ${err.message}`)
    }
  }

  return resolved
}

// ---- Story fetch (paginated) -----------------------------------------------

async function fetchAllStories(limit = null) {
  const PAGE = 500
  const all = []
  let offset = 0
  while (true) {
    const pageLimit = limit ? Math.min(PAGE, limit - all.length) : PAGE
    if (pageLimit <= 0) break
    const rows = await restGet(
      `stories?select=id,title,content,summary,excerpt,themes,cultural_themes,tags,story_category,story_type,privacy_level,is_public,cultural_sensitivity_level,cultural_warnings,elder_approved_at,community_status,status,is_archived,archived_at,deleted_at,consent_withdrawn_at,has_explicit_consent,ai_processing_consent_verified,enable_ai_processing,syndication_enabled,cross_tenant_visibility,project_id,organization_id,storyteller_id,linked_storytellers,author_id,published_at,updated_at&order=updated_at.desc&limit=${pageLimit}&offset=${offset}`,
    )
    all.push(...rows)
    if (rows.length < pageLimit) break
    offset += rows.length
    if (limit && all.length >= limit) break
  }
  return all
}

async function fetchStorytellers(ids) {
  const out = new Map()
  if (!ids.length) return out
  const CHUNK = 100
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK).filter(Boolean)
    if (!chunk.length) continue
    const idList = chunk.map((id) => `"${id}"`).join(',')
    const rows = await restGet(
      `storytellers?select=id,display_name,organization_id,is_elder,is_featured,cultural_background&id=in.(${idList})`,
    )
    for (const r of rows) out.set(r.id, r)
  }
  return out
}

// ---- OCAP gate chain -------------------------------------------------------

function passesOcapGates(story, policy) {
  const g = policy.ocap_gates
  const reasons = []

  if (Array.isArray(g.require_community_status_in) && !g.require_community_status_in.includes(story.community_status)) {
    reasons.push(`community_status=${story.community_status || 'null'} (need: ${g.require_community_status_in.join('|')})`)
  }

  if (Array.isArray(g.require_status_in) && !g.require_status_in.includes(story.status)) {
    reasons.push(`status=${story.status || 'null'} (need: ${g.require_status_in.join('|')})`)
  }

  if (g.require_not_archived && (story.is_archived || story.archived_at)) {
    reasons.push('is_archived or archived_at set')
  }
  if (g.require_not_deleted && story.deleted_at) {
    reasons.push('deleted_at set')
  }
  if (g.require_consent_not_withdrawn && story.consent_withdrawn_at) {
    reasons.push(`consent_withdrawn_at=${story.consent_withdrawn_at}`)
  }

  if (g.require_has_explicit_consent && story.has_explicit_consent !== true) {
    reasons.push('has_explicit_consent is not true')
  }
  if (g.require_ai_processing_consent_verified && story.ai_processing_consent_verified !== true) {
    reasons.push('ai_processing_consent_verified is not true')
  }
  if (g.require_enable_ai_processing && story.enable_ai_processing !== true) {
    reasons.push('enable_ai_processing is not true')
  }
  if (g.require_syndication_enabled && story.syndication_enabled !== true) {
    reasons.push('syndication_enabled is not true (storyteller has not opted in for downstream use)')
  }

  if (Array.isArray(g.allowed_privacy_levels) && !g.allowed_privacy_levels.includes(story.privacy_level)) {
    reasons.push(`privacy_level=${story.privacy_level} (allowed: ${g.allowed_privacy_levels.join(',')})`)
  }

  if (
    Array.isArray(g.require_elder_approval_when_sensitivity_in) &&
    g.require_elder_approval_when_sensitivity_in.includes(story.cultural_sensitivity_level) &&
    !story.elder_approved_at
  ) {
    reasons.push(`cultural_sensitivity_level=${story.cultural_sensitivity_level} requires elder_approved_at`)
  }

  if (Array.isArray(g.block_when_cultural_warnings_include)) {
    const raw = story.cultural_warnings
    const warnings = Array.isArray(raw)
      ? raw.map((w) => String(w).toLowerCase())
      : typeof raw === 'string'
        ? raw.toLowerCase().split(/[,;]/).map((s) => s.trim())
        : []
    const hits = g.block_when_cultural_warnings_include.filter((b) =>
      warnings.some((w) => w.includes(b.toLowerCase())),
    )
    if (hits.length) reasons.push(`cultural_warnings blocked: ${hits.join(', ')}`)
  }

  if (g.require_cross_tenant_visibility_to_wiki_or_public) {
    const vis = story.cross_tenant_visibility
    const visible =
      story.privacy_level === 'public' ||
      story.is_public === true ||
      (Array.isArray(vis) &&
        (vis.includes(policy.wiki_tenant_slug_for_visibility_check) || vis.includes('*')))
    if (!visible) reasons.push('cross_tenant_visibility does not include wiki or public')
  }

  // Secondary safety net on body content
  const sacred = checkSacredContent(`${story.title || ''} ${story.content || ''}`)
  if (sacred.isSacred && !story.elder_approved_at) {
    reasons.push(`sacred keywords detected (${sacred.matchedKeywords.join(', ')}) without elder approval`)
  }

  return { pass: reasons.length === 0, reasons }
}

function matchesAllowList(story, resolved, config) {
  if (resolved.projectIds.has(story.project_id)) {
    return { matched: true, via: `project:${resolved.projectCodeById.get(story.project_id) || story.project_id}` }
  }
  if (resolved.organizationIds.has(story.organization_id)) {
    return { matched: true, via: `org:${resolved.orgSlugById.get(story.organization_id) || story.organization_id}` }
  }
  if (resolved.storytellerIds.has(story.storyteller_id)) {
    return { matched: true, via: `storyteller:${story.storyteller_id}` }
  }
  if (Array.isArray(story.linked_storytellers)) {
    const hit = story.linked_storytellers.find((id) => resolved.storytellerIds.has(id))
    if (hit) return { matched: true, via: `linked-storyteller:${hit}` }
  }
  if (resolved.tags.length) {
    const bag = new Set()
    for (const src of [story.tags, story.themes, story.cultural_themes]) {
      if (Array.isArray(src)) for (const t of src) bag.add(String(t).toLowerCase())
    }
    const hit = resolved.tags.find((t) => bag.has(t))
    if (hit) return { matched: true, via: `tag:${hit}` }
  }
  return { matched: false, via: null }
}

function isDenied(story, config) {
  const deny = config.deny || {}
  // story_ids entries can be strings or {id, reason, ...} objects; entries can
  // also be full UUIDs or prefixes (first 8 chars) for readability.
  const denyIds = (deny.story_ids || []).map((d) => (typeof d === 'object' ? d.id : d))
  if (denyIds.some((denyId) => story.id === denyId || story.id.startsWith(denyId))) return true
  if ((deny.storytellers || []).some((d) => (typeof d === 'object' ? d.id : d) === story.storyteller_id)) return true
  return false
}

// ---- Markdown projection ---------------------------------------------------

function kebab(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

function wikiFilename(story, match, resolved) {
  const projectCode = resolved.projectCodeById.get(story.project_id)
  const orgSlug = resolved.orgSlugById.get(story.organization_id)
  const prefix = (projectCode ? projectCode.replace(/^ACT-/i, '').toLowerCase() : orgSlug) || 'story'
  const slug = kebab(story.title || story.id.slice(0, 8))
  return `${prefix}-${slug}.md`
}

function renderFrontmatter(story, match, storytellers, resolved, config) {
  const ids = [story.storyteller_id, ...(story.linked_storytellers || [])].filter(Boolean)
  const uniqueIds = Array.from(new Set(ids))
  const names = uniqueIds.map((id) => storytellers.get(id)?.display_name).filter(Boolean)
  const projectCode = resolved.projectCodeById.get(story.project_id) || null

  const consentTier =
    config.policy.defaults.consent_tier_map[story.privacy_level] || 'internal-only'

  const allTags = new Set()
  for (const src of [story.tags, story.themes, story.cultural_themes]) {
    if (Array.isArray(src)) for (const t of src) allTags.add(String(t).toLowerCase())
  }

  const fm = {
    title: story.title || '(untitled)',
    subtitle: names.length ? `Told by ${names.join(', ')}` : undefined,
    status: 'active',
    consent_tier: consentTier,
    project_code: projectCode || undefined,
    storyteller_ids: uniqueIds,
    cultural_sensitivity_level: story.cultural_sensitivity_level || 'standard',
    elder_approved_at: story.elder_approved_at || null,
    tags: Array.from(allTags),
    source: 'el-v2-auto',
    el_v2_story_id: story.id,
    el_v2_updated_at: story.updated_at,
    el_v2_match_via: match.via,
  }

  const lines = ['---']
  for (const [k, v] of Object.entries(fm)) {
    if (v === undefined) continue
    if (v === null) { lines.push(`${k}: null`); continue }
    if (Array.isArray(v)) {
      lines.push(`${k}: [${v.map((x) => JSON.stringify(x)).join(', ')}]`)
    } else if (typeof v === 'string') {
      lines.push(`${k}: ${JSON.stringify(v)}`)
    } else {
      lines.push(`${k}: ${v}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

function renderBody(story, storytellers) {
  const ids = [story.storyteller_id, ...(story.linked_storytellers || [])].filter(Boolean)
  const names = Array.from(new Set(ids))
    .map((id) => storytellers.get(id)?.display_name)
    .filter(Boolean)
    .join(' & ')

  const parts = []
  parts.push(`# ${story.title || '(untitled)'}`)
  if (names) parts.push('', `> ${names}`)
  if (story.excerpt) parts.push('', `> ${story.excerpt}`)
  if (story.summary) parts.push('', '## Summary', '', story.summary)
  if (story.content) parts.push('', '## Story', '', story.content)

  const backlinks = inferConnectedPages(`${story.title || ''} ${story.content || ''}`)
  if (backlinks.length) {
    parts.push('', '## Backlinks', '', ...backlinks.map((b) => `- ${b}`))
  }
  return parts.join('\n')
}

// ---- Diff-before-write -----------------------------------------------------

function readExistingIfAuto(path) {
  if (!existsSync(path)) return null
  const raw = readFileSync(path, 'utf8')
  if (!/^source:\s*"?el-v2-auto"?/m.test(raw)) return { kind: 'hand-authored', raw }
  const storyIdMatch = raw.match(/^el_v2_story_id:\s*"?([^"\n]+)"?/m)
  const updatedMatch = raw.match(/^el_v2_updated_at:\s*"?([^"\n]+)"?/m)
  return {
    kind: 'auto',
    raw,
    el_v2_story_id: storyIdMatch?.[1] || null,
    el_v2_updated_at: updatedMatch?.[1] || null,
  }
}

// ---- Main ------------------------------------------------------------------

async function main() {
  console.log('===== sync-el-stories-to-wiki =====')
  console.log(`Mode: ${APPLY ? 'APPLY (writes files)' : 'DRY-RUN (no writes)'}`)
  if (LIMIT) console.log(`Row cap: ${LIMIT}`)
  if (PROJECT_FILTER) console.log(`Project filter: ${PROJECT_FILTER}`)
  console.log(`EL v2 URL: ${EL_SUPABASE_URL}`)
  console.log('')

  // 1. Schema verification
  console.log('→ Verifying EL v2 story schema…')
  const schema = await verifySchema()
  if (schema.missing.length) {
    console.error(`[fatal] Missing columns on stories: ${schema.missing.join(', ')}`)
    console.error('        OCAP gates cannot be safely enforced. Aborting.')
    process.exit(2)
  }
  console.log(`  ✓ All ${REQUIRED_STORY_COLUMNS.length} expected columns present`)

  // 2. Config
  const config = loadConfig()
  console.log(`→ Loaded allow-list: ${config.allow.projects.length} projects, ${config.allow.organizations.length} orgs, ${config.allow.storytellers.length} storytellers, ${config.allow.tags.length} tags`)

  // 3. Resolve allow-list to IDs
  const resolved = await resolveAllowListIds(config)
  console.log(`  Resolved: ${resolved.projectIds.size} project IDs, ${resolved.organizationIds.size} org IDs, ${resolved.storytellerIds.size} storyteller IDs, ${resolved.tags.length} tags`)
  if (resolved.unresolved.length) {
    console.warn('  Unresolved allow-list entries:')
    for (const u of resolved.unresolved) console.warn(`    · ${u}`)
  }

  // 4. Fetch stories
  console.log('→ Fetching stories…')
  const stories = await fetchAllStories(LIMIT)
  console.log(`  ${stories.length} stories retrieved`)

  // 5. Apply project filter to stories (CLI-level)
  const filtered = PROJECT_FILTER
    ? stories.filter((s) => {
        const projectCode = resolved.projectCodeById.get(s.project_id)
        return projectCode === PROJECT_FILTER
      })
    : stories

  if (PROJECT_FILTER) console.log(`  ${filtered.length} after --project ${PROJECT_FILTER} filter`)

  // 6. Fetch storyteller records for name rendering
  const allStorytellerIds = Array.from(
    new Set(
      filtered.flatMap((s) => [s.storyteller_id, ...(s.linked_storytellers || [])].filter(Boolean)),
    ),
  )
  const storytellers = await fetchStorytellers(allStorytellerIds)
  console.log(`  ${storytellers.size} storyteller records loaded`)

  // 7. Classify
  const decisions = { willWrite: [], willUpdate: [], skippedNoMatch: 0, skippedOcap: [], denied: [], unchanged: [] }

  for (const story of filtered) {
    if (isDenied(story, config)) {
      decisions.denied.push({ story, reasons: ['explicit deny-list match'] })
      continue
    }

    const match = matchesAllowList(story, resolved, config)
    if (!match.matched) {
      decisions.skippedNoMatch++
      continue
    }

    const ocap = passesOcapGates(story, config.policy)
    if (!ocap.pass) {
      decisions.skippedOcap.push({ story, match, reasons: ocap.reasons })
      continue
    }

    const filename = wikiFilename(story, match, resolved)
    const filepath = join(WIKI_STORIES_DIR, filename)
    const existing = readExistingIfAuto(filepath)
    const frontmatter = renderFrontmatter(story, match, storytellers, resolved, config)
    const body = renderBody(story, storytellers)
    const full = `${frontmatter}${body}\n`

    if (!existing) {
      decisions.willWrite.push({ story, match, filepath, filename, full })
    } else if (existing.kind === 'hand-authored') {
      decisions.skippedOcap.push({
        story,
        match,
        reasons: [`hand-authored file exists at ${filename} — will not overwrite`],
      })
    } else if (existing.el_v2_story_id === story.id && existing.el_v2_updated_at >= story.updated_at) {
      decisions.unchanged.push({ story, match, filepath, filename })
    } else {
      decisions.willUpdate.push({ story, match, filepath, filename, full, existing })
    }
  }

  // 8. Detect withdrawals — auto files whose story was seen in this fetch but fell out of gates
  const syncedFiles = existsSync(WIKI_STORIES_DIR)
    ? readdirSync(WIKI_STORIES_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('withdrawn-'))
    : []
  const survivingIds = new Set(
    [...decisions.willWrite, ...decisions.willUpdate, ...decisions.unchanged].map((d) => d.story.id),
  )
  const withdrawals = []
  for (const f of syncedFiles) {
    const existing = readExistingIfAuto(join(WIKI_STORIES_DIR, f))
    if (!existing || existing.kind !== 'auto' || !existing.el_v2_story_id) continue
    const sawIt = filtered.some((s) => s.id === existing.el_v2_story_id)
    if (sawIt && !survivingIds.has(existing.el_v2_story_id)) {
      withdrawals.push({ filename: f, existing })
    }
  }

  // 9. Plan
  console.log('')
  console.log('===== Plan =====')
  console.log(`  write new:    ${decisions.willWrite.length}`)
  console.log(`  update:       ${decisions.willUpdate.length}`)
  console.log(`  unchanged:    ${decisions.unchanged.length}`)
  console.log(`  skipped ocap: ${decisions.skippedOcap.length}`)
  console.log(`  no match:     ${decisions.skippedNoMatch}`)
  console.log(`  denied:       ${decisions.denied.length}`)
  console.log(`  withdrawals:  ${withdrawals.length}`)

  if (VERBOSE) {
    for (const d of decisions.skippedOcap) {
      console.log(`  [ocap-skip] ${d.story.id.slice(0, 8)} "${d.story.title}" via ${d.match.via}: ${d.reasons.join('; ')}`)
    }
    for (const d of decisions.willWrite) {
      console.log(`  [new] ${d.filename} ← ${d.story.id.slice(0, 8)} via ${d.match.via}`)
    }
  }

  // 10. Apply writes
  if (APPLY) {
    console.log('')
    console.log('→ Writing files…')
    if (!existsSync(WIKI_STORIES_DIR)) mkdirSync(WIKI_STORIES_DIR, { recursive: true })
    for (const d of [...decisions.willWrite, ...decisions.willUpdate]) {
      writeFileSync(d.filepath, d.full)
      console.log(`  ✓ ${d.filename}`)
    }
    for (const w of withdrawals) {
      const stamp = new Date().toISOString().slice(0, 10)
      const newName = `withdrawn-${stamp}-${w.filename}`
      renameSync(join(WIKI_STORIES_DIR, w.filename), join(WIKI_STORIES_DIR, newName))
      console.log(`  ⟳ withdrew ${w.filename} → ${newName}`)
    }
  }

  // 11. Manifest
  if (!existsSync(MANIFEST_DIR)) mkdirSync(MANIFEST_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
  const manifestPath = join(MANIFEST_DIR, `${stamp}.md`)
  const manifest = [
    `# Story sync manifest — ${new Date().toISOString()}`,
    '',
    `Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`,
    `EL v2 URL: ${EL_SUPABASE_URL}`,
    `Stories fetched: ${stories.length} (filtered to ${filtered.length})`,
    `Allow-list: ${resolved.projectIds.size} project IDs / ${resolved.organizationIds.size} org IDs / ${resolved.storytellerIds.size} storytellers / ${resolved.tags.length} tags`,
    resolved.unresolved.length ? `Unresolved allow-list entries: ${resolved.unresolved.length}` : '',
    '',
    '## Counts',
    `- write new: ${decisions.willWrite.length}`,
    `- update: ${decisions.willUpdate.length}`,
    `- unchanged: ${decisions.unchanged.length}`,
    `- skipped (OCAP fail): ${decisions.skippedOcap.length}`,
    `- skipped (no allow match): ${decisions.skippedNoMatch}`,
    `- denied (deny-list): ${decisions.denied.length}`,
    `- withdrawals: ${withdrawals.length}`,
    '',
    '## Story anchor index (for autoreason)',
    '',
    ...[...decisions.willWrite, ...decisions.willUpdate, ...decisions.unchanged]
      .slice(0, 100)
      .map((d) => `- [[${d.filename.replace(/\.md$/, '')}]] — ${d.story.title || '(untitled)'} (via ${d.match?.via || 'unchanged'})`),
    '',
    '## OCAP skips (with reasons)',
    '',
    ...decisions.skippedOcap
      .slice(0, 200)
      .map((d) => `- ${d.story.id.slice(0, 8)} "${d.story.title || '(untitled)'}" via ${d.match.via} — ${d.reasons.join('; ')}`),
    '',
    '## Withdrawals',
    '',
    ...withdrawals.map((w) => `- ${w.filename} (story ${w.existing.el_v2_story_id})`),
    '',
  ].filter(Boolean).join('\n')

  if (APPLY) {
    writeFileSync(manifestPath, manifest)
    console.log('')
    console.log(`✓ Manifest: ${manifestPath.replace(REPO_ROOT + '/', '')}`)
  } else {
    console.log('')
    console.log(`(dry-run) manifest would be: ${manifestPath.replace(REPO_ROOT + '/', '')}`)
    console.log('  Re-run with --apply to write files.')
  }
}

main().catch((err) => {
  console.error('[fatal]', err.message)
  console.error(err.stack)
  process.exit(1)
})
