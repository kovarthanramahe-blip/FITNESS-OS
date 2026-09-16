import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * The ONE place a Supabase client is ever created. Every other module that
 * needs Supabase imports `supabase` from here — never call `createClient`
 * anywhere else in the app.
 *
 * Fitness OS is local-first: when these env vars are absent (the default
 * for local development without a .env.local), `supabase` is `null` and
 * `isSupabaseConfigured` is `false`. Callers must check
 * `isSupabaseConfigured` (or handle a null client) rather than assuming
 * Supabase is always available — see useAuth/AuthProvider for the pattern.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE (not this library's default, which is implicit) returns a
        // `?code=` query param instead of tokens in a URL fragment — the
        // Android OAuth deep-link return can lose a fragment, but not a
        // query param. `detectSessionInUrl` already exchanges it
        // automatically on web, so this is safe for both platforms.
        flowType: 'pkce',
      },
    })
  : null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.info(
    '[Fitness OS] Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing). ' +
      'Running in local-only mode: Google sign-in and cloud sync are disabled, and all existing local stores work as before. ' +
      'See .env.example to connect a Fitness OS Supabase project.',
  )
}
