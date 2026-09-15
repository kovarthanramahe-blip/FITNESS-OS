import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCurrentUserId,
  onUserScopeChange,
  resetStorageScopeForTests,
  scopedStorageKey,
  setCurrentUserId,
} from './storageScope'

afterEach(() => {
  resetStorageScopeForTests()
})

describe('getCurrentUserId / setCurrentUserId', () => {
  it('defaults to null (guest/demo scope)', () => {
    expect(getCurrentUserId()).toBeNull()
  })

  it('tracks the active user id after signing in', () => {
    setCurrentUserId('user-1')
    expect(getCurrentUserId()).toBe('user-1')
  })

  it('resets back to null on sign-out', () => {
    setCurrentUserId('user-1')
    setCurrentUserId(null)
    expect(getCurrentUserId()).toBeNull()
  })
})

describe('scopedStorageKey', () => {
  it('returns the unscoped base key when signed out', () => {
    expect(scopedStorageKey('fitness-os:test:v1')).toBe('fitness-os:test:v1')
  })

  it('returns a per-user suffixed key when signed in', () => {
    setCurrentUserId('user-1')
    expect(scopedStorageKey('fitness-os:test:v1')).toBe('fitness-os:test:v1:user:user-1')
  })

  it('gives different users different keys on the same device', () => {
    setCurrentUserId('user-1')
    const keyA = scopedStorageKey('fitness-os:test:v1')
    setCurrentUserId('user-2')
    const keyB = scopedStorageKey('fitness-os:test:v1')
    expect(keyA).not.toBe(keyB)
  })

  it('accepts an explicit userId override independent of the current scope', () => {
    expect(scopedStorageKey('fitness-os:test:v1', 'explicit-user')).toBe('fitness-os:test:v1:user:explicit-user')
  })
})

describe('onUserScopeChange', () => {
  it('notifies listeners with the new userId when scope changes', () => {
    const listener = vi.fn()
    const unsubscribe = onUserScopeChange(listener)

    setCurrentUserId('user-1')
    expect(listener).toHaveBeenCalledWith('user-1')

    setCurrentUserId(null)
    expect(listener).toHaveBeenCalledWith(null)

    unsubscribe()
  })

  it('does not notify listeners when setting the same userId again', () => {
    setCurrentUserId('user-1')
    const listener = vi.fn()
    const unsubscribe = onUserScopeChange(listener)

    setCurrentUserId('user-1')
    expect(listener).not.toHaveBeenCalled()

    unsubscribe()
  })

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = onUserScopeChange(listener)
    unsubscribe()

    setCurrentUserId('user-1')
    expect(listener).not.toHaveBeenCalled()
  })
})
