import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { fetchProfile, updateProfile, type Profile } from '@/lib/profileService'

export interface UpdateProfileResult {
  success: boolean
  /** User-friendly message only — never the raw Supabase/PostgREST error. */
  error?: string
}

export interface UseProfileResult {
  profile: Profile | null
  loading: boolean
  /** User-friendly message only — never the raw Supabase/PostgREST error. */
  error: string | null
  /** True only while a display-name save request is in flight. */
  isSaving: boolean
  /** Persists a new display name and, on success, updates `profile` immediately. */
  updateDisplayName: (displayName: string) => Promise<UpdateProfileResult>
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
  const [isSaving, setIsSaving] = useState(false)

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

  const updateDisplayName = useCallback(
    async (displayName: string): Promise<UpdateProfileResult> => {
      const trimmed = displayName.trim()
      if (!trimmed) return { success: false, error: 'Please enter a name.' }
      if (!user || !isSupabaseConfigured) {
        return { success: false, error: 'Cloud sign-in isn’t configured for this environment.' }
      }

      setIsSaving(true)
      try {
        const updated = await updateProfile(user.id, { displayName: trimmed })
        setFetchedProfile(updated)
        return { success: true }
      } catch (caughtError: unknown) {
        console.error('[Fitness OS] Failed to update profile:', caughtError)
        return { success: false, error: 'We couldn’t save your name. Please try again.' }
      } finally {
        setIsSaving(false)
      }
    },
    [user, isSupabaseConfigured],
  )

  // Derived, not reset via effect: signing out (or Supabase becoming
  // unconfigured) immediately reports "no profile" on the very next
  // render, without needing a synchronous setState-in-effect to clear it.
  return {
    profile: enabled ? fetchedProfile : null,
    loading: enabled && loading,
    error: enabled ? error : null,
    isSaving: enabled && isSaving,
    updateDisplayName,
  }
}
