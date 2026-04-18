#!/usr/bin/env node
/**
 * Read-only survey of an EL v2 organisation's stories + consent-gate states.
 *
 * Use this BEFORE deciding whether to bulk-apply consent flags. It answers:
 *   - How many stories does this org have?
 *   - What states are they in today (privacy_level, status, consent flags)?
 *   - Which gates would currently block wiki-sync flow?
 *   - Are there identifiable youth-voice candidates (for orgs where only
 *     selective approval applies, e.g. PICC)?
 *
 * NO WRITES. This script cannot patch, upsert, or insert. It only GETs.
 *
 * Usage
 * -----
 *   node scripts/survey-el-org-stories.mjs --org bg-fit
 *   node scripts/survey-el-org-stories.mjs --org mounty-yarns
 *   node scripts/survey-el-org-stories.mjs --org palm-island-community-company --youth-only
 *   node scripts/survey-el-org-stories.mjs --org palm-island-community-company --grep "young"
 */

import { readFileSync } from 'fs'
import { join } from 'path'

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

const args = process.argv.slice(2)
const ORG = (() => { const i = args.indexOf('--org'); return i >= 0 ? args[i + 1] : null })()
const YOUTH_ONLY = args.includes('--youth-only')
const GREP = (() => { const i = args.indexOf('--grep'); return i >= 0 ? args[i + 1] : null })()

if (!ORG) { console.error('[fatal] --org <slug> required'); process.exit(1) }

async function g(p) {
  const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
  return r.json()
}

const org = (await g(`organizations?select=id,name,slug&slug=eq.${encodeURIComponent(ORG)}`))[0]
if (!org) { console.error(`[fatal] org "${ORG}" not found`); process.exit(1) }

const stories = await g(
  `stories?select=id,title,excerpt,summary,status,community_status,privacy_level,cultural_sensitivity_level,cultural_warnings,has_explicit_consent,ai_processing_consent_verified,enable_ai_processing,syndication_enabled,cross_tenant_visibility,consent_withdrawn_at,elder_approved_at,storyteller_id,tags,themes,cultural_themes,updated_at&organization_id=eq.${org.id}&order=updated_at.desc&limit=500`,
)

function analyseStory(s) {
  const gates = []
  if (s.consent_withdrawn_at) gates.push('consent_withdrawn')
  if (!['published', 'pending_review'].includes(s.community_status)) gates.push(`community_status=${s.community_status}`)
  if (s.status !== 'published') gates.push(`status=${s.status}`)
  if (s.has_explicit_consent !== true) gates.push('no_explicit_consent')
  if (s.ai_processing_consent_verified !== true) gates.push('no_ai_consent')
  if (s.enable_ai_processing !== true) gates.push('ai_disabled')
  if (s.syndication_enabled !== true) gates.push('no_syndication')
  if (!['public', 'anonymous', 'community'].includes(s.privacy_level)) gates.push(`privacy=${s.privacy_level}`)
  const vis = Array.isArray(s.cross_tenant_visibility) ? s.cross_tenant_visibility : []
  if (s.privacy_level !== 'public' && !vis.includes('act-wiki') && !vis.includes('*')) gates.push('no_wiki_visibility')
  if (['medium', 'high', 'sacred', 'sensitive'].includes(s.cultural_sensitivity_level) && !s.elder_approved_at) {
    gates.push(`sensitivity=${s.cultural_sensitivity_level}_no_elder`)
  }
  return gates
}

function youthSignal(s) {
  const hay = `${s.title || ''} ${s.excerpt || ''} ${s.summary || ''}`.toLowerCase()
  const tags = [...(s.tags || []), ...(s.themes || []), ...(s.cultural_themes || [])].map((t) =>
    String(typeof t === 'object' ? t.name || '' : t).toLowerCase(),
  )
  const all = hay + ' ' + tags.join(' ')
  const signals = []
  if (/\byouth\b|\byoung (people|person)\b|\bkid(s|dos)?\b|\btween|teen/.test(all)) signals.push('youth-word')
  if (/\b(1[0-9]|2[0-3])[-,\s](year[-\s]?old)\b|\bage[sd]?\s*1[0-9]\b/.test(all)) signals.push('teen-age')
  if (/school|mentor|detention|diversion|bail|court|magistrate|justice/.test(all)) signals.push('justice-context')
  if (/elder|grandmother|grandfather|aunty|uncle/.test(all)) signals.push('elder-context')
  return signals
}

const bucket = { ready: [], blocked: [], withdrawn: [] }
for (const s of stories) {
  if (s.consent_withdrawn_at) { bucket.withdrawn.push(s); continue }
  const gates = analyseStory(s)
  if (gates.length === 0) bucket.ready.push({ story: s, gates })
  else bucket.blocked.push({ story: s, gates })
}

const filtered = YOUTH_ONLY || GREP
  ? stories.filter((s) => {
      if (GREP) {
        const hay = `${s.title || ''} ${s.excerpt || ''} ${s.summary || ''}`.toLowerCase()
        if (!hay.includes(GREP.toLowerCase())) return false
      }
      if (YOUTH_ONLY) {
        const sigs = youthSignal(s)
        if (!sigs.some((x) => x === 'youth-word' || x === 'teen-age')) return false
      }
      return true
    })
  : null

console.log(`===== EL v2 survey: ${org.name} (${org.slug}) =====`)
console.log(`Total stories: ${stories.length}`)
console.log(`  Ready to flow (all gates pass): ${bucket.ready.length}`)
console.log(`  Blocked by ≥1 gate:             ${bucket.blocked.length}`)
console.log(`  Consent withdrawn:              ${bucket.withdrawn.length}`)
console.log('')

console.log('Gate-failure distribution (across blocked stories):')
const gateCounts = {}
for (const b of bucket.blocked) for (const g of b.gates) gateCounts[g] = (gateCounts[g] || 0) + 1
for (const [g, c] of Object.entries(gateCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(c).padStart(4)}  ${g}`)
}
console.log('')

console.log('Privacy-level distribution:')
const priv = {}
for (const s of stories) priv[s.privacy_level || 'null'] = (priv[s.privacy_level || 'null'] || 0) + 1
for (const [k, c] of Object.entries(priv)) console.log(`  ${String(c).padStart(4)}  ${k}`)
console.log('')

console.log('Cultural sensitivity distribution:')
const sens = {}
for (const s of stories) sens[s.cultural_sensitivity_level || 'null'] = (sens[s.cultural_sensitivity_level || 'null'] || 0) + 1
for (const [k, c] of Object.entries(sens)) console.log(`  ${String(c).padStart(4)}  ${k}`)
console.log('')

if (filtered) {
  console.log(`Filtered list (${filtered.length} stories):`)
  for (const s of filtered.slice(0, 50)) {
    const sigs = youthSignal(s).join(',')
    console.log(`  · ${s.id.slice(0, 8)}  "${(s.title || '').slice(0, 60)}"  [${sigs}]`)
  }
  console.log('')
}

console.log('Titles (first 30):')
for (const s of stories.slice(0, 30)) {
  const g = analyseStory(s)
  const sigs = youthSignal(s).join(',')
  console.log(`  ${g.length === 0 ? '✓' : '·'}  ${s.id.slice(0, 8)}  "${(s.title || '').slice(0, 55)}"  [${sigs || '—'}]`)
}
