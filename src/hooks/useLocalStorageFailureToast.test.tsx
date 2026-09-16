import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorageFailureToast } from './useLocalStorageFailureToast'
import { ToastProvider } from '@/components/ui/Toast'
import { persistLocalState, resetStorageHealthForTests } from '@/lib/localStorageHealth'

function TestConsumer() {
  useLocalStorageFailureToast()
  return null
}

beforeEach(() => {
  resetStorageHealthForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useLocalStorageFailureToast', () => {
  it('shows a non-intrusive warning toast when a local persistence write fails, without mentioning cloud sync', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    persistLocalState('some-key', { a: 1 })

    await waitFor(() => expect(screen.getByText('Couldn’t save to this device')).toBeInTheDocument())
    const description = screen.getByText(/storage space/i)
    expect(description.textContent ?? '').not.toMatch(/cloud/i)
  })

  it('shows nothing when writes succeed', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )

    persistLocalState('some-key', { a: 1 })

    expect(screen.queryByText('Couldn’t save to this device')).not.toBeInTheDocument()
  })

  it('does not show a second toast for a second consecutive failure (no spam)', async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    persistLocalState('some-key', { a: 1 })
    await waitFor(() => expect(screen.getAllByText('Couldn’t save to this device')).toHaveLength(1))

    persistLocalState('some-key', { a: 2 })
    persistLocalState('some-key', { a: 3 })

    expect(screen.getAllByText('Couldn’t save to this device')).toHaveLength(1)
  })

  it('stops listening once unmounted', async () => {
    const { unmount } = render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    )
    unmount()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })

    expect(() => persistLocalState('some-key', { a: 1 })).not.toThrow()
  })
})
