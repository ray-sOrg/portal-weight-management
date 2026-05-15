import { createClient } from '@supabase/supabase-js'

const runtimeConfig =
  typeof window === 'undefined' ? undefined : window.__APP_CONFIG__

const supabaseUrl =
  runtimeConfig?.VITE_SUPABASE_URL ||
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)
const supabaseAnonKey =
  runtimeConfig?.VITE_SUPABASE_ANON_KEY ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
