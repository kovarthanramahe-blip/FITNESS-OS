import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchProfile, type Profile } from '@/lib/profileService'

export interface UseProfileResult {
  profile: Profile | null
  loading: boolean
  /** User-friendly message only — never the raw Supabase/PostgREST error. */
  error: string | null
}

/**
 * Loads the signed-in user's cloud profile row. Signed out (or Supabase
 * not configured) simply means `profile` stays `null` — callers that want
 * to show *something* while this loads (or if it fails) should fall back
 * to `useAuth().user`, which already has a displayName/avatarUrl/email
 * from the OAuth session itself.
 */
export function useProfile(): UseProfileResult {
  const { user, isSupabaseConfigured } = useAuth()
  const [fetchedProfile, setFetchedProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enabled = Boolean(user) && isSupabaseConfigured

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return

    let active = true
    // oxlint-disable-next-line react/set-state-in-effect -- starting a genuinely new async fetch when `user`/`isSupabaseConfigured` changes, not mirroring a prop into state.
    setLoading(true)
    setError(null)

    fetchProfile(user.id)
      .then((result) => {
        if (active) setFetchedProfile(result)
      })
      .catch((caughtError: unknown) => {
        console.error('[Fitness OS] Failed to load profile:', caughtError)
        if (active) setError('We couldn’t load your profile. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [user, isSupabaseConfigured])

  // Derived, not reset via effect: signing out (or Supabase becoming
  // unconfigured) immediately reports "no profile" on the very next
  // render, without needing a synchronous setState-in-effect to clear it.
  return {
    profile: enabled ? fetchedProfile : null,
    loading: enabled && loading,
    error: enabled ? error : null,
  }
}
