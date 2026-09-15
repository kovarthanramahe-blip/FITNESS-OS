import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountSection } from './AccountSection'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import type { AuthContextValue } from '@/lib/authContext'

vi.mock('@/hooks/useAuth')
vi.mock('@/hooks/useProfile')
vi.mock('@/hooks/useToast')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseProfile = vi.mocked(useProfile)
const mockedUseToast = vi.mocked(useToast)

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

describe('AccountSection', () => {
  it('shows a not-configured message when Supabase is not configured', () => {
    mockedUseAuth.mockReturnValue(authValue({ isSupabaseConfigured: false }))
    mockedUseProfile.mockReturnValue({ profile: null, loading: false, error: null })
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    render(<AccountSection />)
    expect(screen.getByText(/isn.t configured/i)).toBeInTheDocument()
  })

  it('shows a sign-in prompt when signed out', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue(authValue({ signInWithGoogle }))
    mockedUseProfile.mockReturnValue({ profile: null, loading: false, error: null })
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    const user = userEvent.setup()
    render(<AccountSection />)
    await user.click(screen.getByRole('button', { name: /sign in with google/i }))
    expect(signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('shows avatar, name, email and a working Sign Out when authenticated', async () => {
    const signOut = vi.fn().mockResolvedValue(undefined)
    const showToast = vi.fn()
    mockedUseAuth.mockReturnValue(
      authValue({
        isAuthenticated: true,
        user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null },
        signOut,
      }),
    )
    mockedUseProfile.mockReturnValue({ profile: null, loading: false, error: null })
    mockedUseToast.mockReturnValue({ showToast })

    const user = userEvent.setup()
    render(<AccountSection />)

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.getByText('ada@example.com')).toBeInTheDocument()
    expect(screen.getByText('Signed in')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(signOut).toHaveBeenCalledOnce()
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Signed out' }))
  })

  it('prefers the cloud profile over the auth session fields when both exist', () => {
    mockedUseAuth.mockReturnValue(
      authValue({
        isAuthenticated: true,
        user: { id: 'u1', email: 'session@example.com', displayName: 'Session Name', avatarUrl: null },
      }),
    )
    mockedUseProfile.mockReturnValue({
      profile: { id: 'u1', displayName: 'Profile Name', avatarUrl: null, email: 'profile@example.com' },
      loading: false,
      error: null,
    })
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    render(<AccountSection />)
    expect(screen.getByText('Profile Name')).toBeInTheDocument()
    expect(screen.getByText('profile@example.com')).toBeInTheDocument()
  })
})
