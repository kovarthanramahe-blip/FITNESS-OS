import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfile } from './useProfile'
import { useAuth } from '@/hooks/useAuth'
import { fetchProfile } from '@/lib/profileService'
import type { AuthContextValue } from '@/lib/authContext'

vi.mock('@/hooks/useAuth')
vi.mock('@/lib/profileService')

const mockedUseAuth = vi.mocked(useAuth)
const mockedFetchProfile = vi.mocked(fetchProfile)

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
