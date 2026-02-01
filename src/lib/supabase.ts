import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Lazy initialization to avoid build-time errors when env vars are not available
let _supabase: SupabaseClient<Database> | null = null
let _supabaseAdmin: SupabaseClient<Database> | null = null

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined')
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined')
  return key
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    if (!_supabase) {
      _supabase = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop]
  }
})

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    if (!_supabaseAdmin) {
      const url = getSupabaseUrl()
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey()
      _supabaseAdmin = createClient<Database>(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabaseAdmin as any)[prop]
  }
})
