import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type { WaterGoal, WaterUnit } from '@/types/nutrition'
import { litersToMl, mlToLiters } from '@/utils/nutrition'

export interface WaterGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: WaterGoal
  onSave: (goal: Partial<WaterGoal>) => void
}

/**
 * The default goal below is a sample app preference, not a medically
 * recommended intake — users are free to set whatever number works for them.
 */
export function WaterGoalModal({ isOpen, onClose, goal, onSave }: WaterGoalModalProps) {
  const [unit, setUnit] = useState<WaterUnit>(goal.preferredUnit)
  const [amount, setAmount] = useState(String(unit === 'l' ? mlToLiters(goal.goalMl) : goal.goalMl))

  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setUnit(goal.preferredUnit)
      setAmount(String(goal.preferredUnit === 'l' ? mlToLiters(goal.goalMl) : goal.goalMl))
    }
  }

  function handleUnitChange(nextUnit: WaterUnit) {
    const currentMl = unit === 'l' ? litersToMl(Number(amount) || 0) : Number(amount) || 0
    setUnit(nextUnit)
    setAmount(String(nextUnit === 'l' ? mlToLiters(currentMl) : currentMl))
  }

  const amountValue = Number(amount)
  const canSave = Number.isFinite(amountValue) && amountValue > 0

  function handleSave() {
    if (!canSave) return
    const goalMl = unit === 'l' ? litersToMl(amountValue) : Math.round(amountValue)
    onSave({ goalMl, preferredUnit: unit })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Water Goal"
      description="A personal target, not a medical recommendation."
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <Input
            label="Daily goal"
            type="number"
            inputMode="decimal"
            min={0}
            step={unit === 'l' ? 0.1 : 50}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <Select
            label="Unit"
            value={unit}
            onChange={(event) => handleUnitChange(event.target.value as WaterUnit)}
            options={[
              { value: 'l', label: 'L' },
              { value: 'ml', label: 'ml' },
            ]}
          />
        </div>
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          Save Goal
        </Button>
      </div>
    </Modal>
  )
}
