import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RestTimer } from './RestTimer'

describe('RestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows preset buttons when idle', () => {
    render(<RestTimer presets={[30, 60, 90, 120]} defaultSeconds={60} />)
    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '90s' })).toBeInTheDocument()
  })

  it('starts counting down when a preset is tapped', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<RestTimer presets={[30, 60]} defaultSeconds={60} />)

    await user.click(screen.getByRole('button', { name: '30s' }))
    expect(screen.getByText('0:30')).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(screen.getByText('0:29')).toBeInTheDocument()
  })

  it('adds 30 seconds when the +30 button is tapped', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<RestTimer presets={[30]} defaultSeconds={30} />)

    await user.click(screen.getByRole('button', { name: '30s' }))
    await user.click(screen.getByRole('button', { name: 'Add 30 seconds' }))

    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('reaches a done state when skipped', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<RestTimer presets={[30]} defaultSeconds={30} />)

    await user.click(screen.getByRole('button', { name: '30s' }))
    await user.click(screen.getByRole('button', { name: 'Skip rest' }))

    expect(screen.getByText('Ready!')).toBeInTheDocument()
  })

  it('restarts the countdown when restartSignal changes', async () => {
    const { rerender } = render(<RestTimer presets={[30]} defaultSeconds={45} restartSignal={0} />)
    expect(screen.getByRole('button', { name: '30s' })).toBeInTheDocument()

    rerender(<RestTimer presets={[30]} defaultSeconds={45} restartSignal={1} />)

    expect(await screen.findByText('0:45')).toBeInTheDocument()
  })
})
