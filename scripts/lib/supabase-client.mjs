/**
 * Supabase Client Singleton
 *
 * Centralised Supabase client factory for all scripts.
 * Replaces 142+ copy-paste initialisations with a single source of truth.
 *
 * Usage:
 *   import { getSupabase } from './lib/supabase-client.mjs';
 *   const supabase = getSupabase();
 *
 *   // Or with explicit env prefix (for Empathy Ledger shared DB):
 *   const elSupabase = getSupabase({ prefix: 'EL_' });
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env once on first import
const envPath = join(__dirname, '../../.env.local');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/** @type {Map<string, import('@supabase/supabase-js').SupabaseClient>} */
const _instances = new Map();

/**
 * Resolve the Supabase URL from environment variables.
 * Priority: SUPABASE_SHARED_URL > SUPABASE_URL > NEXT_PUBLIC_SUPABASE_URL
 *
 * @param {string} [prefix] - Optional env var prefix (e.g. 'EL_')
 * @returns {string}
 */
function resolveUrl(prefix = '') {
  return (
    process.env[`${prefix}SUPABASE_SHARED_URL`] ||
    process.env[`${prefix}SUPABASE_URL`] ||
    process.env[`${prefix}NEXT_PUBLIC_SUPABASE_URL`] ||
    process.env.SUPABASE_SHARED_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
}

/**
 * Resolve the Supabase service role key from environment variables.
 * Priority: SUPABASE_SHARED_SERVICE_ROLE_KEY > SUPABASE_SERVICE_ROLE_KEY
 *
 * @param {string} [prefix] - Optional env var prefix (e.g. 'EL_')
 * @returns {string}
 */
function resolveKey(prefix = '') {
  return (
    process.env[`${prefix}SUPABASE_SHARED_SERVICE_ROLE_KEY`] ||
    process.env[`${prefix}SUPABASE_SERVICE_ROLE_KEY`] ||
    process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Get a Supabase client instance. Returns a cached singleton per prefix.
 *
 * @param {object} [options]
 * @param {string} [options.prefix] - Env var prefix for multi-instance setups (e.g. 'EL_')
 * @param {boolean} [options.required] - If true, throws when credentials are missing (default: true)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase(options = {}) {
  const { prefix = '', required = true } = options;
  const cacheKey = prefix || '_default';

  if (_instances.has(cacheKey)) {
    return _instances.get(cacheKey);
  }

  const url = resolveUrl(prefix);
  const key = resolveKey(prefix);

  if (!url || !key) {
    if (required) {
      const checked = prefix
        ? `${prefix}SUPABASE_* or SUPABASE_SHARED_*`
        : 'SUPABASE_SHARED_URL / SUPABASE_SERVICE_ROLE_KEY';
      throw new Error(`Missing Supabase credentials. Checked: ${checked}`);
    }
    return null;
  }

  const client = createClient(url, key);
  _instances.set(cacheKey, client);
  return client;
}

/**
 * Get a Supabase client or null if credentials are missing.
 * Useful for scripts that can run without a database connection.
 *
 * @param {object} [options]
 * @param {string} [options.prefix] - Env var prefix
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
export function getSupabaseOptional(options = {}) {
  return getSupabase({ ...options, required: false });
}

export default { getSupabase, getSupabaseOptional };
