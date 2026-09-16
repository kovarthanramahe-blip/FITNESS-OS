import { useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { onStorageFailure, type StorageFailureReason } from '@/lib/localStorageHealth'

const DESCRIPTION_BY_REASON: Record<StorageFailureReason, string> = {
  quota: 'Your device is out of storage space, so this change isn’t saved on this device.',
  unavailable: 'Local storage isn’t available on this device, so this change isn’t saved on this device.',
}

/**
 * Surfaces a single, non-intrusive warning when a domain store fails to
 * write to localStorage — deliberately silent on cloud status either way
 * (a local write failure says nothing about whether that same change
 * reached Supabase, which fails and reports independently in
 * cloudSync/push.ts), so this never misrepresents cloud sync as having
 * succeeded or failed. Mount once (see AppLayout) — `onStorageFailure`
 * itself already dedupes repeat notifications while the condition persists.
 */
export function useLocalStorageFailureToast(): void {
  const { showToast } = useToast()

  useEffect(() => {
    return onStorageFailure((event) => {
      showToast({
        title: 'Couldn’t save to this device',
        description: DESCRIPTION_BY_REASON[event.reason],
        variant: 'warning',
      })
    })
  }, [showToast])
}
