import { motion } from 'framer-motion'
import { Beef, Moon, Sparkles, UtensilsCrossed } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { DailyScoreCard } from '@/components/dashboard/DailyScoreCard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { HabitsCard } from '@/components/dashboard/HabitsCard'
import { NutrientProgressCard } from '@/components/dashboard/NutrientProgressCard'
import { PersonalRecordsCard } from '@/components/dashboard/PersonalRecordsCard'
import { StepsCard } from '@/components/dashboard/StepsCard'
import { StreakCard } from '@/components/dashboard/StreakCard'
import { TodaysWorkoutCard } from '@/components/dashboard/TodaysWorkoutCard'
import { WaterCard } from '@/components/dashboard/WaterCard'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/LoadingState'
import { LevelProgress } from '@/components/gamification/LevelProgress'
import { mockDashboardData } from '@/data/mockDashboard'
import { mockPersonalRecords } from '@/data/mockProgress'
import { getProgramById } from '@/data/programs'
import { useProgressStore } from '@/lib/progressStore'
import { useWorkoutStore } from '@/lib/workoutStore'
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
  const recentRecords = mockPersonalRecords.slice(0, RECENT_PR_COUNT)

  const { selectedProgramId, currentDayIndex, activeSession } = useWorkoutStore()
  const program = selectedProgramId ? getProgramById(selectedProgramId) : undefined
  const programDay = program ? resolveProgramDay(program, currentDayIndex) : null
  const workoutSummary = getTodaysWorkoutSummary(programDay, activeSession)

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

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12 lg:gap-6"
    >
      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
        <DashboardHeader header={d.header} />
      </motion.div>

      <motion.div variants={staggerItem} className="lg:col-span-4">
        <DailyScoreCard data={d.dailyScore} />
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
        <NutrientProgressCard data={d.calories} icon={UtensilsCrossed} color="accent" />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <NutrientProgressCard data={d.protein} icon={Beef} color="secondary" />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <WaterCard data={d.water} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-3">
        <StepsCard data={d.steps} />
      </motion.div>

      <motion.div variants={staggerItem} className="lg:col-span-4">
        <WeightCard data={weight} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-4">
        <StreakCard streak={d.streak} week={d.weeklyActivity} />
      </motion.div>
      <motion.div variants={staggerItem} className="lg:col-span-4">
        <LevelProgress level={d.level.level} xp={d.level.xp} xpToNextLevel={d.level.xpToNextLevel} />
      </motion.div>

      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-5">
        <HabitsCard habits={d.habits} />
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
          <WeeklyActivityChart week={d.weeklyActivity} />
        </Suspense>
      </motion.div>

      <motion.div variants={staggerItem} className="md:col-span-2 lg:col-span-12">
        <PersonalRecordsCard records={recentRecords} />
      </motion.div>
    </motion.div>
  )
}
