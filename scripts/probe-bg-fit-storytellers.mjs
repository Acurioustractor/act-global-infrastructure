#!/usr/bin/env node
// Probe every storyteller behind a BG Fit story — look for age / youth signals in bio, tags, display_name
import { readFileSync } from 'fs'
import { join } from 'path'
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
async function g(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); return r.ok ? r.json() : [] }

const orgs = await g(`organizations?select=id&slug=eq.bg-fit`)
const orgId = orgs[0].id

const stories = await g(`stories?select=id,title,storyteller_id,linked_storytellers,excerpt&organization_id=eq.${orgId}&order=title.asc`)
const ids = new Set()
for (const s of stories) {
  if (s.storyteller_id) ids.add(s.storyteller_id)
  if (Array.isArray(s.linked_storytellers)) for (const x of s.linked_storytellers) ids.add(x)
}

const tellers = await g(`storytellers?select=id,display_name,bio,tags,is_elder,birth_year,birth_date,birth_place,cultural_background&id=in.(${Array.from(ids).map((i) => `"${i}"`).join(',')})`)

const byId = new Map()
for (const t of tellers) byId.set(t.id, t)

console.log('===== BG Fit storyteller audit =====')
console.log(`Stories: ${stories.length}   Storytellers: ${tellers.length}`)
console.log('')

function youthScore(t, story) {
  const text = `${t.display_name || ''} ${t.bio || ''} ${(t.tags || []).join(' ')} ${story?.title || ''} ${story?.excerpt || ''}`.toLowerCase()
  const signals = []
  if (t.is_elder === true) signals.push('ELDER')
  if (t.birth_year && new Date().getFullYear() - t.birth_year <= 25) signals.push(`age~${new Date().getFullYear() - t.birth_year}`)
  if (/\byouth\b|\byoung (person|man|woman|people|fella)\b|\bkid\b|\bteen\b/.test(text)) signals.push('youth-word')
  if (/\b1[0-9][-\s](year)\b/.test(text)) signals.push('teen-age')
  if (/\bfounder|director|co-director|ceo|president|officer|manager|worker|liaison\b/.test(text)) signals.push('LEADER/WORKER')
  if (/\bauntie|aunty|uncle|nan\b/.test(text)) signals.push('kin-elder-ref')
  return signals
}

for (const s of stories) {
  const primary = byId.get(s.storyteller_id)
  const signals = primary ? youthScore(primary, s) : ['no-storyteller-record']
  const name = primary?.display_name || '(no primary storyteller)'
  console.log(`\n${s.id.slice(0, 8)}  "${s.title.slice(0, 55)}"`)
  console.log(`    storyteller: ${name}`)
  console.log(`    signals: ${signals.join(', ')}`)
  if (primary?.bio) console.log(`    bio: ${primary.bio.slice(0, 150)}`)
  if (Array.isArray(s.linked_storytellers) && s.linked_storytellers.length) {
    for (const lid of s.linked_storytellers) {
      const linked = byId.get(lid)
      if (linked && linked.id !== s.storyteller_id) {
        console.log(`    +linked: ${linked.display_name} [${youthScore(linked, s).join(',')}]`)
      }
    }
  }
}
