#!/usr/bin/env node
// Probe the valid community_status enum values + existing distribution
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

async function g(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!res.ok) return { error: `${res.status} ${await res.text()}` }
  return res.json()
}

console.log('=== distinct community_status values across all stories ===')
const rows = await g('stories?select=community_status&limit=2000')
const counts = {}
for (const r of rows) counts[r.community_status ?? 'null'] = (counts[r.community_status ?? 'null'] || 0) + 1
console.log(counts)

console.log('\n=== distinct status values across all stories ===')
const s = await g('stories?select=status&limit=2000')
const sc = {}
for (const r of s) sc[r.status ?? 'null'] = (sc[r.status ?? 'null'] || 0) + 1
console.log(sc)
