import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Add Exercise">
        <p>Body</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the title and content when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Add Exercise" description="Pick from the catalog">
        <p>Body content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Add Exercise')).toBeInTheDocument()
    expect(screen.getByText('Pick from the catalog')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    render(
      <Modal isOpen onClose={handleClose} title="Add Exercise">
        <p>Body</p>
      </Modal>,
    )

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the Escape key is pressed', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    render(
      <Modal isOpen onClose={handleClose} title="Add Exercise">
        <p>Body</p>
      </Modal>,
    )

    await user.keyboard('{Escape}')
    expect(handleClose).toHaveBeenCalledOnce()
  })
})

/**
 * A harness matching how real callers use Modal: `onClose` is a fresh inline
 * arrow function on every render (exactly what CustomWorkoutBuilder passes),
 * and typing into a field inside the dialog re-renders this component. This
 * is what originally caused the reported Android keyboard-dismissal bug:
 * `dialogRef.current?.focus()` re-ran on every keystroke because `onClose`
 * was in the effect's dependency array, stealing focus from the input.
 */
function ModalWithChangingOnClose({ onEscape }: { onEscape: () => void }) {
  const [value, setValue] = useState('')
  // A fresh arrow function every render — deliberately not memoized, since
  // that's exactly what CustomWorkoutBuilder's `handleClose` is.
  function handleClose() {
    onEscape()
  }
  return (
    <Modal isOpen onClose={handleClose} title="Custom Exercise">
      <input aria-label="Sets" value={value} onChange={(event) => setValue(event.target.value)} />
    </Modal>
  )
}

describe('Modal — focus retention while editing (regression: Android keyboard dismissal)', () => {
  it('never re-focuses the dialog container after the initial open, even though onClose is a new function every render', async () => {
    // This is the actual mechanism behind the bug: `dialogRef.current?.focus()`
    // forcibly moves focus to the dialog shell. That's correct once, on open
    // (so screen readers announce the dialog) — but re-running it on every
    // keystroke steals focus straight back off whatever input the user is
    // typing into, which is what made the Android keyboard disappear.
    // jsdom's focus/blur handling doesn't reliably reproduce the resulting
    // "input loses document.activeElement" symptom the way a real browser
    // does (confirmed separately against real Chromium), so this test
    // targets the cause directly: how many times focus() is called.
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus')
    const user = userEvent.setup()
    render(<ModalWithChangingOnClose onEscape={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    const focusCallsOnDialog = () => focusSpy.mock.contexts.filter((context) => context === dialog).length

    const dialogFocusCallsAfterOpen = focusCallsOnDialog()
    expect(dialogFocusCallsAfterOpen).toBeGreaterThan(0)

    const input = screen.getByLabelText('Sets')
    await user.click(input)
    await user.type(input, '1234')

    expect(focusCallsOnDialog()).toBe(dialogFocusCallsAfterOpen)
    focusSpy.mockRestore()
  })

  it('still calls the latest onClose on Escape after several re-renders changed its identity', async () => {
    const user = userEvent.setup()
    const onEscape = vi.fn()
    render(<ModalWithChangingOnClose onEscape={onEscape} />)

    const input = screen.getByLabelText('Sets')
    await user.click(input)
    await user.type(input, '4')

    await user.keyboard('{Escape}')
    expect(onEscape).toHaveBeenCalledOnce()
  })
})
