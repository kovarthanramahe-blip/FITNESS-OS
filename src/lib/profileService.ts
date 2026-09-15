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
