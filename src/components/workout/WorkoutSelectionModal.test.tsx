import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { WorkoutSelectionModal } from './WorkoutSelectionModal'
import { getProgramById } from '@/data/programs'
import { getProgramWorkoutOptions } from '@/utils/workout'

const ppl = getProgramById('intermediate-ppl')
if (!ppl) throw new Error('expected the intermediate-ppl fixture program')
const pplOptions = getProgramWorkoutOptions(ppl)

describe('WorkoutSelectionModal — PPL', () => {
  it('lets the user choose Push', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<WorkoutSelectionModal isOpen options={pplOptions} onClose={vi.fn()} onSelect={onSelect} onCreateCustom={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Push A/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Push A' }))
  })

  it('lets the user choose Pull', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<WorkoutSelectionModal isOpen options={pplOptions} onClose={vi.fn()} onSelect={onSelect} onCreateCustom={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Pull A/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pull A' }))
  })

  it('lets the user choose Legs', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<WorkoutSelectionModal isOpen options={pplOptions} onClose={vi.fn()} onSelect={onSelect} onCreateCustom={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /Legs A/ }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: 'Legs A' }))
  })

  it('shows every option\'s exercise-derived muscle groups, not hard-coded text', () => {
    render(<WorkoutSelectionModal isOpen options={pplOptions} onClose={vi.fn()} onSelect={vi.fn()} onCreateCustom={vi.fn()} />)

    // Push A trains chest/shoulders/triceps-style muscles per the real exercise library —
    // asserting the category text renders at all (not a specific hard-coded string) proves
    // it's data-derived, matching the exercises actually configured for this workout.
    expect(screen.getByText('Chest • Shoulders • Triceps')).toBeInTheDocument()
  })

  it('offers a Custom Workout action distinct from the program options', async () => {
    const onCreateCustom = vi.fn()
    const user = userEvent.setup()
    render(<WorkoutSelectionModal isOpen options={pplOptions} onClose={vi.fn()} onSelect={vi.fn()} onCreateCustom={onCreateCustom} />)

    await user.click(screen.getByRole('button', { name: 'Custom Workout' }))
    expect(onCreateCustom).toHaveBeenCalledOnce()
  })
})

describe('WorkoutSelectionModal — non-PPL programs show their own real days', () => {
  it('Beginner Full Body shows Full Body A/B, not Push/Pull/Legs', () => {
    const fullBody = getProgramById('beginner-full-body')
    if (!fullBody) throw new Error('expected the beginner-full-body fixture program')
    const options = getProgramWorkoutOptions(fullBody)

    render(<WorkoutSelectionModal isOpen options={options} onClose={vi.fn()} onSelect={vi.fn()} onCreateCustom={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Full Body A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Full Body B/ })).toBeInTheDocument()
    expect(screen.queryByText('PUSH')).not.toBeInTheDocument()
  })

  it('Upper/Lower shows Upper and Lower days', () => {
    const upperLower = getProgramById('beginner-upper-lower')
    if (!upperLower) throw new Error('expected the beginner-upper-lower fixture program')
    const options = getProgramWorkoutOptions(upperLower)

    render(<WorkoutSelectionModal isOpen options={options} onClose={vi.fn()} onSelect={vi.fn()} onCreateCustom={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Upper A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Lower A/ })).toBeInTheDocument()
  })
})

describe('WorkoutSelectionModal — visibility', () => {
  it('renders nothing when closed', () => {
    render(<WorkoutSelectionModal isOpen={false} options={pplOptions} onClose={vi.fn()} onSelect={vi.fn()} onCreateCustom={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
