import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { WeightGoal } from '@/types/progress'

export interface WeightGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: WeightGoal
  onSave: (goal: { startingWeightKg: number; targetWeightKg: number }) => void
}

export function WeightGoalModal({ isOpen, onClose, goal, onSave }: WeightGoalModalProps) {
  const [starting, setStarting] = useState(String(goal.startingWeightKg))
  const [target, setTarget] = useState(String(goal.targetWeightKg))

  // Resets the form fields whenever the modal opens, without an Effect: see
  // WeightEntryModal for the same pattern.
  const openKey = isOpen ? 'open' : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      setStarting(String(goal.startingWeightKg))
      setTarget(String(goal.targetWeightKg))
    }
  }

  const startingValue = Number(starting)
  const targetValue = Number(target)
  const canSave = Number.isFinite(startingValue) && startingValue > 0 && Number.isFinite(targetValue) && targetValue > 0

  function handleSave() {
    if (!canSave) return
    onSave({ startingWeightKg: startingValue, targetWeightKg: targetValue })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Weight Goal" description="Used to calculate your progress toward target.">
      <div className="flex flex-col gap-4">
        <Input
          label="Starting weight (kg)"
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          value={starting}
          onChange={(event) => setStarting(event.target.value)}
        />
        <Input
          label="Target weight (kg)"
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          hint="Can be lower or higher than your starting weight — whichever direction you're working toward."
        />
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          Save Goal
        </Button>
      </div>
    </Modal>
  )
}
