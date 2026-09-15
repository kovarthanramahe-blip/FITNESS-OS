import { Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { addWeightLog, deleteWeightLog, setWeightGoal, updateWeightLog, useProgressStore } from '@/lib/progressStore'
import type { ProgressTimeRange, WeightLog } from '@/types/progress'
import {
  getAverageWeeklyChangeKg,
  getCurrentWeightLog,
  getHighestWeightLog,
  getLowestWeightLog,
  getTargetProgressPercent,
  getWeightChangeKg,
  isChangeTowardGoal,
} from '@/utils/progress'
import { TimeRangeSelector } from './TimeRangeSelector'
import { WeightChart } from './WeightChart'
import { WeightEntryModal } from './WeightEntryModal'
import { WeightGoalModal } from './WeightGoalModal'
import { WeightLogList } from './WeightLogList'

export function WeightTab() {
  const { weightLogs, weightGoal } = useProgressStore()
  const [range, setRange] = useState<ProgressTimeRange>('3M')
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null)

  const current = getCurrentWeightLog(weightLogs)
  const lowest = getLowestWeightLog(weightLogs)
  const highest = getHighestWeightLog(weightLogs)
  const avgWeeklyChange = getAverageWeeklyChangeKg(weightLogs)

  const currentKg = current?.weightKg ?? weightGoal.startingWeightKg
  const changeKg = getWeightChangeKg(currentKg, weightGoal.startingWeightKg)
  const progressPercent = getTargetProgressPercent(currentKg, weightGoal.startingWeightKg, weightGoal.targetWeightKg)
  const movingTowardGoal = isChangeTowardGoal(changeKg, weightGoal.startingWeightKg, weightGoal.targetWeightKg)

  function handleAddClick() {
    setEditingLog(null)
    setIsEntryModalOpen(true)
  }

  function handleEdit(log: WeightLog) {
    setEditingLog(log)
    setIsEntryModalOpen(true)
  }

  function handleDelete(log: WeightLog) {
    if (window.confirm(`Delete the ${log.weightKg} kg entry from ${log.date}?`)) {
      deleteWeightLog(log.id)
    }
  }

  function handleSaveEntry(entry: { date: string; weightKg: number; note?: string }) {
    if (editingLog) {
      updateWeightLog(editingLog.id, entry)
    } else {
      addWeightLog(entry)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Current Weight" value={currentKg.toFixed(1)} unit="kg" />
        <StatCard label="Starting Weight" value={weightGoal.startingWeightKg.toFixed(1)} unit="kg" />
        <StatCard label="Target Weight" value={weightGoal.targetWeightKg.toFixed(1)} unit="kg" />
        <StatCard
          label="Change"
          value={`${changeKg > 0 ? '+' : ''}${changeKg.toFixed(1)}`}
          unit="kg"
          trend={
            changeKg !== 0
              ? { value: movingTowardGoal ? 'toward goal' : 'away from goal', direction: movingTowardGoal ? 'up' : 'down' }
              : undefined
          }
        />
        <Card padding="md">
          <p className="text-sm text-text-secondary">Progress</p>
          <p className="mt-3 font-display text-2xl font-bold text-text-primary">
            {progressPercent === null ? '—' : `${Math.round(progressPercent)}%`}
          </p>
          <div className="mt-3">
            <ProgressBar value={progressPercent ?? 0} max={100} color="purple" size="sm" />
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Weight Trend</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Edit weight goal" onClick={() => setIsGoalModalOpen(true)}>
              <Settings2 className="size-4" />
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={handleAddClick}>
              Add Weight
            </Button>
          </div>
        </CardHeader>
        <TimeRangeSelector value={range} onChange={setRange} className="mb-4" />
        <WeightChart logs={weightLogs} targetWeightKg={weightGoal.targetWeightKg} range={range} />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Avg. Weekly Change"
          value={avgWeeklyChange === null ? 'Not enough data' : `${avgWeeklyChange > 0 ? '+' : ''}${avgWeeklyChange.toFixed(1)}`}
          unit={avgWeeklyChange === null ? undefined : 'kg/week'}
        />
        <StatCard label="Lowest Recorded" value={lowest ? lowest.weightKg.toFixed(1) : '—'} unit={lowest ? 'kg' : undefined} />
        <StatCard label="Highest Recorded" value={highest ? highest.weightKg.toFixed(1) : '—'} unit={highest ? 'kg' : undefined} />
      </div>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Weight Log</CardTitle>
        </CardHeader>
        <WeightLogList logs={weightLogs} onEdit={handleEdit} onDelete={handleDelete} />
      </Card>

      <WeightEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        editingLog={editingLog}
      />
      <WeightGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goal={weightGoal}
        onSave={setWeightGoal}
      />
    </div>
  )
}
