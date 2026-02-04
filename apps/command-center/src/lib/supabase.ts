import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Command Center's own Supabase instance
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Empathy Ledger shared Supabase instance (for storyteller dashboard)
let _elSupabase: SupabaseClient | null = null

function getELSupabase(): SupabaseClient {
  if (!_elSupabase) {
    const url = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _elSupabase = createClient(url, key)
  }
  return _elSupabase
}

export const elSupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getELSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
