import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountSection } from './AccountSection'
import { useAuth } from '@/hooks/useAuth'
import { useProfile, type UseProfileResult } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import type { AuthContextValue } from '@/lib/authContext'
import { resetGamificationStoreForTests } from '@/lib/gamificationStore'

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

function profileValue(overrides: Partial<UseProfileResult> = {}): UseProfileResult {
  return {
    profile: null,
    loading: false,
    error: null,
    isSaving: false,
    updateDisplayName: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  }
}

describe('AccountSection', () => {
  beforeEach(() => {
    resetGamificationStoreForTests()
  })

  it('shows a not-configured message when Supabase is not configured', () => {
    mockedUseAuth.mockReturnValue(authValue({ isSupabaseConfigured: false }))
    mockedUseProfile.mockReturnValue(profileValue())
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    render(<AccountSection />)
    expect(screen.getByText(/isn.t configured/i)).toBeInTheDocument()
  })

  it('shows a sign-in prompt when signed out', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue(authValue({ signInWithGoogle }))
    mockedUseProfile.mockReturnValue(profileValue())
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
    mockedUseProfile.mockReturnValue(profileValue())
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
    mockedUseProfile.mockReturnValue(
      profileValue({ profile: { id: 'u1', displayName: 'Profile Name', avatarUrl: null, email: 'profile@example.com' } }),
    )
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    render(<AccountSection />)
    expect(screen.getByText('Profile Name')).toBeInTheDocument()
    expect(screen.getByText('profile@example.com')).toBeInTheDocument()
  })

  it('shows the real current level rather than a fixed number', () => {
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada', avatarUrl: null } }),
    )
    mockedUseProfile.mockReturnValue(profileValue())
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    render(<AccountSection />)
    expect(screen.getByText(/^Level 1 ·/)).toBeInTheDocument()
  })

  it('edits and saves a new display name', async () => {
    const updateDisplayName = vi.fn().mockResolvedValue({ success: true })
    const showToast = vi.fn()
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null } }),
    )
    mockedUseProfile.mockReturnValue(profileValue({ updateDisplayName }))
    mockedUseToast.mockReturnValue({ showToast })

    const user = userEvent.setup()
    render(<AccountSection />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByLabelText('Display name')
    await user.clear(input)
    await user.type(input, 'New Name')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(updateDisplayName).toHaveBeenCalledWith('New Name')
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile updated' }))
  })

  it('shows an error and stays in edit mode when saving fails', async () => {
    const updateDisplayName = vi.fn().mockResolvedValue({ success: false, error: 'We couldn’t save your name. Please try again.' })
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null } }),
    )
    mockedUseProfile.mockReturnValue(profileValue({ updateDisplayName }))
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    const user = userEvent.setup()
    render(<AccountSection />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    expect(await screen.findByText(/couldn.t save your name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument()
  })

  it('discards the draft when Cancel is clicked', async () => {
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null } }),
    )
    mockedUseProfile.mockReturnValue(profileValue())
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    const user = userEvent.setup()
    render(<AccountSection />)

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByLabelText('Display name')).not.toBeInTheDocument()
  })

  it('disables Save Changes while a save request is in flight', async () => {
    mockedUseAuth.mockReturnValue(
      authValue({ isAuthenticated: true, user: { id: 'u1', email: 'ada@example.com', displayName: 'Ada Lovelace', avatarUrl: null } }),
    )
    mockedUseProfile.mockReturnValue(profileValue({ isSaving: true }))
    mockedUseToast.mockReturnValue({ showToast: vi.fn() })

    const user = userEvent.setup()
    render(<AccountSection />)
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled()
  })
})
