import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeSession(overrides: Partial<{ id: string; email: string; metadata: Record<string, unknown> }> = {}) {
  return {
    user: {
      id: overrides.id ?? 'user-1',
      email: overrides.email ?? 'user@example.com',
      user_metadata: overrides.metadata ?? { full_name: 'Ada Lovelace', avatar_url: 'https://example.com/a.png' },
    },
  }
}

async function loadAuth() {
  const { AuthProvider } = await import('@/lib/AuthProvider')
  const { useAuth } = await import('@/hooks/useAuth')

  function TestConsumer() {
    const auth = useAuth()
    return (
      <div>
        <p data-testid="loading">{String(auth.loading)}</p>
        <p data-testid="authenticated">{String(auth.isAuthenticated)}</p>
        <p data-testid="configured">{String(auth.isSupabaseConfigured)}</p>
        <p data-testid="error">{auth.error?.message ?? ''}</p>
        <p data-testid="error-reason">{auth.error?.reason ?? ''}</p>
        <p data-testid="email">{auth.user?.email ?? ''}</p>
        <p data-testid="displayName">{auth.user?.displayName ?? ''}</p>
        <button onClick={() => auth.signInWithGoogle()}>sign in</button>
        <button onClick={() => auth.signOut()}>sign out</button>
        <button onClick={() => auth.clearError()}>clear error</button>
      </div>
    )
  }

  return { AuthProvider, TestConsumer }
}

beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

describe('AuthProvider — Supabase not configured', () => {
  it('reports loading=false and isAuthenticated=false immediately', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }))
    const { AuthProvider, TestConsumer } = await loadAuth()

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('configured')).toHaveTextContent('false')
  })

  it('signInWithGoogle reports a friendly not_configured error instead of crashing', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }))
    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await user.click(screen.getByText('sign in'))

    expect(screen.getByTestId('error-reason')).toHaveTextContent('not_configured')
    expect(screen.getByTestId('error')).not.toHaveTextContent('')
  })

  it('signOut is a safe no-op', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }))
    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await user.click(screen.getByText('sign out'))

    expect(screen.getByTestId('error')).toHaveTextContent('')
  })
})

describe('AuthProvider — Supabase configured', () => {
  function makeSupabaseMock() {
    let authStateCallback: ((event: string, session: unknown) => void) | null = null
    const unsubscribe = vi.fn()

    const mock = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
          authStateCallback = callback
          return { data: { subscription: { unsubscribe } } }
        }),
        signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }

    return {
      mock,
      unsubscribe,
      emitAuthChange: (session: unknown) => authStateCallback?.('SIGNED_IN', session),
    }
  }

  it('restores an existing session on load and maps the user', async () => {
    const { mock } = makeSupabaseMock()
    mock.auth.getSession.mockResolvedValue({ data: { session: makeSession() }, error: null })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('email')).toHaveTextContent('user@example.com')
    expect(screen.getByTestId('displayName')).toHaveTextContent('Ada Lovelace')
  })

  it('reports unauthenticated once getSession resolves with no session', async () => {
    const { mock } = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
  })

  it('updates state when the auth state change listener fires', async () => {
    const { mock, emitAuthChange } = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')

    emitAuthChange(makeSession({ email: 'new@example.com' }))

    await waitFor(() => expect(screen.getByTestId('authenticated')).toHaveTextContent('true'))
    expect(screen.getByTestId('email')).toHaveTextContent('new@example.com')
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    const { mock, unsubscribe } = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('invokes signInWithOAuth with the google provider and the current origin as redirect', async () => {
    const { mock } = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign in'))

    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  })

  it('surfaces a friendly error when Google sign-in fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mock } = makeSupabaseMock()
    mock.auth.signInWithOAuth.mockResolvedValue({ error: { message: 'raw backend detail' } })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign in'))

    await waitFor(() => expect(screen.getByTestId('error-reason')).toHaveTextContent('oauth_failed'))
    expect(screen.getByTestId('error')).not.toHaveTextContent('raw backend detail')
  })

  it('surfaces a network_error when signInWithOAuth throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mock } = makeSupabaseMock()
    mock.auth.signInWithOAuth.mockRejectedValue(new Error('offline'))
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign in'))

    await waitFor(() => expect(screen.getByTestId('error-reason')).toHaveTextContent('network_error'))
  })

  it('calls signOut and surfaces a friendly error on failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mock } = makeSupabaseMock()
    mock.auth.signOut.mockResolvedValue({ error: { message: 'raw backend detail' } })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign out'))

    expect(mock.auth.signOut).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.getByTestId('error-reason')).toHaveTextContent('sign_out_failed'))
    expect(screen.getByTestId('error')).not.toHaveTextContent('raw backend detail')
  })

  it('surfaces a session_expired error without crashing when getSession returns an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mock } = makeSupabaseMock()
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: { message: 'jwt expired' } })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('error-reason')).toHaveTextContent('session_expired'))
    expect(screen.getByTestId('error')).not.toHaveTextContent('jwt expired')
  })

  it('clearError resets the error state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { mock } = makeSupabaseMock()
    mock.auth.signInWithOAuth.mockResolvedValue({ error: { message: 'x' } })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await user.click(screen.getByText('sign in'))
    await waitFor(() => expect(screen.getByTestId('error')).not.toHaveTextContent(''))

    await user.click(screen.getByText('clear error'))
    expect(screen.getByTestId('error')).toHaveTextContent('')
  })
})

describe('AuthProvider — native (Android) OAuth', () => {
  function makeSupabaseMock() {
    const unsubscribe = vi.fn()
    return {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
        signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2/auth?...' }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      },
    }
  }

  function mockCapacitorNative() {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
  }

  function mockBrowser() {
    const open = vi.fn().mockResolvedValue(undefined)
    const close = vi.fn().mockResolvedValue(undefined)
    vi.doMock('@capacitor/browser', () => ({ Browser: { open, close } }))
    return { open, close }
  }

  function mockApp(launchUrl?: string) {
    let urlOpenHandler: ((event: { url: string }) => void) | null = null
    const remove = vi.fn().mockResolvedValue(undefined)
    const getLaunchUrl = vi.fn().mockResolvedValue(launchUrl ? { url: launchUrl } : undefined)
    vi.doMock('@capacitor/app', () => ({
      App: {
        addListener: vi.fn((eventName: string, handler: (event: { url: string }) => void) => {
          if (eventName === 'appUrlOpen') urlOpenHandler = handler
          return Promise.resolve({ remove })
        }),
        getLaunchUrl,
      },
    }))
    return { fireUrlOpen: (url: string) => urlOpenHandler?.({ url }), remove, getLaunchUrl }
  }

  it('opens the system browser instead of navigating the WebView, with skipBrowserRedirect and the native redirect URL', async () => {
    mockCapacitorNative()
    const { open } = mockBrowser()
    mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign in'))

    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'com.fitnessos.app://login-callback', skipBrowserRedirect: true },
    })
    expect(open).toHaveBeenCalledWith({ url: 'https://accounts.google.com/o/oauth2/auth?...' })
  })

  it('exchanges the code for a session and closes the browser when the OAuth deep link returns', async () => {
    mockCapacitorNative()
    const { close } = mockBrowser()
    const { fireUrlOpen } = mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireUrlOpen('com.fitnessos.app://login-callback?code=abc123')

    await waitFor(() => expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123'))
    expect(close).toHaveBeenCalled()
  })

  it('cold start: exchanges the code from getLaunchUrl when the OAuth deep link launched a fresh process (appUrlOpen never fires in this case)', async () => {
    mockCapacitorNative()
    const { close } = mockBrowser()
    mockApp('com.fitnessos.app://login-callback?code=cold-start-code')
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await waitFor(() => expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('cold-start-code'))
    expect(close).toHaveBeenCalled()
  })

  it('cold start: checks getLaunchUrl on every native mount', async () => {
    mockCapacitorNative()
    mockBrowser()
    const { getLaunchUrl } = mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await waitFor(() => expect(getLaunchUrl).toHaveBeenCalled())
  })

  it('cold start: a launch URL unrelated to the OAuth callback is ignored', async () => {
    mockCapacitorNative()
    mockBrowser()
    mockApp('com.fitnessos.app://some-other-path')
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('cold start: no launch URL at all (a normal, non-OAuth app launch) never calls exchangeCodeForSession', async () => {
    mockCapacitorNative()
    mockBrowser()
    mockApp(undefined)
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('ignores a deep link that does not match the OAuth callback URL', async () => {
    mockCapacitorNative()
    mockBrowser()
    const { fireUrlOpen } = mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireUrlOpen('com.fitnessos.app://some-other-path')

    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('surfaces a friendly error, never the raw one, when the code exchange fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockCapacitorNative()
    mockBrowser()
    const { fireUrlOpen } = mockApp()
    const mock = makeSupabaseMock()
    mock.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: 'invalid grant: raw detail' } })
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    fireUrlOpen('com.fitnessos.app://login-callback?code=bad-code')

    await waitFor(() => expect(screen.getByTestId('error-reason')).toHaveTextContent('oauth_failed'))
    expect(screen.getByTestId('error')).not.toHaveTextContent('raw detail')
  })

  it('removes the appUrlOpen listener on unmount', async () => {
    mockCapacitorNative()
    mockBrowser()
    const { remove } = mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    unmount()
    await waitFor(() => expect(remove).toHaveBeenCalled())
  })

  it('never registers native OAuth handling on web (Capacitor.isNativePlatform() is false)', async () => {
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))
    const { open } = mockBrowser()
    mockApp()
    const mock = makeSupabaseMock()
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: mock }))

    const { AuthProvider, TestConsumer } = await loadAuth()
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    await user.click(screen.getByText('sign in'))

    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    expect(open).not.toHaveBeenCalled()
  })
})
