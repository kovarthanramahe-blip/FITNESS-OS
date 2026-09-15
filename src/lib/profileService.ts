import { supabase } from '@/lib/supabase'
import type { ProfileRow } from '@/types/supabase'

export interface Profile {
  id: string
  displayName: string | null
  avatarUrl: string | null
  email: string | null
}

function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    email: row.email,
  }
}

/**
 * Reads the `profiles` row for a signed-in user. The row itself is
 * guaranteed to already exist by the `on_auth_user_created` database
 * trigger (see supabase/migrations) — this never creates one client-side.
 * Returns `null` both when Supabase isn't configured and when no session
 * exists yet, so callers can treat "no profile" uniformly.
 */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data ? mapProfileRow(data) : null
}

/**
 * Updates the caller's own profile row. RLS (`profiles_update_own`) only
 * ever permits `auth.uid() = id`, so this can never write another user's
 * profile even if called with an incorrect `userId` — the update simply
 * matches zero rows.
 */
export async function updateProfile(userId: string, patch: { displayName: string }): Promise<Profile> {
  if (!supabase) throw new Error('Cloud sign-in isn’t configured for this environment.')
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: patch.displayName })
    .eq('id', userId)
    .select('*')
    .single()
  if (error) throw error
  return mapProfileRow(data)
}
