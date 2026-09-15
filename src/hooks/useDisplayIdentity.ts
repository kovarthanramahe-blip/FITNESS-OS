import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

export interface DisplayIdentity {
  /** Short first-name-style greeting text, e.g. "Good morning, {name}". */
  name: string
  /** Full name, used for avatar initials. */
  fullName: string
  avatarUrl?: string
  email?: string
  isGuest: boolean
}

const GUEST_NAME = 'Guest'

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

/**
 * The single source of truth for "whose name do we show" across the app
 * (Dashboard header, Sidebar, Settings). Never falls back to a specific
 * person's name — an unauthenticated/local session shows a generic
 * "Guest" identity instead.
 */
export function useDisplayIdentity(): DisplayIdentity {
  const { user, isAuthenticated } = useAuth()
  const { profile } = useProfile()

  if (!isAuthenticated) {
    return { name: GUEST_NAME, fullName: GUEST_NAME, isGuest: true }
  }

  const fullName = profile?.displayName ?? user?.displayName ?? user?.email ?? GUEST_NAME
  return {
    name: firstNameOf(fullName),
    fullName,
    avatarUrl: profile?.avatarUrl ?? user?.avatarUrl ?? undefined,
    email: profile?.email ?? user?.email ?? undefined,
    isGuest: false,
  }
}
