import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Login } from './Login'
import { useAuth } from '@/hooks/useAuth'
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

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Login', () => {
  it('renders Fitness OS branding and a Continue with Google button', () => {
    mockedUseAuth.mockReturnValue(authValue())
    renderLogin()

    expect(screen.getByRole('heading', { name: 'Fitness OS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('shows a not-configured hint when Supabase is not configured', () => {
    mockedUseAuth.mockReturnValue(authValue({ isSupabaseConfigured: false }))
    renderLogin()

    expect(screen.getByText(/isn.t configured/i)).toBeInTheDocument()
  })

  it('calls signInWithGoogle when the button is clicked', async () => {
    const signInWithGoogle = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue(authValue({ signInWithGoogle }))
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /continue with google/i }))
    expect(signInWithGoogle).toHaveBeenCalledOnce()
  })

  it('shows a loading state on the button while signing in', async () => {
    mockedUseAuth.mockReturnValue(authValue({ loading: true }))
    renderLogin()

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeDisabled()
  })

  it('shows the error message and lets the user dismiss it', async () => {
    const clearError = vi.fn()
    mockedUseAuth.mockReturnValue(
      authValue({ error: { reason: 'oauth_failed', message: 'Google sign-in failed to start. Please try again.' }, clearError }),
    )
    const user = userEvent.setup()
    renderLogin()

    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in failed to start')
    await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(clearError).toHaveBeenCalledOnce()
  })

  it('redirects away from /login when already authenticated', () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true }))
    renderLogin()

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Fitness OS' })).not.toBeInTheDocument()
  })
})
