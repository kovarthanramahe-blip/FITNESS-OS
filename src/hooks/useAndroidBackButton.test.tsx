import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function mockCapacitor(isNative: boolean) {
  vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNative } }))
}

function mockApp() {
  let handler: ((event: { canGoBack: boolean }) => void) | null = null
  const remove = vi.fn().mockResolvedValue(undefined)
  const exitApp = vi.fn().mockResolvedValue(undefined)
  vi.doMock('@capacitor/app', () => ({
    App: {
      addListener: vi.fn((eventName: string, listener: (event: { canGoBack: boolean }) => void) => {
        if (eventName === 'backButton') handler = listener
        return Promise.resolve({ remove })
      }),
      exitApp,
    },
  }))
  return { fireBackButton: (canGoBack: boolean) => handler?.({ canGoBack }), remove, exitApp }
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAndroidBackButton', () => {
  it('does nothing on web (Capacitor.isNativePlatform() is false)', async () => {
    mockCapacitor(false)
    const { fireBackButton, exitApp } = mockApp()
    const { useAndroidBackButton } = await import('./useAndroidBackButton')

    renderHook(() => useAndroidBackButton())

    expect(fireBackButton(false)).toBeUndefined()
    expect(exitApp).not.toHaveBeenCalled()
  })

  it('navigates history back when there is history to go back to', async () => {
    mockCapacitor(true)
    const { fireBackButton } = mockApp()
    const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    const { useAndroidBackButton } = await import('./useAndroidBackButton')

    renderHook(() => useAndroidBackButton())
    fireBackButton(true)

    expect(historyBack).toHaveBeenCalled()
  })

  it('exits the app when there is no history left', async () => {
    mockCapacitor(true)
    const { fireBackButton, exitApp } = mockApp()
    const { useAndroidBackButton } = await import('./useAndroidBackButton')

    renderHook(() => useAndroidBackButton())
    fireBackButton(false)

    expect(exitApp).toHaveBeenCalled()
  })

  it('removes the listener on unmount', async () => {
    mockCapacitor(true)
    const { remove } = mockApp()
    const { useAndroidBackButton } = await import('./useAndroidBackButton')

    const { unmount } = renderHook(() => useAndroidBackButton())
    unmount()

    await vi.waitFor(() => expect(remove).toHaveBeenCalled())
  })
})
