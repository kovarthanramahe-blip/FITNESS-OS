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
