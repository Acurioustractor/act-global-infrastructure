#!/usr/bin/env node
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
async function g(p) { const r = await fetch(`${URL}/rest/v1/${p}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); return r.ok ? r.json() : { err: r.status } }
const rows = await g('organizations?select=id,name,slug&order=name.asc')
for (const r of rows) console.log(`${r.slug.padEnd(40)} ${r.name}`)
