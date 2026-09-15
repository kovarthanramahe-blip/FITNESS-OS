import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WaterCard } from './WaterCard'

describe('WaterCard', () => {
  it('renders the current and target amounts', () => {
    render(<WaterCard data={{ consumedMl: 2100, targetMl: 3000 }} />)
    expect(screen.getByText('2.1')).toBeInTheDocument()
    expect(screen.getByText('L / 3.0L')).toBeInTheDocument()
  })

  it('updates the displayed amount when +250 ml is tapped', async () => {
    const user = userEvent.setup()
    render(<WaterCard data={{ consumedMl: 2100, targetMl: 3000 }} />)

    await user.click(screen.getByRole('button', { name: 'Add 250 milliliters of water' }))

    expect(screen.getByText('2.4')).toBeInTheDocument()
    expect(screen.queryByText('2.1')).not.toBeInTheDocument()
  })

  it('updates the displayed amount when +500 ml is tapped', async () => {
    const user = userEvent.setup()
    render(<WaterCard data={{ consumedMl: 2100, targetMl: 3000 }} />)

    await user.click(screen.getByRole('button', { name: 'Add 500 milliliters of water' }))

    expect(screen.getByText('2.6')).toBeInTheDocument()
  })
})
