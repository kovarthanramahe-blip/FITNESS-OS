import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

/**
 * Maps the Android hardware/gesture back button onto the app's own router
 * history, matching how a browser's back button already behaves: go back
 * within the app if there's history, otherwise exit rather than closing on
 * a page the user could still navigate away from. No-op on web/iOS.
 */
export function useAndroidBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void CapacitorApp.exitApp()
      }
    })

    return () => {
      void listenerPromise.then((handle) => handle.remove())
    }
  }, [])
}
