#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';

const EL_ENV_PATH = join(process.env.HOME, 'Code/empathy-ledger-v2/.env.local');
try {
  const elEnv = readFileSync(EL_ENV_PATH, 'utf8');
  for (const line of elEnv.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length > 0 && !process.env[`EL_${key}`]) {
      process.env[`EL_${key}`] = rest.join('=').trim();
    }
  }
} catch {}

const URL = process.env.EL_NEXT_PUBLIC_SUPABASE_URL || 'https://yvnuayzslukamizrlhwb.supabase.co';
const KEY = process.env.EL_SUPABASE_SERVICE_ROLE_KEY;

async function probe(path) {
  const r = await fetch(URL + '/rest/v1/' + path, {
    headers: { apikey: KEY, Authorization: 'Bearer ' + KEY }
  });
  return r.ok ? r.json() : { status: r.status, err: await r.text() };
}

// Try common table names
for (const tbl of ['storytellers', 'stories', 'profiles', 'users', 'people']) {
  const result = await probe(`${tbl}?select=*&limit=2`);
  if (Array.isArray(result)) {
    console.log(`\n=== ${tbl} ===`);
    if (result[0]) {
      console.log('cols:', Object.keys(result[0]).join(', '));
      console.log(JSON.stringify(result[0], null, 2).slice(0, 600));
    } else {
      console.log('(empty)');
    }
  } else {
    console.log(`\n=== ${tbl} === SKIP (${result.status})`);
  }
}
