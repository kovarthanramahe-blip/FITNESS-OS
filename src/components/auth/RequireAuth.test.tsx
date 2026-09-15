import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from './RequireAuth'
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Protected Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renders protected content with no login wall when Supabase is not configured', () => {
    mockedUseAuth.mockReturnValue(authValue({ isSupabaseConfigured: false, isAuthenticated: false }))
    renderAt('/')
    expect(screen.getByText('Protected Home')).toBeInTheDocument()
  })

  it('does not render protected content while auth is still resolving', () => {
    mockedUseAuth.mockReturnValue(authValue({ loading: true }))
    renderAt('/')
    expect(screen.queryByText('Protected Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated and Supabase is configured', () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: false }))
    renderAt('/')
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Home')).not.toBeInTheDocument()
  })

  it('renders protected content once authenticated', () => {
    mockedUseAuth.mockReturnValue(authValue({ isAuthenticated: true }))
    renderAt('/')
    expect(screen.getByText('Protected Home')).toBeInTheDocument()
  })
})
