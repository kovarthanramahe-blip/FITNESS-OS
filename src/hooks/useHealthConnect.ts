import { useCallback, useEffect, useState } from 'react'
import { healthConnect } from '@/lib/healthConnect'
import type { HealthConnectPermissionState, HealthConnectStatus } from '@/lib/healthConnect'

export interface UseHealthConnectResult {
  /** `null` only until the first check resolves. */
  status: HealthConnectStatus | null
  permissions: HealthConnectPermissionState
  loading: boolean
  /** User-friendly message only. */
  error: string | null
  /** True once Health Connect is available and both Phase 8A permissions are granted. */
  isConnected: boolean
  /** Requests the two Phase 8A permissions (steps, exercise). Safe to call even if already granted. */
  connect: () => Promise<void>
  /** Re-checks availability + granted permissions — the "Sync Now" action for this phase. */
  refresh: () => Promise<void>
  openSettings: () => Promise<void>
}

const NO_PERMISSIONS: HealthConnectPermissionState = { granted: [], steps: false, exercise: false }

/**
 * Loads Health Connect availability + permission state on mount and exposes
 * the actions the Settings "Health & Devices" section needs. Every method
 * here is built on `@/lib/healthConnect`, which already never throws — this
 * hook never puts the app into a broken state regardless of platform,
 * Health Connect's install state, or a denied/revoked permission.
 */
export function useHealthConnect(): UseHealthConnectResult {
  const [status, setStatus] = useState<HealthConnectStatus | null>(null)
  const [permissions, setPermissions] = useState<HealthConnectPermissionState>(NO_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextStatus = await healthConnect.getStatus()
      setStatus(nextStatus)
      if (nextStatus === 'available') {
        setPermissions(await healthConnect.getGrantedPermissions())
      } else {
        setPermissions(NO_PERMISSIONS)
      }
    } catch (caughtError: unknown) {
      console.error('[Fitness OS] Failed to check Health Connect status:', caughtError)
      setError('We couldn’t check Health Connect right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- starting a genuinely new async check on mount, not mirroring a prop into state.
    void refresh()
  }, [refresh])

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const granted = await healthConnect.requestPermissions()
      setPermissions(granted)
    } catch (caughtError: unknown) {
      console.error('[Fitness OS] Health Connect permission request failed:', caughtError)
      setError('We couldn’t request Health Connect permissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const openSettings = useCallback(async () => {
    await healthConnect.openSettings()
  }, [])

  return {
    status,
    permissions,
    loading,
    error,
    isConnected: status === 'available' && permissions.steps && permissions.exercise,
    connect,
    refresh,
    openSettings,
  }
}
