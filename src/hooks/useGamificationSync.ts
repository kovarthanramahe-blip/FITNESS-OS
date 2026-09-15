import { useEffect } from 'react'
import { useToast } from '@/hooks/useToast'
import { useHabitStore } from '@/lib/habitStore'
import { syncGamification } from '@/lib/gamificationStore'
import { useNutritionStore } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
import type { Badge } from '@/types/gamification'

/**
 * Keeps the gamification store in sync with the 4 existing domain stores.
 * Runs `syncGamification` in an effect (never during render) whenever any
 * source data changes, and surfaces a subtle "+N XP" toast for whatever
 * XP that sync actually added; newly-earned badges are reported via
 * `onBadgesUnlocked` so the caller can show its own BadgeUnlockToast.
 * Because `syncGamification` is idempotent, React StrictMode's
 * double-invoked effects and re-renders from unrelated state never
 * produce duplicate notifications.
 */
export function useGamificationSync(onBadgesUnlocked?: (badges: Badge[]) => void): void {
  const { showToast } = useToast()
  const { history, personalRecords } = useWorkoutStore()
  const { weightLogs, measurements } = useProgressStore()
  const { entries: foodEntries } = useNutritionStore()
  const { habits, entries: habitEntries, waterLogs, waterGoal } = useHabitStore()

  useEffect(() => {
    const result = syncGamification()
    if (result.newXpEvents.length === 0 && result.newBadges.length === 0) return

    const xpTotal = result.newXpEvents.reduce((total, event) => total + event.amount, 0)
    if (xpTotal > 0) {
      const latest = result.newXpEvents[result.newXpEvents.length - 1]
      showToast({ title: `+${xpTotal} XP`, description: latest?.description, variant: 'success' })
    }

    if (result.newBadges.length > 0) {
      onBadgesUnlocked?.(result.newBadges)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [history, personalRecords, weightLogs, measurements, foodEntries, habits, habitEntries, waterLogs, waterGoal])
}
