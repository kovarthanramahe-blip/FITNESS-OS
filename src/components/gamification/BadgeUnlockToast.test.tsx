import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dumbbell } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { BadgeUnlockToast } from './BadgeUnlockToast'
import type { Badge } from '@/types/gamification'

const BADGE: Badge = {
  id: 'first-workout',
  name: 'First Workout',
  description: 'Complete your first workout.',
  category: 'workout',
  icon: Dumbbell,
  requirement: 'Complete 1 workout',
  rarity: 'common',
}

describe('BadgeUnlockToast', () => {
  it('announces the unlock via a status region', () => {
    render(<BadgeUnlockToast badge={BADGE} onDismiss={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('First Workout')
  })

  it('calls onDismiss when the close button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<BadgeUnlockToast badge={BADGE} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss badge notification' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
