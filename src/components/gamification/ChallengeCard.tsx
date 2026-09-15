import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ChallengeMetric, ChallengeProgress } from '@/types/gamification'

const METRIC_UNIT_LABELS: Record<ChallengeMetric, string> = {
  workout_count: 'workouts',
  habit_completion: 'habits',
  water_goal_days: 'water days',
  nutrition_logging_days: 'meals',
  weight_logging_days: 'weight logs',
  pr_count: 'PRs',
  volume_target: 'kg volume',
}

function formatProgressLabel(progress: ChallengeProgress): string {
  const { challenge, current, target } = progress
  if (challenge.metric === 'habit_completion' && challenge.period === 'weekly') {
    return `${current}% / ${target}%`
  }
  return `${current} / ${target} ${METRIC_UNIT_LABELS[challenge.metric]}`
}

export interface ChallengeCardProps {
  progress: ChallengeProgress
}

export function ChallengeCard({ progress }: ChallengeCardProps) {
  const { challenge, completed, remaining } = progress

  return (
    <Card padding="md" data-testid={`challenge-card-${progress.instanceId}`}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{challenge.name}</CardTitle>
          <CardDescription className="mt-0.5">{challenge.description}</CardDescription>
        </div>
        {completed ? (
          <Badge variant="success" className="shrink-0">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Completed
          </Badge>
        ) : (
          <Badge variant="purple" className="shrink-0">
            +{challenge.xpReward} XP
          </Badge>
        )}
      </CardHeader>
      <ProgressBar
        value={progress.current}
        max={progress.target}
        color={completed ? 'success' : 'purple'}
        label={formatProgressLabel(progress)}
        showValue
      />
      {!completed && (
        <p className="mt-2 text-xs text-text-muted">
          {remaining} {METRIC_UNIT_LABELS[challenge.metric]} to go
        </p>
      )}
    </Card>
  )
}
