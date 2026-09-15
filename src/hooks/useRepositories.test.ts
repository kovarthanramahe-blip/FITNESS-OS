import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRepositories } from './useRepositories'
import { useAuth } from '@/hooks/useAuth'
import { localRepositories } from '@/lib/repositories/local'
import type { AuthContextValue } from '@/lib/authContext'

vi.mock('@/hooks/useAuth')
const mockedUseAuth = vi.mocked(useAuth)

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

describe('useRepositories', () => {
  it('returns the local repositories when signed out', () => {
    mockedUseAuth.mockReturnValue(authValue())
    const { result } = renderHook(() => useRepositories())
    expect(result.current).toBe(localRepositories)
  })

  it('returns the local repositories when Supabase is not configured', () => {
    mockedUseAuth.mockReturnValue(
      authValue({ isSupabaseConfigured: false, isAuthenticated: true, user: { id: 'u1', email: null, displayName: null, avatarUrl: null } }),
    )
    const { result } = renderHook(() => useRepositories())
    expect(result.current).toBe(localRepositories)
  })
})
