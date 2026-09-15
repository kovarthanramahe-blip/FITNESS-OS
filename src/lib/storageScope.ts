/**
 * The one place that tracks "which user's local data is currently active."
 *
 * Every domain store (workout/progress/nutrition/habit/gamification) reads
 * its storage key through here instead of using a single fixed key. This
 * is what makes multi-user isolation work on a shared device/browser:
 *
 * - Signed out (or Supabase not configured) — `currentUserId` is `null`.
 *   Stores use their original, unscoped storage key and seed from the
 *   existing mock/demo data exactly as before Phase "production
 *   personalization" — this is the local-first demo experience.
 * - Signed in — `currentUserId` is the authenticated Supabase user id.
 *   Stores switch to a per-user key (`${base}:user:${userId}`) and start
 *   from an EMPTY initial state (see each store's `createInitialState`),
 *   never the shared demo data. A second Google account signing in on the
 *   same browser gets its own separate key, never the first account's data.
 *
 * `AuthProvider` is the only caller of `setCurrentUserId` — it calls this
 * whenever the authenticated user changes (sign in, sign out, switch
 * account). Every store subscribes via `onUserScopeChange` to reload its
 * `state` from the newly-active key at that moment, so switching accounts
 * takes effect immediately without a page reload.
 */

export type StorageScopeListener = (userId: string | null) => void

let currentUserId: string | null = null
const listeners = new Set<StorageScopeListener>()

export function getCurrentUserId(): string | null {
  return currentUserId
}

export function setCurrentUserId(userId: string | null): void {
  if (currentUserId === userId) return
  currentUserId = userId
  for (const listener of listeners) listener(userId)
}

export function onUserScopeChange(listener: StorageScopeListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `base` unscoped for a guest/demo session, `${base}:user:${userId}` once signed in. */
export function scopedStorageKey(base: string, userId: string | null = currentUserId): string {
  return userId ? `${base}:user:${userId}` : base
}

/** Test-only: resets scope tracking (does not itself clear any store's in-memory state). */
export function resetStorageScopeForTests(): void {
  currentUserId = null
}
