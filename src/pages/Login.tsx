import { motion } from 'framer-motion'
import { AlertCircle, Zap } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { scaleIn } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1C3.25 21.3 7.28 24 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.28 0 3.25 2.7 1.27 6.62l4 3.1C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  )
}

interface LocationState {
  from?: string
}

/**
 * The Fitness OS welcome/sign-in screen. When Supabase isn't configured
 * (local dev without a .env.local), the Google button still renders — it
 * simply reports a friendly "not configured" error on click rather than
 * silently failing — but route protection (see App.tsx) never forces a
 * visitor here in that case, so this page is mostly reachable once cloud
 * auth is actually turned on.
 */
export function Login() {
  const { signInWithGoogle, loading, isAuthenticated, isSupabaseConfigured, error, clearError } = useAuth()
  const location = useLocation()
  const [isSigningIn, setIsSigningIn] = useState(false)

  if (isAuthenticated) {
    const redirectTo = (location.state as LocationState | null)?.from ?? '/'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSignIn() {
    setIsSigningIn(true)
    await signInWithGoogle()
    setIsSigningIn(false)
  }

  const isBusy = loading || isSigningIn

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-bg px-4 py-10"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 2.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2.5rem)',
      }}
    >
      <motion.div variants={scaleIn} initial="hidden" animate="visible" className="w-full max-w-sm">
        <Card elevated padding="lg" className="flex flex-col items-center gap-6 text-center" animate={false}>
          <span className="flex size-14 items-center justify-center rounded-[var(--radius-md)] bg-accent text-text-inverse">
            <Zap className="size-7" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          </span>

          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">Fitness OS</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Track workouts, nutrition, habits and progress in one premium, motivating place.
            </p>
          </div>

          {!isSupabaseConfigured && (
            <p className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface-elevated px-3 py-2 text-xs text-text-muted">
              Cloud sign-in isn&rsquo;t configured for this environment yet.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="flex w-full items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger/10 px-3 py-2.5 text-left text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="flex-1">{error.message}</p>
              <button
                type="button"
                onClick={clearError}
                aria-label="Dismiss error"
                className="shrink-0 font-medium text-danger underline-offset-2 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-center gap-2.5"
            onClick={handleSignIn}
            isLoading={isBusy}
            leftIcon={<GoogleIcon className="size-4" />}
          >
            Continue with Google
          </Button>

          <p className="text-[11px] leading-relaxed text-text-muted">
            A personal fitness tracker — not medical advice.
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
