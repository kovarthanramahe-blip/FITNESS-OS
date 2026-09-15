import { motion } from 'framer-motion'
import { Flame, Lock, Zap } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { mockAchievements, mockChallenges } from '@/data/mockAchievements'
import { mockDashboard } from '@/data/mockDashboard'
import { cn } from '@/utils/cn'

export function Achievements() {
  const { level, xp, xpToNextLevel, streakDays } = mockDashboard
  const unlockedCount = mockAchievements.filter((achievement) => achievement.unlocked).length

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Achievements</h1>
        <p className="mt-1 text-sm text-text-secondary">Level up, keep your streak alive and unlock badges</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-3">
        <Card elevated padding="lg" className="flex items-center gap-4" animate={false}>
          <ProgressRing value={xp} max={xpToNextLevel} color="purple" size={80} strokeWidth={7}>
            <Zap className="size-6 text-purple" />
          </ProgressRing>
          <div>
            <p className="text-sm text-text-secondary">Level</p>
            <p className="font-display text-2xl font-bold text-text-primary">{level}</p>
            <p className="text-xs text-text-muted">
              {xp} / {xpToNextLevel} XP
            </p>
          </div>
        </Card>

        <Card elevated padding="lg" className="flex items-center gap-4" animate={false}>
          <span className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-warning">
            <Flame className="size-7" />
          </span>
          <div>
            <p className="text-sm text-text-secondary">Current Streak</p>
            <p className="font-display text-2xl font-bold text-text-primary">{streakDays} days</p>
          </div>
        </Card>

        <Card elevated padding="lg" className="flex items-center gap-4" animate={false}>
          <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <span className="font-display text-lg font-bold">{unlockedCount}</span>
          </span>
          <div>
            <p className="text-sm text-text-secondary">Badges Unlocked</p>
            <p className="font-display text-2xl font-bold text-text-primary">
              {unlockedCount}
              <span className="text-sm font-normal text-text-muted"> / {mockAchievements.length}</span>
            </p>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <h2 className="mb-3 font-display text-lg font-semibold text-text-primary">Badges</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {mockAchievements.map((achievement) => (
            <Card
              key={achievement.id}
              padding="md"
              animate={false}
              className={cn('flex flex-col items-center gap-2 text-center', !achievement.unlocked && 'opacity-60')}
            >
              <span
                className={cn(
                  'flex size-14 items-center justify-center rounded-full',
                  achievement.unlocked ? 'bg-accent-soft text-accent' : 'bg-surface-elevated text-text-muted',
                )}
              >
                {achievement.unlocked ? (
                  <achievement.icon className="size-6" />
                ) : (
                  <Lock className="size-5" />
                )}
              </span>
              <p className="text-xs font-medium text-text-primary">{achievement.title}</p>
              <p className="text-[11px] leading-tight text-text-muted">{achievement.description}</p>
              <Badge variant={achievement.unlocked ? 'accent' : 'neutral'} className="mt-1">
                +{achievement.xpReward} XP
              </Badge>
            </Card>
          ))}
        </div>
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">Active Challenges</h2>
        {mockChallenges.map((challenge) => (
          <Card key={challenge.id} padding="md">
            <CardHeader>
              <div>
                <CardTitle>{challenge.title}</CardTitle>
                <CardDescription className="mt-0.5">{challenge.description}</CardDescription>
              </div>
              <Badge variant="purple">{challenge.daysLeft} days left</Badge>
            </CardHeader>
            <ProgressBar
              value={challenge.progress}
              max={challenge.goal}
              color="purple"
              label={`${challenge.progress} / ${challenge.goal} ${challenge.unit}`}
              showValue
            />
          </Card>
        ))}
      </motion.div>
    </motion.div>
  )
}
