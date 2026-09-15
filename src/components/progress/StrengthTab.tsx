import { useState } from 'react'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatCard } from '@/components/ui/StatCard'
import { getCompletedSessionsMostRecentFirst, useWorkoutStore } from '@/lib/workoutStore'
import { getStrengthProgress, getTrainedExerciseIds } from '@/utils/progress'
import { ExerciseSelector } from './ExerciseSelector'
import { StrengthChart } from './StrengthChart'

export function StrengthTab() {
  const { personalRecords } = useWorkoutStore()
  const sessions = getCompletedSessionsMostRecentFirst()
  const trainedExerciseIds = getTrainedExerciseIds(sessions)

  const [selectedExerciseId, setSelectedExerciseId] = useState(trainedExerciseIds[0] ?? '')
  const effectiveExerciseId = trainedExerciseIds.includes(selectedExerciseId)
    ? selectedExerciseId
    : (trainedExerciseIds[0] ?? '')

  if (trainedExerciseIds.length === 0 || !effectiveExerciseId) {
    return (
      <EmptyState
        title="No strength data yet"
        description="Complete a workout with logged sets to start tracking your strength progress."
      />
    )
  }

  const progress = getStrengthProgress(effectiveExerciseId, sessions, personalRecords)

  const currentEstimate = progress.history[progress.history.length - 1]?.estimatedOneRepMax ?? null
  const previousEstimate = progress.history[progress.history.length - 2]?.estimatedOneRepMax ?? null
  const changeFromPrevious =
    currentEstimate !== null && previousEstimate !== null ? Math.round(currentEstimate - previousEstimate) : null

  return (
    <div className="flex flex-col gap-6">
      <Card padding="lg">
        <CardHeader>
          <CardTitle>Strength Progress</CardTitle>
        </CardHeader>
        <ExerciseSelector
          exerciseIds={trainedExerciseIds}
          value={effectiveExerciseId}
          onChange={setSelectedExerciseId}
          className="mb-4"
        />
        <StrengthChart history={progress.history} />
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current Best"
          value={progress.currentBest ? `${progress.currentBest.weightKg} × ${progress.currentBest.reps}` : '—'}
          unit={progress.currentBest ? 'kg' : undefined}
        />
        <StatCard
          label="Est. One-Rep Max"
          value={progress.estimatedOneRepMax === null ? '—' : String(Math.round(progress.estimatedOneRepMax))}
          unit={progress.estimatedOneRepMax === null ? undefined : 'kg'}
          trend={
            changeFromPrevious !== null && changeFromPrevious !== 0
              ? {
                  value: `${changeFromPrevious > 0 ? '+' : ''}${changeFromPrevious} kg`,
                  direction: changeFromPrevious > 0 ? 'up' : 'down',
                }
              : undefined
          }
        />
        <StatCard label="Total Volume" value={progress.totalVolumeKg.toLocaleString()} unit="kg" />
        <StatCard label="Personal Records" value={String(progress.personalRecordCount)} />
      </div>
    </div>
  )
}
