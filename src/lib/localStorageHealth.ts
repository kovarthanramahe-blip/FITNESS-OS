/**
 * Shared write path for every domain store's localStorage persistence.
 * Centralizing it here (instead of each store repeating its own
 * try/catch) means a write failure is detected and reported consistently
 * everywhere, without any store needing to know about toasts.
 */

export type StorageFailureReason = 'quota' | 'unavailable'

export interface StorageFailureEvent {
  key: string
  reason: StorageFailureReason
}

type Listener = (event: StorageFailureEvent) => void

const listeners = new Set<Listener>()

/** Gates repeat notifications: set on a failure, cleared on the next success anywhere. */
let hasPendingFailure = false

function classifyError(error: unknown): StorageFailureReason {
  if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014)) {
    return 'quota'
  }
  return 'unavailable'
}

/**
 * Serializes `value` and writes it to `localStorage` under `key`. A
 * failure (quota exceeded, private-mode restrictions, storage disabled)
 * never throws — the caller's in-memory state remains the source of
 * truth for the current session either way. Subscribers are notified at
 * most once per failure episode: repeated failures while the underlying
 * condition persists (e.g. every subsequent mutation while storage stays
 * full) are silent, and the gate resets the moment a write succeeds
 * again, so a later, genuinely new failure is still reported.
 */
export function persistLocalState(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    hasPendingFailure = false
  } catch (error) {
    if (hasPendingFailure) return
    hasPendingFailure = true
    const event: StorageFailureEvent = { key, reason: classifyError(error) }
    for (const listener of listeners) listener(event)
  }
}

/** Subscribe to be notified when a local persistence write fails. Returns an unsubscribe function. */
export function onStorageFailure(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Test-only: resets the "already warned" gate between tests. */
export function resetStorageHealthForTests(): void {
  hasPendingFailure = false
}
