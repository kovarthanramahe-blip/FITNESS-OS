import { registerPlugin } from '@capacitor/core'
import type { HealthConnectPermissionState, HealthConnectStatus, HealthConnectStepsResult } from './types'

/**
 * The raw native bridge contract — matches
 * android/app/src/main/java/com/fitnessos/app/healthconnect/HealthConnectPlugin.kt
 * method-for-method. Nothing outside this folder should import this
 * directly; use `@/lib/healthConnect` instead, which adds the web/non-native
 * fallback every one of these native-only calls needs.
 */
export interface HealthConnectPluginApi {
  isAvailable(): Promise<{ value: boolean }>
  getStatus(): Promise<{ status: HealthConnectStatus }>
  getGrantedPermissions(): Promise<HealthConnectPermissionState>
  /**
   * Named to match the native method exactly — deliberately NOT
   * `requestPermissions`, since Capacitor's own `Plugin` superclass already
   * declares a `@PluginMethod requestPermissions(PluginCall)` for its
   * unrelated generic runtime-permission flow. `@/lib/healthConnect` still
   * exposes this to the rest of the app as `requestPermissions()` — only
   * this raw bridge binding needs the distinct name.
   */
  requestHealthConnectPermissions(): Promise<HealthConnectPermissionState>
  openSettings(): Promise<void>
  /** `startDate`/`endDate` are inclusive `yyyy-mm-dd` local dates. */
  getSteps(options: { startDate: string; endDate: string }): Promise<HealthConnectStepsResult>
}

export const HealthConnectPlugin = registerPlugin<HealthConnectPluginApi>('HealthConnect')
