import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
