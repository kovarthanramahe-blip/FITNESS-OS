import { Capacitor } from '@capacitor/core'
import { HealthConnectPlugin } from './plugin'
import type { HealthConnectPermissionState, HealthConnectStatus, HealthConnectStepsResult } from './types'
import { parseDateOnly, toDateString } from '@/utils/dateRange'

export type {
  HealthConnectPermission,
  HealthConnectPermissionState,
  HealthConnectStatus,
  HealthConnectStepsErrorReason,
  DailyStepsEntry,
  HealthConnectStepsResult,
} from './types'

const NO_PERMISSIONS: HealthConnectPermissionState = { granted: [], steps: false, exercise: false }

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

function reportFailure(context: string, error: unknown): void {
  console.error(`[Fitness OS] Health Connect call failed (${context}):`, error)
}

/** Rejects malformed strings and calendar-invalid ones (e.g. `2026-02-30`), reusing the same round-trip the rest of the app relies on for date-only values. */
function isValidDateOnlyString(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false
  return toDateString(parseDateOnly(value)) === value
}

function stepsResult(overrides: Partial<HealthConnectStepsResult> = {}): HealthConnectStepsResult {
  return { available: false, permissionGranted: false, days: [], error: null, ...overrides }
}

/**
 * The one place the rest of the app talks to Health Connect. Every method
 * degrades to a safe, non-throwing "unavailable"/"nothing granted" result
 * off Android (web, iOS, or a native call that itself fails) — nothing here
 * can block or crash the rest of Fitness OS, matching the requirement that
 * the app keeps working whether or not Health Connect exists or permission
 * is granted. See docs/health-connect-setup.md.
 */
export const healthConnect = {
  async isAvailable(): Promise<boolean> {
    if (!isNative()) return false
    try {
      const result = await HealthConnectPlugin.isAvailable()
      return result.value
    } catch (error) {
      reportFailure('isAvailable', error)
      return false
    }
  },

  async getStatus(): Promise<HealthConnectStatus> {
    if (!isNative()) return 'unavailable'
    try {
      const result = await HealthConnectPlugin.getStatus()
      return result.status
    } catch (error) {
      reportFailure('getStatus', error)
      return 'unavailable'
    }
  },

  async getGrantedPermissions(): Promise<HealthConnectPermissionState> {
    if (!isNative()) return NO_PERMISSIONS
    try {
      return await HealthConnectPlugin.getGrantedPermissions()
    } catch (error) {
      reportFailure('getGrantedPermissions', error)
      return NO_PERMISSIONS
    }
  },

  async requestPermissions(): Promise<HealthConnectPermissionState> {
    if (!isNative()) return NO_PERMISSIONS
    try {
      return await HealthConnectPlugin.requestHealthConnectPermissions()
    } catch (error) {
      reportFailure('requestPermissions', error)
      return NO_PERMISSIONS
    }
  },

  async openSettings(): Promise<void> {
    if (!isNative()) return
    try {
      await HealthConnectPlugin.openSettings()
    } catch (error) {
      reportFailure('openSettings', error)
    }
  },

  /**
   * Reads real daily step totals for an inclusive `[startDate, endDate]`
   * range of `yyyy-mm-dd` local dates. Validates the range itself first
   * (malformed date, invalid calendar date, or `startDate > endDate`) so a
   * bad call never even reaches the native side; everything past that point
   * — Health Connect missing, permission not granted, the read itself
   * failing — comes back as a typed `error`, never a thrown exception.
   */
  async getSteps(startDate: string, endDate: string): Promise<HealthConnectStepsResult> {
    if (!isValidDateOnlyString(startDate) || !isValidDateOnlyString(endDate) || startDate > endDate) {
      return stepsResult({ error: 'invalid_range' })
    }
    if (!isNative()) {
      return stepsResult({ error: 'unavailable' })
    }
    try {
      const result = await HealthConnectPlugin.getSteps({ startDate, endDate })
      return { ...result, error: result.error ?? null }
    } catch (error) {
      reportFailure('getSteps', error)
      return stepsResult({ error: 'query_failed' })
    }
  },
}
