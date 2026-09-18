import { Droplets, Plus, Settings2, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { WaterGoal, WaterLog } from '@/types/nutrition'
import { getDailyWaterMl, getRemainingWaterMl, getWaterGoalPercent, litersToMl, mlToLiters } from '@/utils/nutrition'
import { getTodayDateString } from '@/utils/dateRange'

export interface WaterTrackerProps {
  logs: WaterLog[]
  goal: WaterGoal
  /**
   * The calendar date this tracker reads and writes, as a yyyy-mm-dd
   * string — defaults to today for callers with no date navigation of
   * their own (Habits page, Dashboard). A page that lets the user browse
   * other dates (e.g. Nutrition's DateNavigator) must pass its selected
   * date here; otherwise this component silently displays and edits
   * today's water regardless of what date the rest of the page shows.
   */
  date?: string
  onAdd: (amountMl: number) => void
  onUndo: () => void
  onEditGoal: () => void
}

const QUICK_ADD_ML = [250, 500, 750]

function formatAmount(ml: number, unit: WaterGoal['preferredUnit']): string {
  return unit === 'l' ? `${mlToLiters(ml)} L` : `${ml} ml`
}

export function WaterTracker({ logs, goal, date, onAdd, onUndo, onEditGoal }: WaterTrackerProps) {
  const [customAmount, setCustomAmount] = useState('')
  const activeDate = date ?? getTodayDateString()
  const isToday = activeDate === getTodayDateString()
  const consumedMl = getDailyWaterMl(logs, activeDate)
  const percent = getWaterGoalPercent(consumedMl, goal.goalMl)
  const remainingMl = getRemainingWaterMl(consumedMl, goal.goalMl)
  const hasLoggedForDate = logs.some((log) => log.date === activeDate)

  const customValue = Number(customAmount)
  const customValueMl = goal.preferredUnit === 'l' ? litersToMl(customValue || 0) : Math.round(customValue || 0)
  const canAddCustom = Number.isFinite(customValue) && customValue > 0

  function handleAddCustom() {
    if (!canAddCustom) return
    onAdd(customValueMl)
    setCustomAmount('')
  }

  return (
    <Card padding="lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Droplets className="size-5 text-secondary" />
          <CardTitle>{isToday ? 'Water' : `Water · ${activeDate}`}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" aria-label="Edit water goal" onClick={onEditGoal}>
          <Settings2 className="size-4" />
        </Button>
      </CardHeader>

      <p className="font-display text-2xl font-bold text-text-primary" data-testid="water-total">
        {formatAmount(consumedMl, goal.preferredUnit)}{' '}
        <span className="text-sm font-normal text-text-muted">/ {formatAmount(goal.goalMl, goal.preferredUnit)}</span>
      </p>
      <div className="mt-3">
        <ProgressBar value={consumedMl} max={goal.goalMl} color="secondary" />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {remainingMl > 0 ? `${formatAmount(remainingMl, goal.preferredUnit)} remaining` : 'Goal reached'} · {Math.round(percent)}%
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_ADD_ML.map((amount) => (
          <Button
            key={amount}
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="size-3.5" />}
            onClick={() => onAdd(amount)}
          >
            {amount} ml
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Undo2 className="size-3.5" />}
          onClick={onUndo}
          disabled={!hasLoggedForDate}
        >
          Undo latest
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          aria-label="Custom water amount"
          type="number"
          inputMode="decimal"
          min={0}
          step={goal.preferredUnit === 'l' ? 0.1 : 50}
          placeholder={goal.preferredUnit === 'l' ? 'Custom amount (L)' : 'Custom amount (ml)'}
          value={customAmount}
          onChange={(event) => setCustomAmount(event.target.value)}
          className="h-10"
        />
        <Button variant="secondary" size="sm" onClick={handleAddCustom} disabled={!canAddCustom} leftIcon={<Plus className="size-3.5" />}>
          Add
        </Button>
      </div>
    </Card>
  )
}
