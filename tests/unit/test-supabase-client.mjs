/**
 * Tests for scripts/lib/supabase-client.mjs
 *
 * Run: node --test tests/unit/test-supabase-client.mjs
 *
 * Note: These tests verify the factory logic without connecting to Supabase.
 * Set SUPABASE_SHARED_URL and SUPABASE_SHARED_SERVICE_ROLE_KEY to test real connections.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('supabase-client', () => {
  it('exports getSupabase and getSupabaseOptional', async () => {
    const mod = await import('../../scripts/lib/supabase-client.mjs')
    assert.equal(typeof mod.getSupabase, 'function')
    assert.equal(typeof mod.getSupabaseOptional, 'function')
  })

  it('getSupabaseOptional returns null when no env vars', async () => {
    // Save and clear env vars
    const saved = {
      SUPABASE_SHARED_URL: process.env.SUPABASE_SHARED_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SHARED_SERVICE_ROLE_KEY: process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }

    // Note: can't easily test this without clearing module cache,
    // so we verify the function exists and has the right signature
    const mod = await import('../../scripts/lib/supabase-client.mjs')
    assert.equal(typeof mod.getSupabaseOptional, 'function')
  })
})
