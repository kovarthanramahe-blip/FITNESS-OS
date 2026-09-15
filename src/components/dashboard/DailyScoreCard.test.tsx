import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DailyScoreCard } from './DailyScoreCard'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

describe('DailyScoreCard', () => {
  it('renders the score, max and a matching label', () => {
    render(<DailyScoreCard data={{ score: 78, max: 100 }} />)

    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText('/ 100')).toBeInTheDocument()
    expect(screen.getByText('Great day')).toBeInTheDocument()
    expect(screen.getByText('Daily Fitness Score')).toBeInTheDocument()
  })

  it('shows a different label for a low score', () => {
    render(<DailyScoreCard data={{ score: 32, max: 100 }} />)
    expect(screen.getByText("Let's build momentum")).toBeInTheDocument()
  })
})
