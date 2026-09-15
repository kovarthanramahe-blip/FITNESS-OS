import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { XPHistory } from './XPHistory'
import type { XPEvent } from '@/types/gamification'

const EVENTS: XPEvent[] = [
  { id: '1', type: 'workout_session_complete', amount: 50, date: '2024-06-05', sourceId: '1', description: 'Completed workout' },
  { id: '2', type: 'weight_log', amount: 10, date: '2024-06-04', sourceId: '2', description: 'Logged weight' },
  { id: '3', type: 'habit_complete', amount: 10, date: '2024-06-03', sourceId: '3', description: 'Completed a habit' },
  { id: '4', type: 'water_goal_reached', amount: 20, date: '2024-06-02', sourceId: '4', description: 'Reached water goal' },
]

describe('XPHistory', () => {
  it('lists each event with its amount and description', () => {
    render(<XPHistory events={EVENTS} />)
    expect(screen.getByText('Completed workout')).toBeInTheDocument()
    expect(screen.getByText('+50 XP')).toBeInTheDocument()
    expect(screen.getByText('+20 XP')).toBeInTheDocument()
  })

  it('limits to 3 rows in compact mode', () => {
    render(<XPHistory events={EVENTS} compact />)
    expect(screen.getByText('Completed workout')).toBeInTheDocument()
    expect(screen.getByText('Logged weight')).toBeInTheDocument()
    expect(screen.getByText('Completed a habit')).toBeInTheDocument()
    expect(screen.queryByText('Reached water goal')).not.toBeInTheDocument()
  })

  it('shows an empty state with no events', () => {
    render(<XPHistory events={[]} />)
    expect(screen.getByText('No XP yet')).toBeInTheDocument()
  })
})
