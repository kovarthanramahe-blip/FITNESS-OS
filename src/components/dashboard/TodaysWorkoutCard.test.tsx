import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { TodaysWorkoutCard } from './TodaysWorkoutCard'
import type { WorkoutSummaryData } from '@/types/dashboard'

const baseWorkout: WorkoutSummaryData = {
  id: 'session-1',
  name: 'Push Day',
  muscleGroups: ['Chest', 'Shoulders'],
  totalExercises: 5,
  completedExercises: 0,
  durationMinutes: 55,
}

function renderCard(workout: WorkoutSummaryData) {
  return render(
    <MemoryRouter>
      <TodaysWorkoutCard workout={workout} />
    </MemoryRouter>,
  )
}

describe('TodaysWorkoutCard', () => {
  it('links the primary CTA to /workout', () => {
    renderCard(baseWorkout)
    const link = screen.getByRole('link', { name: /start workout/i })
    expect(link).toHaveAttribute('href', '/workout')
  })

  it('shows "Start Workout" and no progress bar before any exercise is done', () => {
    renderCard(baseWorkout)
    expect(screen.getByText('Start Workout')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('shows partial progress and a "Continue Workout" CTA once started', () => {
    renderCard({ ...baseWorkout, completedExercises: 3, totalExercises: 6 })

    expect(screen.getByText('Continue Workout')).toBeInTheDocument()
    const progressbar = screen.getByRole('progressbar', { name: '3 / 6 exercises complete' })
    expect(progressbar).toHaveAttribute('aria-valuenow', '50')
  })

  it('shows a summary CTA once every exercise is complete', () => {
    renderCard({ ...baseWorkout, completedExercises: 5, totalExercises: 5 })
    expect(screen.getByText('View Summary')).toBeInTheDocument()
  })
})
