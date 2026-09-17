import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Workout } from './Workout'
import { discardSession, getWorkoutState, resetWorkoutStoreForTests, startSession } from '@/lib/workoutStore'

beforeEach(() => {
  resetWorkoutStoreForTests()
})

describe('Workout page — choosing today\'s workout (PPL)', () => {
  it('opens a workout-selection step, showing Push/Pull/Legs from the real program, instead of forcing the scheduled day', async () => {
    const user = userEvent.setup()
    render(<Workout />)

    // The scheduled day (day 0 = Push A) is still shown as a preview...
    expect(screen.getByText('Push A')).toBeInTheDocument()

    // ...but tapping Start Workout offers a real choice rather than starting Push A outright.
    await user.click(screen.getByRole('button', { name: 'Start Workout' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent("Today's Workout")
    expect(screen.getByRole('button', { name: /Push A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pull A/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Legs A/ })).toBeInTheDocument()
  })

  it('choosing Legs when Push is scheduled starts Legs, not Push', async () => {
    const user = userEvent.setup()
    render(<Workout />)

    await user.click(screen.getByRole('button', { name: 'Start Workout' }))
    await user.click(screen.getByRole('button', { name: /Legs A/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(getWorkoutState().activeSession?.name).toBe('Legs A')
  })

  it('choosing a non-scheduled day does not change the selected program or currentDayIndex', async () => {
    const user = userEvent.setup()
    render(<Workout />)
    const before = getWorkoutState()

    await user.click(screen.getByRole('button', { name: 'Start Workout' }))
    await user.click(screen.getByRole('button', { name: /Legs A/ }))

    const after = getWorkoutState()
    expect(after.selectedProgramId).toBe(before.selectedProgramId)
    expect(after.currentDayIndex).toBe(before.currentDayIndex)
  })

  it('choosing the scheduled workout itself still works exactly as before', async () => {
    const user = userEvent.setup()
    render(<Workout />)

    await user.click(screen.getByRole('button', { name: 'Start Workout' }))
    await user.click(screen.getByRole('button', { name: /Push A/ }))

    expect(getWorkoutState().activeSession?.name).toBe('Push A')
  })

  it('the picker also offers a Custom Workout action that opens the builder', async () => {
    const user = userEvent.setup()
    render(<Workout />)

    await user.click(screen.getByRole('button', { name: 'Start Workout' }))
    await user.click(screen.getByRole('button', { name: 'Custom Workout' }))

    expect(screen.getByRole('heading', { name: 'Create Custom Workout' })).toBeInTheDocument()
  })
})

describe('Workout page — resuming an active session bypasses selection entirely', () => {
  it('renders the active session directly, with no Start Workout button or selection step, when a session is already in progress', () => {
    startSession({ id: 'resume-test', name: 'Legs A', exercises: [{ exerciseId: 'squat', sets: 3, reps: '5-8' }], estimatedMinutes: 40 }, 'Intermediate')

    render(<Workout />)

    expect(screen.queryByRole('button', { name: 'Start Workout' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: "Today's Workout" })).not.toBeInTheDocument()
    expect(screen.getByText('Legs A')).toBeInTheDocument()
  })

  it('leaves the in-progress session\'s content untouched — it is the same session, not a fresh pick', () => {
    startSession({ id: 'resume-test-2', name: 'Pull A', exercises: [{ exerciseId: 'barbell-row', sets: 4, reps: '6-10' }], estimatedMinutes: 45 }, 'Intermediate')
    const sessionId = getWorkoutState().activeSession?.id

    render(<Workout />)

    expect(getWorkoutState().activeSession?.id).toBe(sessionId)
    discardSession()
  })
})
