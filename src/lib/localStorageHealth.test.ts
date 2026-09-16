import { beforeEach, describe, expect, it, vi } from 'vitest'
import { onStorageFailure, persistLocalState, resetStorageHealthForTests } from './localStorageHealth'

function quotaExceededError(): DOMException {
  return new DOMException('The quota has been exceeded.', 'QuotaExceededError')
}

beforeEach(() => {
  resetStorageHealthForTests()
  vi.restoreAllMocks()
})

describe('persistLocalState — successful writes', () => {
  it('writes the JSON-serialized value under the given key, exactly as a direct setItem call would', () => {
    persistLocalState('test-key', { a: 1, b: [1, 2, 3] })

    expect(window.localStorage.getItem('test-key')).toBe(JSON.stringify({ a: 1, b: [1, 2, 3] }))
  })

  it('never notifies subscribers on a successful write', () => {
    const listener = vi.fn()
    onStorageFailure(listener)

    persistLocalState('test-key', { ok: true })

    expect(listener).not.toHaveBeenCalled()
  })
})

describe('persistLocalState — write failures', () => {
  it('never throws, even when the underlying setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaExceededError()
    })

    expect(() => persistLocalState('test-key', { a: 1 })).not.toThrow()
  })

  it('classifies a QuotaExceededError and notifies subscribers with reason "quota"', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaExceededError()
    })
    const listener = vi.fn()
    onStorageFailure(listener)

    persistLocalState('workout-key', { a: 1 })

    expect(listener).toHaveBeenCalledWith({ key: 'workout-key', reason: 'quota' })
  })

  it('classifies any other storage error as "unavailable"', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is disabled')
    })
    const listener = vi.fn()
    onStorageFailure(listener)

    persistLocalState('test-key', { a: 1 })

    expect(listener).toHaveBeenCalledWith({ key: 'test-key', reason: 'unavailable' })
  })

  it('does not spam: a second consecutive failure does not notify again', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaExceededError()
    })
    const listener = vi.fn()
    onStorageFailure(listener)

    persistLocalState('test-key', { a: 1 })
    persistLocalState('test-key', { a: 2 })
    persistLocalState('test-key', { a: 3 })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('notifies again after a successful write resets the gate, for a genuinely new failure', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const listener = vi.fn()
    onStorageFailure(listener)

    setItemSpy.mockImplementationOnce(() => {
      throw quotaExceededError()
    })
    persistLocalState('test-key', { a: 1 })
    expect(listener).toHaveBeenCalledTimes(1)

    setItemSpy.mockImplementationOnce(() => {})
    persistLocalState('test-key', { a: 2 })

    setItemSpy.mockImplementationOnce(() => {
      throw quotaExceededError()
    })
    persistLocalState('test-key', { a: 3 })

    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe stops further notifications', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaExceededError()
    })
    const listener = vi.fn()
    const unsubscribe = onStorageFailure(listener)
    unsubscribe()

    persistLocalState('test-key', { a: 1 })

    expect(listener).not.toHaveBeenCalled()
  })
})
