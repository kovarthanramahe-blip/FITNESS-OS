import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/hooks/useAuth'

/**
 * Gates the authenticated app behind sign-in — but only once cloud auth is
 * actually configured (`isSupabaseConfigured`). Without a .env.local (the
 * default for local development), this renders the protected routes
 * exactly as before Phase 7: no login wall, no behavior change. Once a
 * Fitness OS Supabase project is connected, unauthenticated visitors are
 * redirected to /login, which redirects back to where they came from
 * (`location.state.from`) once signed in.
 */
export function RequireAuth() {
  const { isAuthenticated, loading, isSupabaseConfigured } = useAuth()
  const location = useLocation()

  if (!isSupabaseConfigured) {
    return <Outlet />
  }

  if (loading) {
    return <LoadingState fullHeight />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
