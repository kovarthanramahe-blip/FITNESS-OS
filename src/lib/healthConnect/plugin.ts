import { registerPlugin } from '@capacitor/core'

/** Raw shape resolved by both isAvailable() and getStatus()/requestPermissions() on the native side. */
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
  requestPermissions(): Promise<HealthConnectStatusPayload>
  getSteps(options: HealthConnectStepsRequest): Promise<HealthConnectStepsResponse>
  openSettings(): Promise<void>
}

export const HealthConnect = registerPlugin<HealthConnectPlugin>('HealthConnect')
