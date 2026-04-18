#!/usr/bin/env node
// One-shot schema probe — find the real story↔storyteller↔project join path in EL v2.

import { readFileSync } from 'fs'
import { join } from 'path'

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

const URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co'
const KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY

async function g(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) return { error: `${res.status} ${await res.text()}` }
  return res.json()
}

console.log('=== stories columns ===')
const s1 = await g('stories?select=*&limit=1')
console.log(Object.keys(s1[0] || {}).join('\n'))

console.log('\n=== story_storytellers ===')
console.log(await g('story_storytellers?limit=1'))

console.log('\n=== storytellers columns ===')
const st = await g('storytellers?select=*&limit=1')
console.log(Object.keys(st[0] || {}).join('\n'))

console.log('\n=== story sample ===')
const sample = await g('stories?select=id,title,privacy_level,community_status,cultural_sensitivity_level,ai_processing_consent_verified,cross_tenant_visibility,tenant_id&limit=3')
console.log(JSON.stringify(sample, null, 2))

console.log('\n=== projects columns ===')
const p = await g('projects?select=*&limit=1')
console.log(Object.keys(p[0] || {}).join('\n'))

console.log('\n=== ACT org projects ===')
const actProj = await g(`projects?select=id,name,slug,act_project_code,organization_id&act_project_code=not.is.null&limit=20`)
console.log(JSON.stringify(actProj, null, 2))

console.log('\n=== organizations columns ===')
const o = await g('organizations?select=*&limit=1')
console.log(Object.keys(o[0] || {}).join('\n'))
