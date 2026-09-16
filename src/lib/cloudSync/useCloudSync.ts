import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { hydrateFromCloud } from '@/lib/cloudSync/hydrate'

/**
 * Mounted once in AppLayout (the authenticated app shell). Runs
 * `hydrateFromCloud` exactly once per sign-in — on first load with an
 * already-active session (reload persistence), on a fresh sign-in, and
 * again on the next sign-in after a sign-out (even the same user), so a
 * long-lived tab still picks up data from another device the next time
 * it re-authenticates. Never runs while `loading` is true or without a
 * configured Supabase project — those cases have no cloud to hydrate from.
 */
export function useCloudSync(): void {
  const { user, isAuthenticated, isSupabaseConfigured, loading } = useAuth()
  const hydratedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      hydratedUserIdRef.current = null
      return
    }
    if (loading || !isSupabaseConfigured || !user) return
    if (hydratedUserIdRef.current === user.id) return

    hydratedUserIdRef.current = user.id
    void hydrateFromCloud(user.id)
  }, [user, isAuthenticated, isSupabaseConfigured, loading])
}
