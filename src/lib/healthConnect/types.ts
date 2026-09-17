/**
 * Phase 8A foundation types only — no step/exercise data shape lives here
 * yet, since this phase never reads any. See docs/health-connect-setup.md.
 */

/**
 * - `available`: Health Connect is installed/present and can be used.
 * - `unavailable`: not present on this device (and, on Android 9-13, not
 *   installable in a way this phase can detect further than "absent").
 * - `update_required`: present but needs an update before it can be used.
 */
export type HealthConnectStatus = 'available' | 'unavailable' | 'update_required'

/** Phase 8A requests exactly these two, both read-only. */
export type HealthConnectPermission = 'READ_STEPS' | 'READ_EXERCISE'

export interface HealthConnectPermissionState {
  granted: HealthConnectPermission[]
  steps: boolean
  exercise: boolean
}

/**
 * Phase 8B.1 adds real step reading on top of the Phase 8A foundation above.
 * `error` distinguishes every way a `getSteps` call can come back empty
 * without throwing: no Health Connect on this platform/device, the steps
 * permission isn't granted, the requested range itself is invalid, or the
 * on-device read failed. `null` means the read actually succeeded.
 */
export type HealthConnectStepsErrorReason = 'unavailable' | 'permission_denied' | 'invalid_range' | 'query_failed'

export interface DailyStepsEntry {
  /** yyyy-mm-dd, local calendar date. */
  date: string
  steps: number
}

export interface HealthConnectStepsResult {
  available: boolean
  permissionGranted: boolean
  days: DailyStepsEntry[]
  error: HealthConnectStepsErrorReason | null
}
