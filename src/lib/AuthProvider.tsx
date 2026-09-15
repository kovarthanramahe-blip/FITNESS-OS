import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { setCurrentUserId } from '@/lib/storageScope'
import type { AuthError, AuthUser } from '@/types/auth'

function mapSessionUser(session: Session | null): AuthUser | null {
  const user = session?.user
  if (!user) return null

  const metadata = user.user_metadata ?? {}
  const displayName = (metadata['full_name'] as string | undefined) ?? (metadata['name'] as string | undefined) ?? null
  const avatarUrl = (metadata['avatar_url'] as string | undefined) ?? null

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    avatarUrl,
  }
}

const NOT_CONFIGURED_ERROR: AuthError = {
  reason: 'not_configured',
  message: 'Cloud sign-in isn’t configured for this environment yet. Fitness OS keeps working locally.',
}

/**
 * Owns the single Supabase auth subscription for the whole app. Wrap the
 * app once (see main.tsx) and read auth state anywhere via `useAuth()` —
 * never subscribe to `supabase.auth.onAuthStateChange` a second time
 * elsewhere.
 *
 * When Supabase isn't configured (`isSupabaseConfigured` is false — the
 * default for local development without a .env.local), this simply
 * reports `loading: false`, `isAuthenticated: false` and leaves every
 * existing local store untouched. Nothing here can break local-only usage.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<AuthError | null>(null)

  useEffect(() => {
    if (!supabase) {
      // `loading` already initializes to `isSupabaseConfigured` (false here), so there's nothing to synchronize.
      return
    }

    let active = true

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return
        if (sessionError) {
          console.error('[Fitness OS] Failed to restore Supabase session:', sessionError)
          setError({ reason: 'session_expired', message: 'Your session could not be restored. Please sign in again.' })
        }
        setSession(data.session ?? null)
        setLoading(false)
      })
      .catch((caughtError: unknown) => {
        if (!active) return
        console.error('[Fitness OS] Network error while restoring Supabase session:', caughtError)
        setError({ reason: 'network_error', message: 'Could not reach the sign-in service. Check your connection and try again.' })
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) {
      setError(NOT_CONFIGURED_ERROR)
      return
    }
    setError(null)
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      })
      if (oauthError) {
        console.error('[Fitness OS] Google sign-in failed:', oauthError)
        setError({ reason: 'oauth_failed', message: 'Google sign-in failed to start. Please try again.' })
      }
    } catch (caughtError) {
      console.error('[Fitness OS] Network error during Google sign-in:', caughtError)
      setError({ reason: 'network_error', message: 'Could not reach the sign-in service. Check your connection and try again.' })
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    setError(null)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) {
        console.error('[Fitness OS] Sign out failed:', signOutError)
        setError({ reason: 'sign_out_failed', message: 'Sign out didn’t complete. Please try again.' })
      }
    } catch (caughtError) {
      console.error('[Fitness OS] Network error during sign out:', caughtError)
      setError({ reason: 'network_error', message: 'Could not reach the sign-in service. Check your connection and try again.' })
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const user = useMemo(() => mapSessionUser(session), [session])

  useEffect(() => {
    if (loading) return
    setCurrentUserId(user?.id ?? null)
  }, [user, loading])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: user !== null,
      isSupabaseConfigured,
      error,
      signInWithGoogle,
      signOut,
      clearError,
    }),
    [user, session, loading, error, signInWithGoogle, signOut, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
