import { LogOut, Pencil, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useToast } from '@/hooks/useToast'
import { getGamificationStats, useGamificationStore } from '@/lib/gamificationStore'

/**
 * The Settings page's cloud-account section. Three distinct states —
 * not configured, signed out, signed in — each shown with the same
 * design language as the rest of Settings.
 */
export function AccountSection() {
  const { user, isAuthenticated, isSupabaseConfigured, loading, signInWithGoogle, signOut } = useAuth()
  const { profile, isSaving, updateDisplayName } = useProfile()
  const { showToast } = useToast()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  useGamificationStore()
  const { profile: gamificationProfile, levelTitle } = getGamificationStats()

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

  function startEditing(currentName: string) {
    setNameDraft(currentName)
    setSaveError(null)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setSaveError(null)
  }

  async function handleSaveName() {
    setSaveError(null)
    const result = await updateDisplayName(nameDraft)
    if (result.success) {
      setIsEditing(false)
      showToast({ title: 'Profile updated', variant: 'success' })
    } else {
      setSaveError(result.error ?? 'We couldn’t save your name. Please try again.')
    }
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

  if (isEditing) {
    return (
      <Card padding="lg" className="flex flex-col gap-4">
        <CardTitle>Edit Profile</CardTitle>
        <Input
          label="Display name"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          error={saveError ?? undefined}
          disabled={isSaving}
          autoFocus
        />
        <div className="flex gap-2">
          <Button onClick={handleSaveName} isLoading={isSaving}>
            Save Changes
          </Button>
          <Button variant="outline" onClick={cancelEditing} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="flex flex-wrap items-center gap-4">
      <Avatar name={displayName} src={avatarUrl} size="xl" />
      <div className="min-w-0 flex-1">
        <p className="font-display text-lg font-semibold text-text-primary">{displayName}</p>
        {email && <p className="truncate text-sm text-text-secondary">{email}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="success">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Signed in
          </Badge>
          <Badge variant="purple">
            Level {gamificationProfile.currentLevel} · {levelTitle}
          </Badge>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Pencil className="size-4" />}
          onClick={() => startEditing(displayName)}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<LogOut className="size-4" />}
          onClick={handleSignOut}
          isLoading={isSigningOut}
        >
          Sign Out
        </Button>
      </div>
    </Card>
  )
}
