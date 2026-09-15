import { motion } from 'framer-motion'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { BadgeGrid } from '@/components/gamification/BadgeGrid'
import type { BadgeGridItem } from '@/components/gamification/BadgeGrid'
import { ChallengeList } from '@/components/gamification/ChallengeList'
import { GamificationOverview } from '@/components/gamification/GamificationOverview'
import { XPHistory } from '@/components/gamification/XPHistory'
import { Tab, TabList, Tabs } from '@/components/ui/Tabs'
import { useGamificationStore, getGamificationStats } from '@/lib/gamificationStore'
import { useHabitStore } from '@/lib/habitStore'
import { useNutritionStore } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
import type { AchievementCategory } from '@/types/gamification'

const FILTERS: { value: AchievementCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'earned', label: 'Earned' },
  { value: 'locked', label: 'Locked' },
  { value: 'workout', label: 'Workout' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'hydration', label: 'Hydration' },
  { value: 'consistency', label: 'Consistency' },
  { value: 'progress', label: 'Progress' },
]

export function Achievements() {
  const [filter, setFilter] = useState<AchievementCategory>('all')

  // Re-render whenever any source store or the gamification store itself
  // changes — the stats below are always recomputed fresh from live data.
  useWorkoutStore()
  useProgressStore()
  useNutritionStore()
  useHabitStore()
  useGamificationStore()

  const stats = getGamificationStats()

  const allBadgeItems: BadgeGridItem[] = [
    ...stats.earnedBadges.map((badge) => ({ badge, earned: true, earnedAt: badge.earnedAt })),
    ...stats.lockedBadges.map((badge) => ({ badge, earned: false })),
  ]

  const filteredBadges = allBadgeItems.filter((item) => {
    if (filter === 'all') return true
    if (filter === 'earned') return item.earned
    if (filter === 'locked') return !item.earned
    return item.badge.category === filter
  })

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Achievements</h1>
        <p className="mt-1 text-sm text-text-secondary">Level up, keep your streaks alive and unlock badges</p>
      </motion.div>

      <motion.div variants={staggerItem}>
        <GamificationOverview stats={stats} />
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-text-primary">Badges</h2>
          <Tabs value={filter} onChange={(value) => setFilter(value as AchievementCategory)}>
            <TabList className="flex-wrap">
              {FILTERS.map((option) => (
                <Tab key={option.value} value={option.value}>
                  {option.label}
                </Tab>
              ))}
            </TabList>
          </Tabs>
        </div>
        <BadgeGrid items={filteredBadges} emptyMessage="No badges match this filter yet." />
      </motion.div>

      <motion.div variants={staggerItem}>
        <XPHistory events={stats.recentEvents} />
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-6 lg:grid-cols-2">
        <ChallengeList title="Today's Challenges" challenges={stats.dailyChallenges} emptyMessage="No challenges scheduled today." />
        <ChallengeList title="This Week's Challenges" challenges={stats.weeklyChallenges} emptyMessage="No challenges this week." />
      </motion.div>
    </motion.div>
  )
}
