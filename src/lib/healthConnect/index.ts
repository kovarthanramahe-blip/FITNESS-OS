import { Capacitor } from '@capacitor/core'
import { HealthConnect } from '@/lib/healthConnect/plugin'
import type { HealthConnectStatusPayload } from '@/lib/healthConnect/plugin'
import { parseDateOnly, toDateString } from '@/utils/dateRange'

/**
 * The public Health Connect API — every other file should import from
 * here, never from `./plugin` directly. Adds the web/non-native fallback
 * (nothing native is required to run the rest of the app, in tests or on
 * web — every function below resolves instead of throwing/hanging) and
 * validates dates using the app's own local-date utilities before ever
 * reaching the native side, so a malformed range never has to be
 * diagnosed from inside a Kotlin stack trace.
 */

/**
 * A simplified, UI-facing connection state derived from the native
 * `{ available, hasStepsPermission, hasHistoryPermission }` payload.
 * `hasHistoryPermission` isn't folded in here — a user can be fully
 * "connected" (today's steps readable) without ever having granted
 * history access, which only affects how far back `getSteps` can see.
 */
export type HealthConnectConnectionStatus = 'unavailable' | 'permission-required' | 'connected'

export interface HealthConnectStatus {
  connection: HealthConnectConnectionStatus
  hasHistoryPermission: boolean
}

export interface DailySteps {
  /** yyyy-mm-dd, local calendar date. */
  date: string
  steps: number
}

export type HealthConnectErrorCode =
  | 'UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'INVALID_DATE'
  | 'INVALID_RANGE'
  | 'READ_FAILED'
  | 'STATUS_FAILED'
  | 'OPEN_SETTINGS_FAILED'
  | 'UNKNOWN'

export class HealthConnectError extends Error {
  readonly code: HealthConnectErrorCode

  constructor(message: string, code: HealthConnectErrorCode) {
    super(message)
    this.name = 'HealthConnectError'
    this.code = code
  }
}

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

function toStatus(payload: HealthConnectStatusPayload): HealthConnectStatus {
  const connection: HealthConnectConnectionStatus = !payload.available
    ? 'unavailable'
    : !payload.hasStepsPermission
      ? 'permission-required'
      : 'connected'
  return { connection, hasHistoryPermission: payload.hasHistoryPermission }
}

function toHealthConnectError(error: unknown, fallbackCode: HealthConnectErrorCode): HealthConnectError {
  if (error instanceof HealthConnectError) return error
  const rawCode = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : null
  const code = (rawCode && isKnownErrorCode(rawCode) ? rawCode : fallbackCode) as HealthConnectErrorCode
  const message = error instanceof Error && error.message ? error.message : 'Health Connect request failed.'
  return new HealthConnectError(message, code)
}

const KNOWN_ERROR_CODES: readonly HealthConnectErrorCode[] = [
  'UNAVAILABLE',
  'PERMISSION_DENIED',
  'INVALID_DATE',
  'INVALID_RANGE',
  'READ_FAILED',
  'STATUS_FAILED',
  'OPEN_SETTINGS_FAILED',
  'UNKNOWN',
]

function isKnownErrorCode(value: string): value is HealthConnectErrorCode {
  return (KNOWN_ERROR_CODES as readonly string[]).includes(value)
}

/** yyyy-mm-dd, and a real calendar date (not e.g. "2024-13-40" silently rolled over). */
function isValidDateOnlyString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  return toDateString(parseDateOnly(value)) === value
}

/** Whether the Health Connect app itself is installed and usable on this device. Always `false` on web/iOS. */
export async function isAvailable(): Promise<boolean> {
  if (!isNative()) return false
  try {
    const { available } = await HealthConnect.isAvailable()
    return available
  } catch {
    return false
  }
}

/** Never throws — an unreadable/unavailable status simply reports as 'unavailable'. */
export async function getStatus(): Promise<HealthConnectStatus> {
  if (!isNative()) return { connection: 'unavailable', hasHistoryPermission: false }
  try {
    const payload = await HealthConnect.getStatus()
    return toStatus(payload)
  } catch {
    return { connection: 'unavailable', hasHistoryPermission: false }
  }
}

/**
 * Shows Health Connect's own permission dialog (steps + optional history
 * access). Resolves with the resulting status either way — including when
 * the user dismisses the dialog without granting anything — never throws
 * for a "no" answer, only for a genuine unexpected failure.
 */
export async function requestPermissions(): Promise<HealthConnectStatus> {
  if (!isNative()) return { connection: 'unavailable', hasHistoryPermission: false }
  try {
    const payload = await HealthConnect.requestPermissions()
    return toStatus(payload)
  } catch (error) {
    throw toHealthConnectError(error, 'UNKNOWN')
  }
}

/**
 * Daily step totals for every date from `startDate` to `endDate`
 * (inclusive), each derived from Health Connect's own `StepsRecord`
 * aggregate — never a manual sum of raw records, and never combined into
 * a single range total (one entry per calendar day, always). Throws a
 * `HealthConnectError` for anything that isn't a legitimate zero: an
 * invalid range, no permission, or the read itself failing — callers must
 * not treat a thrown error the same as an empty/zero result.
 */
export async function getSteps(startDate: string, endDate: string): Promise<DailySteps[]> {
  if (!isNative()) {
    throw new HealthConnectError('Health Connect is only available on Android.', 'UNAVAILABLE')
  }
  if (!isValidDateOnlyString(startDate) || !isValidDateOnlyString(endDate)) {
    throw new HealthConnectError('startDate/endDate must be valid yyyy-mm-dd dates.', 'INVALID_DATE')
  }
  if (startDate > endDate) {
    throw new HealthConnectError('endDate must not be before startDate.', 'INVALID_RANGE')
  }
  try {
    const { results } = await HealthConnect.getSteps({ startDate, endDate })
    return results
  } catch (error) {
    throw toHealthConnectError(error, 'READ_FAILED')
  }
}

/** Opens the Health Connect app's own settings screen. A no-op on web/iOS, and best-effort if it fails natively. */
export async function openSettings(): Promise<void> {
  if (!isNative()) return
  try {
    await HealthConnect.openSettings()
  } catch {
    // Nothing meaningful to surface — the user is already trying to leave this screen.
  }
}
