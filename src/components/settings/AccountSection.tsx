import { LogOut, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'

/**
 * The Settings page's cloud-account section. Three distinct states —
 * not configured, signed out, signed in — each shown with the same
 * design language as the rest of Settings.
 */
export function AccountSection() {
  const { user, isAuthenticated, isSupabaseConfigured, loading, signInWithGoogle, signOut } = useAuth()
  const { profile } = useProfile()
  const { showToast } = useToast()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignIn() {
    setIsSigningIn(true)
    await signInWithGoogle()
    setIsSigningIn(false)
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    await signOut()
    setIsSigningOut(false)
    showToast({ title: 'Signed out', variant: 'info' })
  }

  if (!isSupabaseConfigured) {
    return (
      <Card padding="lg">
        <CardTitle>Cloud Account</CardTitle>
        <CardDescription className="mt-1">
          Cloud sign-in isn&rsquo;t configured for this environment yet. Fitness OS keeps working locally on this device.
        </CardDescription>
      </Card>
    )
  }

  if (!isAuthenticated) {
    return (
      <Card padding="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <CardTitle>Cloud Account</CardTitle>
          <CardDescription className="mt-1">Sign in to back up your data to the cloud.</CardDescription>
        </div>
        <Button variant="secondary" onClick={handleSignIn} isLoading={isSigningIn || loading}>
          Sign in with Google
        </Button>
      </Card>
    )
  }

  const displayName = profile?.displayName ?? user?.displayName ?? user?.email ?? 'Fitness OS user'
  const avatarUrl = profile?.avatarUrl ?? user?.avatarUrl ?? undefined
  const email = profile?.email ?? user?.email ?? undefined

  return (
    <Card padding="lg" className="flex flex-wrap items-center gap-4">
      <Avatar name={displayName} src={avatarUrl} size="xl" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-text-primary">{displayName}</p>
        {email && <p className="truncate text-sm text-text-secondary">{email}</p>}
        <Badge variant="success" className="mt-2">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Signed in
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        leftIcon={<LogOut className="size-4" />}
        onClick={handleSignOut}
        isLoading={isSigningOut}
      >
        Sign Out
      </Button>
    </Card>
  )
}
