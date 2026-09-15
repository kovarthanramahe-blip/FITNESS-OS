import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders label, value and unit', () => {
    render(<StatCard label="Calories" value="1640" unit="/ 2400 kcal" />)
    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(screen.getByText('1640')).toBeInTheDocument()
    expect(screen.getByText('/ 2400 kcal')).toBeInTheDocument()
  })

  it('renders an upward trend', () => {
    render(<StatCard label="Weight" value="78.4" trend={{ value: '+0.6 kg', direction: 'up' }} />)
    expect(screen.getByText('+0.6 kg')).toBeInTheDocument()
  })
})
