import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LevelProgress } from './LevelProgress'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true }
})

describe('LevelProgress', () => {
  it('renders the level, XP and remaining XP to the next level', () => {
    render(<LevelProgress level={12} xp={2840} xpToNextLevel={3000} />)

    expect(screen.getByText('Level 12')).toBeInTheDocument()
    expect(screen.getByText('2,840 / 3,000 XP')).toBeInTheDocument()
    expect(screen.getByText('160 XP to next level')).toBeInTheDocument()
  })

  it('exposes the progress via the progressbar role', () => {
    render(<LevelProgress level={1} xp={50} xpToNextLevel={100} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
  })

  it('shows the level title when provided', () => {
    render(<LevelProgress level={12} xp={2840} xpToNextLevel={3000} title="Consistency Builder" />)
    expect(screen.getByText('Consistency Builder')).toBeInTheDocument()
  })
})
