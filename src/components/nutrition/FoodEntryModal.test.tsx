import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { FoodEntry } from '@/types/nutrition'
import { FoodEntryModal } from './FoodEntryModal'

const editingEntry: FoodEntry = {
  id: 'entry-1',
  foodId: 'food-eggs',
  foodName: 'Eggs',
  meal: 'breakfast',
  quantity: 2,
  servingUnit: 'large eggs',
  calories: 280,
  protein: 24,
  carbohydrates: 2,
  fat: 20,
  fiber: 0,
  date: '2024-06-01',
  createdAt: '2024-06-01T08:00:00.000Z',
}

describe('FoodEntryModal', () => {
  it('starts on custom food with empty macro fields when adding', () => {
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByLabelText('Custom food name')).toHaveValue('')
    expect(screen.getByLabelText('Calories')).toHaveValue(null)
  })

  it('pre-fills fields when editing an existing entry', () => {
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} editingEntry={editingEntry} />)
    expect(screen.getByLabelText('Food')).toHaveValue('food-eggs')
    expect(screen.getByLabelText('Quantity')).toHaveValue(2)
    expect(screen.getByLabelText('Calories')).toHaveValue(280)
  })

  it('auto-fills macros from the selected library food and scales with quantity', async () => {
    const user = userEvent.setup()
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} />)

    await user.selectOptions(screen.getByLabelText('Food'), 'food-chicken-breast')
    expect(screen.getByLabelText('Calories')).toHaveValue(165)

    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '2')
    expect(screen.getByLabelText('Calories')).toHaveValue(330)
  })

  it('disables save until required fields are valid', async () => {
    const user = userEvent.setup()
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} />)

    expect(screen.getByRole('button', { name: 'Add Food' })).toBeDisabled()
    await user.type(screen.getByLabelText('Custom food name'), 'Homemade soup')
    await user.type(screen.getByLabelText('Calories'), '200')
    expect(screen.getByRole('button', { name: 'Add Food' })).toBeEnabled()
  })

  it('keeps save disabled for a zero or negative quantity', async () => {
    const user = userEvent.setup()
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} />)

    await user.type(screen.getByLabelText('Custom food name'), 'Soup')
    await user.type(screen.getByLabelText('Calories'), '100')
    await user.clear(screen.getByLabelText('Quantity'))
    await user.type(screen.getByLabelText('Quantity'), '0')

    expect(screen.getByRole('button', { name: 'Add Food' })).toBeDisabled()
  })

  it('keeps save disabled for a negative calorie value', async () => {
    const user = userEvent.setup()
    render(<FoodEntryModal isOpen onClose={() => {}} onSave={() => {}} />)

    await user.type(screen.getByLabelText('Custom food name'), 'Soup')
    await user.type(screen.getByLabelText('Calories'), '-50')

    expect(screen.getByRole('button', { name: 'Add Food' })).toBeDisabled()
  })

  it('calls onSave with the entered values and closes', async () => {
    const user = userEvent.setup()
    const handleSave = vi.fn()
    const handleClose = vi.fn()
    render(<FoodEntryModal isOpen onClose={handleClose} onSave={handleSave} defaultMeal="lunch" />)

    await user.type(screen.getByLabelText('Custom food name'), 'Soup')
    await user.type(screen.getByLabelText('Calories'), '200')
    await user.click(screen.getByRole('button', { name: 'Add Food' }))

    expect(handleSave).toHaveBeenCalledWith(expect.objectContaining({ foodName: 'Soup', calories: 200, meal: 'lunch' }))
    expect(handleClose).toHaveBeenCalledOnce()
  })

  it('resets to a blank custom entry the next time it is reopened for a new entry', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [isOpen, setIsOpen] = useState(true)
      return (
        <>
          <button onClick={() => setIsOpen(true)}>reopen</button>
          <FoodEntryModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={() => {}} />
        </>
      )
    }

    render(<Harness />)
    await user.type(screen.getByLabelText('Custom food name'), 'Leftover pizza')
    expect(screen.getByLabelText('Custom food name')).toHaveValue('Leftover pizza')

    await user.click(screen.getByRole('button', { name: 'Close dialog' }))
    await user.click(screen.getByText('reopen'))

    expect(screen.getByLabelText('Custom food name')).toHaveValue('')
  })
})
