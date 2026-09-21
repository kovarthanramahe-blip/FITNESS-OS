import { registerPlugin } from '@capacitor/core'

/** Raw shape resolved by both isAvailable() and getStatus()/requestHealthConnectPermissions() on the native side. */
export interface HealthConnectStatusPayload {
  available: boolean
  hasStepsPermission: boolean
  hasHistoryPermission: boolean
}

export interface HealthConnectStepsRequest {
  /** yyyy-mm-dd, inclusive, local calendar date. */
  startDate: string
  /** yyyy-mm-dd, inclusive, local calendar date. */
  endDate: string
}

export interface HealthConnectDailyStepsPayload {
  /** yyyy-mm-dd, local calendar date. */
  date: string
  steps: number
}

export interface HealthConnectStepsResponse {
  results: HealthConnectDailyStepsPayload[]
}

/**
 * The native plugin's raw surface (`android/.../healthconnect/HealthConnectPlugin.kt`).
 * Nothing outside this file and `index.ts` should import this directly —
 * `index.ts` is the real public API, adding the web fallback and input
 * validation every caller actually wants.
 */
export interface HealthConnectPlugin {
  isAvailable(): Promise<{ available: boolean }>
  getStatus(): Promise<HealthConnectStatusPayload>
  /**
   * Named to match the native method (`HealthConnectPlugin.kt`), which
   * can't be called `requestPermissions` — Capacitor's own `Plugin` base
   * class already declares a `requestPermissions` member for the standard
   * Android runtime-permission flow, and Health Connect permissions don't
   * go through that mechanism. The public `requestPermissions()` in
   * `index.ts` is unaffected — it just calls this method under the hood.
   */
  requestHealthConnectPermissions(): Promise<HealthConnectStatusPayload>
  getSteps(options: HealthConnectStepsRequest): Promise<HealthConnectStepsResponse>
  openSettings(): Promise<void>
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
