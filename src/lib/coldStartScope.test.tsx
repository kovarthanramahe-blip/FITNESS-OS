import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression coverage for the cold-start user-scope flash: on a fresh
 * app boot (or Android cold start), every domain store's module-level
 * `state` is loaded before React even renders, using whatever scope
 * `storageScope` reports at that instant — which is always `null` (guest)
 * until AuthProvider resolves the session. The fix makes AuthProvider
 * call `setCurrentUserId` synchronously in the same tick as `setSession`/
 * `setLoading(false)`, so every store's `onUserScopeChange` listener has
 * already reloaded the correct scope before the first render where
 * `loading` is false — these tests prove no render ever exposes the
 * wrong (guest/mock) data to an authenticated user.
 */

const SESSION = { user: { id: 'user-42', email: 'person@example.com', user_metadata: {} } }

function makeSupabaseMock() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: SESSION }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  }
}

beforeEach(() => {
  vi.resetModules()
})

describe('cold start: authenticated user never renders guest/demo data', () => {
  it('workoutStore never exposes mock history for any render once authenticated', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: makeSupabaseMock() }))

    const { AuthProvider } = await import('@/lib/AuthProvider')
    const { useAuth } = await import('@/hooks/useAuth')
    const { useWorkoutStore } = await import('@/lib/workoutStore')
    const { mockWorkoutHistory } = await import('@/data/mockWorkoutHistory')
    const { resetStorageScopeForTests } = await import('@/lib/storageScope')
    resetStorageScopeForTests()
    expect(mockWorkoutHistory.length).toBeGreaterThan(0)

    const renders: { loading: boolean; isAuthenticated: boolean; historyLength: number }[] = []
    function Consumer() {
      const auth = useAuth()
      const { history } = useWorkoutStore()
      renders.push({ loading: auth.loading, isAuthenticated: auth.isAuthenticated, historyLength: history.length })
      return null
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(renders.some((r) => !r.loading)).toBe(true))

    const authenticatedRenders = renders.filter((r) => r.isAuthenticated)
    expect(authenticatedRenders.length).toBeGreaterThan(0)
    for (const r of authenticatedRenders) {
      // A brand-new authenticated scope always starts empty — anything
      // non-zero here would mean the guest/mock data leaked into an
      // authenticated render, even briefly.
      expect(r.historyLength).toBe(0)
    }
  })

  it('setCurrentUserId (and therefore every store scope reload) has already run by the time loading first becomes false', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: makeSupabaseMock() }))

    const { AuthProvider } = await import('@/lib/AuthProvider')
    const { useAuth } = await import('@/hooks/useAuth')
    const { getCurrentUserId, onUserScopeChange, resetStorageScopeForTests } = await import('@/lib/storageScope')
    resetStorageScopeForTests()

    let loadingWhenScopeResolved: boolean | null = null
    const latestLoadingRef = { current: true }
    const unsubscribe = onUserScopeChange(() => {
      // Captured synchronously inside the listener — if this ever reads
      // `false`, the scope resolved AFTER loading had already flipped,
      // meaning a render could have already happened with the old scope.
      loadingWhenScopeResolved = latestLoadingRef.current
    })

    function Consumer() {
      const auth = useAuth()
      // oxlint-disable-next-line react/immutability -- deliberately capturing the render-time value synchronously, to prove ordering against the onUserScopeChange listener below; an effect would run too late for what this test checks.
      latestLoadingRef.current = auth.loading
      return null
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(getCurrentUserId()).toBe('user-42'))
    expect(loadingWhenScopeResolved).toBe(true)
    unsubscribe()
  })
})
