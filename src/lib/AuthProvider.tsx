import type { Session } from '@supabase/supabase-js'
import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app'
import { Browser as CapacitorBrowser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext, type AuthContextValue } from '@/lib/authContext'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { setCurrentUserId } from '@/lib/storageScope'
import type { AuthError, AuthUser } from '@/types/auth'

/**
 * Must exactly match a Redirect URL registered in the Supabase dashboard
 * (Authentication -> URL Configuration) and the intent-filter scheme in
 * android/app/src/main/AndroidManifest.xml — see docs/android-oauth-setup.md.
 */
const NATIVE_OAUTH_REDIRECT_URL = 'com.fitnessos.app://login-callback'

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
        const nextSession = data.session ?? null
        // Resolve the local storage scope BEFORE unblocking the UI (`setLoading(false)`):
        // every domain store's `onUserScopeChange` listener reloads its state from the
        // correctly-scoped key synchronously, in this same tick, so the first render of
        // the authenticated app never has a chance to read the wrong (guest/demo) scope.
        setCurrentUserId(mapSessionUser(nextSession)?.id ?? null)
        setSession(nextSession)
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
      setCurrentUserId(mapSessionUser(nextSession)?.id ?? null)
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
      // Native (Android/iOS): Google blocks its OAuth consent screen inside an
      // embedded WebView, so this must open in the system browser (Custom Tabs)
      // instead of navigating the app's own WebView. `skipBrowserRedirect`
      // stops supabase-js from doing that navigation itself; we open the
      // returned URL ourselves and pick the session back up in the
      // `appUrlOpen` listener below once the OS routes the deep-link
      // redirect back into the app.
      if (Capacitor.isNativePlatform()) {
        const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: NATIVE_OAUTH_REDIRECT_URL, skipBrowserRedirect: true },
        })
        if (oauthError || !data.url) {
          console.error('[Fitness OS] Google sign-in failed:', oauthError)
          setError({ reason: 'oauth_failed', message: 'Google sign-in failed to start. Please try again.' })
          return
        }
        await CapacitorBrowser.open({ url: data.url })
        return
      }

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

  useEffect(() => {
    if (!supabase || !Capacitor.isNativePlatform()) return
    const client = supabase

    // `exchangeCodeForSession` takes the PKCE `code` itself, not a URL —
    // see @supabase/auth-js's GoTrueClient.exchangeCodeForSession signature.
    // Shared by both ways the OAuth deep link can reach the app (see below).
    const processOAuthCallbackUrl = (url: string) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT_URL)) return
      const code = new URL(url).searchParams.get('code')
      void CapacitorBrowser.close()
      if (!code) return
      client.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (exchangeError) {
          console.error('[Fitness OS] Failed to complete Google sign-in:', exchangeError)
          setError({ reason: 'oauth_failed', message: 'Google sign-in didn’t complete. Please try again.' })
        }
        // On success, this resolves through the same onAuthStateChange
        // subscription above — no separate state update needed here.
      })
    }

    // Warm/backgrounded app: Android delivers the deep link via onNewIntent
    // to the already-running bridge, which Capacitor surfaces as this event.
    const handleUrlOpen = (event: URLOpenListenerEvent) => processOAuthCallbackUrl(event.url)
    const listenerPromise = CapacitorApp.addListener('appUrlOpen', handleUrlOpen)

    // Cold start: if the OS killed the app while the user was completing
    // sign-in in the Custom Tab, the deep link instead *launches* a fresh
    // process — `appUrlOpen` never fires for the URL that started it, since
    // no listener existed yet at that instant. `getLaunchUrl` is Capacitor's
    // own API for recovering exactly that URL once the bridge is back up.
    void CapacitorApp.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) processOAuthCallbackUrl(launchUrl.url)
    })

    return () => {
      void listenerPromise.then((handle) => handle.remove())
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const user = useMemo(() => mapSessionUser(session), [session])

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
