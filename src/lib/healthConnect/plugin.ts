import { registerPlugin } from '@capacitor/core'
import type { HealthConnectPermissionState, HealthConnectStatus } from './types'

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
  requestPermissions(): Promise<HealthConnectPermissionState>
  openSettings(): Promise<void>
}

export const HealthConnectPlugin = registerPlugin<HealthConnectPluginApi>('HealthConnect')
