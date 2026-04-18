#!/usr/bin/env node
// Read-only: fetch a specific EL v2 story by short-id-prefix
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

const ids = process.argv.slice(2)
if (!ids.length) { console.error('Usage: read-el-story.mjs <short-id> [<short-id> ...]'); process.exit(1) }

for (const short of ids) {
  const r = await fetch(`${URL}/rest/v1/stories?select=id,title,excerpt,summary,content,storyteller_id,privacy_level,cultural_sensitivity_level&id=like.${short}%25`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const rows = await r.json()
  const s = rows[0]
  if (!s) { console.log(`${short}: not found`); continue }
  console.log(`\n========== ${s.id} ==========`)
  console.log(`Title: ${s.title}`)
  console.log(`Privacy: ${s.privacy_level}  Sensitivity: ${s.cultural_sensitivity_level}`)
  if (s.excerpt) console.log(`\nExcerpt: ${s.excerpt}`)
  if (s.summary) console.log(`\nSummary: ${s.summary}`)
  if (s.content) console.log(`\nContent:\n${s.content.slice(0, 3000)}${s.content.length > 3000 ? '\n... [truncated]' : ''}`)
}
