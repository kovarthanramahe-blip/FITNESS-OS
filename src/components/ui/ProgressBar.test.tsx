import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('exposes the correct progressbar semantics', () => {
    render(<ProgressBar value={40} max={100} label="Sets completed" />)
    const progressbar = screen.getByRole('progressbar', { name: 'Sets completed' })
    expect(progressbar).toHaveAttribute('aria-valuenow', '40')
    expect(progressbar).toHaveAttribute('aria-valuemin', '0')
    expect(progressbar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps values above the max to 100%', () => {
    render(<ProgressBar value={150} max={100} label="Overfilled" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('clamps negative values to 0%', () => {
    render(<ProgressBar value={-20} max={100} label="Negative" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })

  it('shows the rounded percentage when showValue is set', () => {
    render(<ProgressBar value={33} max={100} label="Water" showValue />)
    expect(screen.getByText('33%')).toBeInTheDocument()
  })
})
