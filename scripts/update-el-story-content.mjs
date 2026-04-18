#!/usr/bin/env node
/**
 * Update an EL v2 story's content field (and optionally excerpt, summary) from
 * a real transcript or refined text.
 *
 * Why this exists
 * ---------------
 * Some EL v2 records have summary-only content — paraphrased ingests where the
 * real transcript was not captured in the `content` field. When the original
 * recording or transcript becomes available, this tool replaces the summary-
 * form content with the real words so the story carries quotable voice.
 *
 * Safety
 * ------
 * - Dry-run by default
 * - Shows a diff between current and new content before writing
 * - Preserves the previous content in the audit log so nothing is lost
 * - Refuses to overwrite without --apply
 * - Refuses to run if the storyteller has consent_withdrawn_at set
 *
 * Input modes
 * -----------
 *   --content-file <path>   Read new content from a file (recommended for transcripts)
 *   --content-inline "..."  Pass new content directly (short updates only)
 *
 * Optional fields:
 *   --excerpt "short quote"  Update the excerpt field too
 *   --summary "one-paragraph" Update the summary field too
 *
 * Usage
 * -----
 *   # Benji's real transcript
 *   node scripts/update-el-story-content.mjs \
 *     --title "Benji - Youth Day Yarn" \
 *     --content-file /path/to/benji-transcript.txt \
 *     --excerpt "What he actually said when asked..." \
 *     --reason "Real transcript from Youth Day 2026-03-XX replacing summary-only ingest"
 *
 *   node scripts/update-el-story-content.mjs ... --apply
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const REPO_ROOT = join(dirname(__filename), '..')
const AUDIT_DIR = join(REPO_ROOT, 'wiki', 'output', 'el-content-updates')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
function arg(n) { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }

const STORY_ID = arg('--story-id')
const TITLE = arg('--title')
const CONTENT_FILE = arg('--content-file')
const CONTENT_INLINE = arg('--content-inline')
const NEW_EXCERPT = arg('--excerpt')
const NEW_SUMMARY = arg('--summary')
const REASON = arg('--reason') || 'Content update'

if ((!STORY_ID && !TITLE) || (!CONTENT_FILE && !CONTENT_INLINE)) {
  console.error('Usage: (--story-id <id> | --title "<title>") (--content-file <path> | --content-inline "...") [--excerpt "..."] [--summary "..."] [--reason "..."] [--apply]')
  process.exit(1)
}

const NEW_CONTENT = CONTENT_FILE ? readFileSync(CONTENT_FILE, 'utf8') : CONTENT_INLINE

const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local')
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8')
  for (const line of elEnv.split('\n')) {
    const [k, ...rest] = line.split('=')
    if (k && rest.length > 0 && !process.env[`EL_${k}`]) process.env[`EL_${k}`] = rest.join('=').trim()
  }
} catch {}

const URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY
if (!KEY) { console.error('[fatal] Missing service key'); process.exit(1) }

async function g(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`GET ${p}: ${r.status}`)
  return r.json()
}
async function patch(p, b) {
  const r = await fetch(`${URL}/rest/v1/${p}`, {
    method: 'PATCH',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(b),
  })
  if (!r.ok) throw new Error(`PATCH ${p}: ${r.status} ${await r.text()}`)
  return r.json()
}

// Resolve story
let story = null
if (TITLE) {
  const ms = await g(`stories?select=id,title,content,excerpt,summary,consent_withdrawn_at&title=eq.${encodeURIComponent(TITLE)}`)
  if (ms.length > 1) { console.error(`[fatal] ${ms.length} stories match title — use --story-id`); process.exit(2) }
  story = ms[0]
} else if (STORY_ID.length === 36) {
  story = (await g(`stories?select=id,title,content,excerpt,summary,consent_withdrawn_at&id=eq.${STORY_ID}`))[0]
} else {
  const all = await g(`stories?select=id,title,content,excerpt,summary,consent_withdrawn_at&limit=1000`)
  story = all.find((s) => s.id.startsWith(STORY_ID))
}
if (!story) { console.error(`[fatal] no story found`); process.exit(2) }
if (story.consent_withdrawn_at) {
  console.error(`[fatal] consent_withdrawn_at=${story.consent_withdrawn_at} — refusing to update`)
  process.exit(3)
}

console.log('===== update-el-story-content =====')
console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
console.log(`Story id:         ${story.id}`)
console.log(`Title:            ${story.title}`)
console.log(`Reason:           ${REASON}`)
console.log('')

console.log('--- OLD content (first 400 chars) ---')
console.log((story.content || '(empty)').slice(0, 400))
console.log(`... [full length: ${(story.content || '').length} chars]`)
console.log('')
console.log('--- NEW content (first 400 chars) ---')
console.log(NEW_CONTENT.slice(0, 400))
console.log(`... [full length: ${NEW_CONTENT.length} chars]`)
console.log('')

if (NEW_EXCERPT) { console.log('Excerpt update:'); console.log(`  OLD: ${story.excerpt || '(none)'}`); console.log(`  NEW: ${NEW_EXCERPT}`); console.log('') }
if (NEW_SUMMARY) { console.log('Summary update:'); console.log(`  OLD: ${(story.summary || '(none)').slice(0, 200)}`); console.log(`  NEW: ${NEW_SUMMARY.slice(0, 200)}`); console.log('') }

if (!APPLY) { console.log('(dry-run) Re-run with --apply to write.'); process.exit(0) }

const body = { content: NEW_CONTENT }
if (NEW_EXCERPT) body.excerpt = NEW_EXCERPT
if (NEW_SUMMARY) body.summary = NEW_SUMMARY

const result = await patch(`stories?id=eq.${story.id}`, body)
console.log(`✓ Patched. New content length: ${result[0]?.content?.length} chars`)

if (!existsSync(AUDIT_DIR)) mkdirSync(AUDIT_DIR, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16)
const safe = story.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
const auditPath = join(AUDIT_DIR, `${stamp}-${safe}.md`)
const audit = [
  `# Content update — ${story.title}`,
  '',
  `Applied: ${new Date().toISOString()}`,
  `Story id: ${story.id}`,
  `Reason: ${REASON}`,
  '',
  '## OLD content (preserved here so nothing is lost)',
  '',
  story.content || '(empty)',
  '',
  NEW_EXCERPT ? `## OLD excerpt\n\n${story.excerpt || '(none)'}\n` : '',
  NEW_SUMMARY ? `## OLD summary\n\n${story.summary || '(none)'}\n` : '',
  '## NEW content',
  '',
  NEW_CONTENT,
  '',
].filter(Boolean).join('\n')
writeFileSync(auditPath, audit)
console.log(`✓ Audit: ${auditPath.replace(REPO_ROOT + '/', '')}`)
