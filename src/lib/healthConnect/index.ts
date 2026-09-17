import { Capacitor } from '@capacitor/core'
import { HealthConnectPlugin } from './plugin'
import type { HealthConnectPermissionState, HealthConnectStatus } from './types'

export type { HealthConnectPermission, HealthConnectPermissionState, HealthConnectStatus } from './types'

const NO_PERMISSIONS: HealthConnectPermissionState = { granted: [], steps: false, exercise: false }

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

function reportFailure(context: string, error: unknown): void {
  console.error(`[Fitness OS] Health Connect call failed (${context}):`, error)
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
      return await HealthConnectPlugin.requestPermissions()
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
}
