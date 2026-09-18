import { motion } from 'framer-motion'
import { Beef, Moon, Sparkles, UtensilsCrossed } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { ChallengeCard } from '@/components/gamification/ChallengeCard'
import { StreakSummary } from '@/components/gamification/StreakSummary'
import { XPProgressCard } from '@/components/gamification/XPProgressCard'
import { DailyScoreCard } from '@/components/dashboard/DailyScoreCard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { HabitsCard } from '@/components/dashboard/HabitsCard'
import { NextActionCard } from '@/components/dashboard/NextActionCard'
import { NutrientProgressCard } from '@/components/dashboard/NutrientProgressCard'
import { PersonalRecordsCard } from '@/components/dashboard/PersonalRecordsCard'
import { StepsCard } from '@/components/dashboard/StepsCard'
import { TodaysWorkoutCard } from '@/components/dashboard/TodaysWorkoutCard'
import { WaterCard } from '@/components/dashboard/WaterCard'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/LoadingState'
import { mockDashboardData } from '@/data/mockDashboard'
import { getProgramById } from '@/data/programs'
import { useDisplayIdentity } from '@/hooks/useDisplayIdentity'
import { getGamificationStats, useGamificationStore } from '@/lib/gamificationStore'
import { useHabitStore } from '@/lib/habitStore'
import { useNutritionStore } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
import type { NutrientSummary } from '@/types/dashboard'
import { getTodayDateString } from '@/utils/dateRange'
import { getNextAction, getWeeklyActivityFromHistory } from '@/utils/dashboard'
import { getHabitStatusForDate } from '@/utils/habits'
import { getDailyTotals, getDailyWaterMl, goalToMacroTargets } from '@/utils/nutrition'
import { getCurrentWeightLog, getWeightChangeOverDays } from '@/utils/progress'
import { getTodaysWorkoutSummary, resolveProgramDay } from '@/utils/workout'

// Recharts is a heavy dependency — keep it out of the Dashboard's initial
// bundle by loading the chart lazily, same pattern as route-level splitting.
const WeeklyActivityChart = lazy(() =>
  import('@/components/dashboard/WeeklyActivityChart').then((m) => ({ default: m.WeeklyActivityChart })),
)

const RECENT_PR_COUNT = 3

export function Dashboard() {
  const d = mockDashboardData
  const identity = useDisplayIdentity()
  const header = { name: identity.name, fullName: identity.fullName, avatarUrl: identity.avatarUrl }
  // These two widgets have no real backing store — for a guest/demo session they keep
  // showing the sample numbers, but a real authenticated user never sees fabricated
  // metrics that don't reflect anything they've actually done.
  const dailyScore = identity.isGuest ? d.dailyScore : { score: 0, max: d.dailyScore.max }
  const steps = identity.isGuest ? d.steps : { steps: 0, target: d.steps.target }

  const { selectedProgramId, currentDayIndex, activeSession, personalRecords, history } = useWorkoutStore()
  const program = selectedProgramId ? getProgramById(selectedProgramId) : undefined
  const programDay = program ? resolveProgramDay(program, currentDayIndex) : null
  const workoutSummary = getTodaysWorkoutSummary(programDay, activeSession)
  const recentRecords = [...personalRecords]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_PR_COUNT)
  const weeklyActivity = identity.isGuest ? d.weeklyActivity : getWeeklyActivityFromHistory(history)

  const { weightLogs, weightGoal } = useProgressStore()
  const currentWeightLog = getCurrentWeightLog(weightLogs)
  const weightTrend = [...weightLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-6)
    .map((log) => log.weightKg)
  const weight = {
    currentKg: currentWeightLog?.weightKg ?? weightGoal.startingWeightKg,
    changeKg: getWeightChangeOverDays(weightLogs, 30) ?? 0,
    changePeriodLabel: 'last 30 days',
    targetKg: weightGoal.targetWeightKg,
    trend: weightTrend,
  }

  // Carbs/fat are derived alongside calories/protein for consistency, even
  // though only calories and protein have a dedicated card on this page —
  // the Nutrition page is where the full macro breakdown lives.
  const { entries: foodEntries, goal: nutritionGoal, waterLogs, waterGoal } = useNutritionStore()
  const dailyTotals = getDailyTotals(foodEntries, getTodayDateString())
  const macroTargets = goalToMacroTargets(nutritionGoal)
  const calories: NutrientSummary = { label: 'Calories', unit: 'kcal', consumed: dailyTotals.calories, target: macroTargets.calories }
  const protein: NutrientSummary = { label: 'Protein', unit: 'g', consumed: dailyTotals.protein, target: macroTargets.protein }

  const { habits, entries: habitEntries } = useHabitStore()

  const today = getTodayDateString()
  const nextIncompleteHabit = habits.find(
    (habit) => getHabitStatusForDate(habit, habitEntries, today) === 'pending',
  )
  const nextAction = getNextAction({
    hasWorkoutScheduledToday: programDay?.type === 'workout',
    workoutCompletedToday: history.some((entry) => entry.date.slice(0, 10) === today),
    proteinConsumed: protein.consumed,
    proteinTarget: protein.target,
    waterConsumedMl: getDailyWaterMl(waterLogs, today),
    waterGoalMl: waterGoal.goalMl,
    nextIncompleteHabitName: nextIncompleteHabit?.name ?? null,
  })

  // Re-renders whenever the gamification store changes (new XP/badges from
  // useGamificationSync, mounted once in AppLayout); stats are always
  // recomputed fresh from live store data, never a separate dataset.
  useGamificationStore()
  const gamificationStats = getGamificationStats()
  const featuredChallenge =
    gamificationStats.dailyChallenges.find((progress) => progress.challenge.id === 'daily-workout') ??
    gamificationStats.dailyChallenges[0]

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6"
    >
      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
        <DashboardHeader header={header} />
      </motion.div>

      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
        <NextActionCard action={nextAction} />
      </motion.div>

      <motion.div variants={staggerItem} className="lg:col-span-4">
        <DailyScoreCard data={dailyScore} />
      </motion.div>
      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-8">
        {workoutSummary ? (
          <TodaysWorkoutCard workout={workoutSummary} />
        ) : (
          <Card elevated padding="lg" className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-purple-soft text-purple">
              {programDay?.type === 'active-recovery' ? (
                <Sparkles className="size-5" />
              ) : (
                <Moon className="size-5" />
              )}
            </span>
            <p className="font-display text-lg font-semibold text-text-primary">
              {programDay?.type === 'active-recovery' ? 'Active Recovery' : 'Rest Day'}
            </p>
            <p className="max-w-xs text-sm text-text-secondary">
              Recovery is part of the program — planned rest days aren&rsquo;t missed days.
            </p>
          </Card>
        )}
      </motion.div>

      <motion.div variants={staggerItem} className="lg:col-span-3">
        <NutrientProgressCard data={calories} icon={UtensilsCrossed} color="accent" />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <NutrientProgressCard data={protein} icon={Beef} color="secondary" />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <WaterCard logs={waterLogs} goal={waterGoal} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <StepsCard data={steps} />
      </motion.div>

      <motion.div variants={staggerItem} className="lg:col-span-4">
        <WeightCard data={weight} hasData={currentWeightLog !== null} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-4">
        <XPProgressCard stats={gamificationStats} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-4">
        <StreakSummary streaks={gamificationStats.streaks} />
      </motion.div>

      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-5">
        <HabitsCard habits={habits} entries={habitEntries} />
      </motion.div>
      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-7">
        <Suspense
          fallback={
            <Card padding="lg" className="flex h-full flex-col gap-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-48 w-full" />
            </Card>
          }
        >
          <WeeklyActivityChart week={weeklyActivity} />
        </Suspense>
      </motion.div>

      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
        <PersonalRecordsCard records={recentRecords} />
      </motion.div>

      {featuredChallenge && (
        <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
          <ChallengeCard progress={featuredChallenge} />
        </motion.div>
      )}
    </motion.div>
  )
}
