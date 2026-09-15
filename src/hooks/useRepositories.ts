import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getRepositories } from '@/lib/repositories'
import type { Repositories } from '@/lib/repositories'

/**
 * Returns the local repositories when signed out (or Supabase isn't
 * configured) and the cloud repositories once signed in — the same
 * boundary `getRepositories` exposes, kept in sync with live auth state.
 * Not wired into any page yet; see docs/SYNC_STRATEGY.md for the Phase 8
 * plan to actually read through this instead of the store hooks directly.
 */
export function useRepositories(): Repositories {
  const { user } = useAuth()
  return useMemo(() => getRepositories(user?.id ?? null), [user?.id])
}
