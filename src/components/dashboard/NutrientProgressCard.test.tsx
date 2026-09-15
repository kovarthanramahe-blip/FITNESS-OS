import { render, screen } from '@testing-library/react'
import { UtensilsCrossed } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { NutrientProgressCard } from './NutrientProgressCard'

describe('NutrientProgressCard', () => {
  it('renders consumed, target and remaining amounts', () => {
    render(
      <NutrientProgressCard
        data={{ label: 'Calories', unit: 'kcal', consumed: 1680, target: 2200 }}
        icon={UtensilsCrossed}
        color="accent"
      />,
    )

    expect(screen.getByText('Calories')).toBeInTheDocument()
    expect(screen.getByText('1,680')).toBeInTheDocument()
    expect(screen.getByText('520 kcal remaining')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '76')
  })

  it('shows "Target reached" once consumed meets the target', () => {
    render(
      <NutrientProgressCard
        data={{ label: 'Protein', unit: 'g', consumed: 150, target: 150 }}
        icon={UtensilsCrossed}
        color="secondary"
      />,
    )

    expect(screen.getByText('Target reached')).toBeInTheDocument()
  })
})
