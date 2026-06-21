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

// CivicGraph (GrantScope) shared-data instance.
//
// Dedicated client for CivicGraph-owned tables that act-global only consumes/co-writes
// (gs_entities, gs_relationships, acnc_*, foundations*, grant_opportunities, grant_applications).
// TODAY it resolves to the SAME box as `supabase` (CIVICGRAPH_* unset → fall back), so it is
// behaviourally a no-op. This decouples the *connection* ahead of the data move: when CivicGraph's
// estate moves to its own Supabase project, set CIVICGRAPH_SUPABASE_URL + CIVICGRAPH_SUPABASE_KEY
// and every grantscope-table query in this app repoints in one place — no query rewrites.
//
// env: CIVICGRAPH_SUPABASE_URL, CIVICGRAPH_SUPABASE_KEY (service-role; falls back to the app's own).
let _civicgraph: SupabaseClient | null = null

function getCivicGraph(): SupabaseClient {
  if (!_civicgraph) {
    const url = process.env.CIVICGRAPH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const key = process.env.CIVICGRAPH_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _civicgraph = createClient(url, key)
  }
  return _civicgraph
}

export const civicgraph = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getCivicGraph() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
