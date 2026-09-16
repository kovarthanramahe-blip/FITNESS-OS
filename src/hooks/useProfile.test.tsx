import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfile } from './useProfile'
import { useAuth } from '@/hooks/useAuth'
import { fetchProfile, updateProfile } from '@/lib/profileService'
import type { AuthContextValue } from '@/lib/authContext'

vi.mock('@/hooks/useAuth')
vi.mock('@/lib/profileService')

const mockedUseAuth = vi.mocked(useAuth)
const mockedFetchProfile = vi.mocked(fetchProfile)
const mockedUpdateProfile = vi.mocked(updateProfile)

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    loading: false,
    isAuthenticated: false,
    isSupabaseConfigured: true,
    error: null,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  }
}

const SIGNED_IN_USER = { id: 'u1', email: 'a@b.com', displayName: null, avatarUrl: null }

describe('useProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns no profile when signed out, and never fetches', () => {
    mockedUseAuth.mockReturnValue(authValue())
    const { result } = renderHook(() => useProfile())

    expect(result.current.profile).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(mockedFetchProfile).not.toHaveBeenCalled()
  })

  it('returns no profile when Supabase is not configured, even if signed in', () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true, isSupabaseConfigured: false }))
    const { result } = renderHook(() => useProfile())

    expect(result.current.profile).toBeNull()
    expect(mockedFetchProfile).not.toHaveBeenCalled()
  })

  it('fetches and returns the profile when signed in and configured', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValue({ id: 'u1', displayName: 'Ada', avatarUrl: null, email: 'a@b.com' })

    const { result } = renderHook(() => useProfile())
    expect(result.current.loading).toBe(true)

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toEqual({ id: 'u1', displayName: 'Ada', avatarUrl: null, email: 'a@b.com' })
    expect(mockedFetchProfile).toHaveBeenCalledWith('u1')
  })

  it('surfaces a friendly error and never the raw error message when the fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockRejectedValue(new Error('relation "profiles" does not exist'))

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.error ?? '').not.toContain('relation')
  })
})

describe('useProfile — updateDisplayName', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('successful update: calls profileService.updateProfile with the trimmed name and reflects it in `profile` immediately', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValue({ id: 'u1', displayName: 'Old Name', avatarUrl: null, email: 'a@b.com' })
    mockedUpdateProfile.mockResolvedValue({ id: 'u1', displayName: 'New Name', avatarUrl: null, email: 'a@b.com' })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile?.displayName).toBe('Old Name')

    let outcome: { success: boolean; error?: string } | undefined
    await act(async () => {
      outcome = await result.current.updateDisplayName('  New Name  ')
    })

    expect(mockedUpdateProfile).toHaveBeenCalledWith('u1', { displayName: 'New Name' })
    expect(outcome).toEqual({ success: true })
    expect(result.current.profile?.displayName).toBe('New Name')
    expect(result.current.isSaving).toBe(false)
  })

  it('rejects an empty/whitespace-only name locally without calling the server', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValue({ id: 'u1', displayName: 'Existing', avatarUrl: null, email: 'a@b.com' })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let outcome: { success: boolean; error?: string } | undefined
    await act(async () => {
      outcome = await result.current.updateDisplayName('   ')
    })

    expect(outcome?.success).toBe(false)
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
    expect(result.current.profile?.displayName).toBe('Existing')
  })

  it('failed update: returns a friendly error, never the raw one, and leaves `profile` at its last-known-good value', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValue({ id: 'u1', displayName: 'Existing', avatarUrl: null, email: 'a@b.com' })
    mockedUpdateProfile.mockRejectedValue({ code: '42501', message: 'new row violates row-level security policy' })

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let outcome: { success: boolean; error?: string } | undefined
    await act(async () => {
      outcome = await result.current.updateDisplayName('New Name')
    })

    expect(outcome?.success).toBe(false)
    expect(outcome?.error ?? '').not.toContain('row-level security')
    // A failed write must never silently appear to have succeeded locally.
    expect(result.current.profile?.displayName).toBe('Existing')
  })

  it('a save request in flight is reflected as isSaving, and cleared afterward either way', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValue({ id: 'u1', displayName: 'Existing', avatarUrl: null, email: 'a@b.com' })
    let resolveUpdate: (value: { id: string; displayName: string; avatarUrl: null; email: string }) => void = () => {}
    mockedUpdateProfile.mockReturnValue(new Promise((resolve) => (resolveUpdate = resolve)))

    const { result } = renderHook(() => useProfile())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let updatePromise!: Promise<{ success: boolean; error?: string }>
    act(() => {
      updatePromise = result.current.updateDisplayName('New Name')
    })
    await waitFor(() => expect(result.current.isSaving).toBe(true))

    await act(async () => {
      resolveUpdate({ id: 'u1', displayName: 'New Name', avatarUrl: null, email: 'a@b.com' })
      await updatePromise
    })

    expect(result.current.isSaving).toBe(false)
  })

  it('rejects immediately, without calling the server, when Supabase is not configured', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true, isSupabaseConfigured: false }))

    const { result } = renderHook(() => useProfile())

    let outcome: { success: boolean; error?: string } | undefined
    await act(async () => {
      outcome = await result.current.updateDisplayName('New Name')
    })

    expect(outcome?.success).toBe(false)
    expect(mockedUpdateProfile).not.toHaveBeenCalled()
  })

  it('persists across a fresh mount (simulating reload): a later fetch reflects the updated value', async () => {
    mockedUseAuth.mockReturnValue(authValue({ user: SIGNED_IN_USER, isAuthenticated: true }))
    mockedFetchProfile.mockResolvedValueOnce({ id: 'u1', displayName: 'Old Name', avatarUrl: null, email: 'a@b.com' })
    mockedUpdateProfile.mockResolvedValue({ id: 'u1', displayName: 'New Name', avatarUrl: null, email: 'a@b.com' })

    const first = renderHook(() => useProfile())
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    await act(async () => {
      await first.result.current.updateDisplayName('New Name')
    })
    first.unmount()

    // A fresh mount re-fetches from the server rather than reusing any cached state —
    // simulating a reload, where the persisted value must be exactly what was saved.
    mockedFetchProfile.mockResolvedValueOnce({ id: 'u1', displayName: 'New Name', avatarUrl: null, email: 'a@b.com' })
    const second = renderHook(() => useProfile())
    await waitFor(() => expect(second.result.current.loading).toBe(false))

    expect(second.result.current.profile?.displayName).toBe('New Name')
  })
})
