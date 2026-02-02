import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.SUPABASE_SHARED_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SHARED_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as Record<string | symbol, unknown>)[prop]
  },
})
