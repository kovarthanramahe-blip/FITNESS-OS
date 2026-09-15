import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Scale,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { buttonClassNames } from '@/components/ui/buttonStyles'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { StatCard } from '@/components/ui/StatCard'
import { mockDashboard } from '@/data/mockDashboard'
import { mockTodayWorkout } from '@/data/mockWorkout'
import { formatNumber } from '@/utils/format'

const MotionLink = motion(Link)

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const d = mockDashboard
  const completedExercises = mockTodayWorkout.exercises.filter((exercise) =>
    exercise.sets.every((set) => set.completed),
  ).length

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-text-secondary">
            {getGreeting()}, {d.greetingName}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-text-primary sm:text-3xl">
            Let's make today count
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="warning" className="gap-1.5 px-3 py-1.5">
            <Flame className="size-3.5" />
            {d.streakDays} day streak
          </Badge>
          <Badge variant="purple" className="gap-1.5 px-3 py-1.5">
            <Zap className="size-3.5" />
            Level {d.level}
          </Badge>
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-3">
        <Card elevated padding="lg" className="flex items-center gap-6 lg:col-span-1" animate={false}>
          <ProgressRing value={d.dailyScore} color="accent" size={104} strokeWidth={9}>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-text-primary">{d.dailyScore}</p>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">Score</p>
            </div>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-secondary">Daily Score</p>
            <p className="mt-1 text-xs text-text-muted">Workout, nutrition &amp; habits combined</p>
            <div className="mt-3">
              <ProgressBar
                value={d.xp}
                max={d.xpToNextLevel}
                color="purple"
                size="sm"
                label={`XP to Level ${d.level + 1}`}
                showValue
              />
            </div>
          </div>
        </Card>

        <Card elevated padding="lg" className="lg:col-span-2" animate={false}>
          <CardHeader>
            <div>
              <CardTitle>{mockTodayWorkout.name}</CardTitle>
              <CardDescription className="mt-1">
                {mockTodayWorkout.programLevel} · Week {mockTodayWorkout.week}, Day {mockTodayWorkout.day}
              </CardDescription>
            </div>
            <Badge variant="accent">
              {completedExercises}/{mockTodayWorkout.exercises.length} done
            </Badge>
          </CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-6 text-sm text-text-secondary">
              <span>
                <span className="font-semibold text-text-primary">{mockTodayWorkout.durationMinutes}</span> min
              </span>
              <span>
                <span className="font-semibold text-text-primary">{mockTodayWorkout.estimatedCalories}</span> kcal
              </span>
              <span>
                <span className="font-semibold text-text-primary">{mockTodayWorkout.exercises.length}</span> exercises
              </span>
            </div>
            <MotionLink
              to="/workout"
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className={buttonClassNames('primary', 'md', 'w-full sm:w-auto')}
            >
              Start Workout
              <ArrowRight className="size-4" />
            </MotionLink>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Calories"
          value={formatNumber(d.caloriesConsumed)}
          unit={`/ ${formatNumber(d.caloriesTarget)} kcal`}
          icon={UtensilsCrossed}
          accent="accent"
        />
        <StatCard
          label="Protein"
          value={String(d.proteinG)}
          unit={`/ ${d.proteinTargetG} g`}
          icon={Dumbbell}
          accent="secondary"
        />
        <StatCard
          label="Water"
          value={(d.waterMl / 1000).toFixed(1)}
          unit={`/ ${(d.waterTargetMl / 1000).toFixed(1)} L`}
          icon={Droplets}
          accent="secondary"
        />
        <StatCard
          label="Steps"
          value={formatNumber(d.steps)}
          unit={`/ ${formatNumber(d.stepsTarget)}`}
          icon={Footprints}
          accent="purple"
        />
        <StatCard
          label="Weight"
          value={d.weightKg.toFixed(1)}
          unit="kg"
          icon={Scale}
          accent="accent"
          trend={{ value: `${d.weightChangeKg} kg this week`, direction: d.weightChangeKg <= 0 ? 'down' : 'up' }}
        />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Today's Habits</CardTitle>
            <Link to="/habits" className="text-xs font-medium text-accent hover:underline">
              View all
            </Link>
          </CardHeader>
          <ul className="flex flex-col divide-y divide-border">
            {d.habits.map((habit) => (
              <li key={habit.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                {habit.completed ? (
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                ) : (
                  <Circle className="size-5 shrink-0 text-text-muted" />
                )}
                <span className={habit.completed ? 'text-sm text-text-muted line-through' : 'text-sm text-text-primary'}>
                  {habit.label}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </motion.div>
    </motion.div>
  )
}
