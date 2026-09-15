import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { NutritionGoal } from '@/types/nutrition'

export interface NutritionGoalsModalProps {
  isOpen: boolean
  onClose: () => void
  goal: NutritionGoal
  onSave: (goal: Partial<NutritionGoal>) => void
}

export function NutritionGoalsModal({ isOpen, onClose, goal, onSave }: NutritionGoalsModalProps) {
  const [calories, setCalories] = useState(String(goal.dailyCalories))
  const [protein, setProtein] = useState(String(goal.proteinGrams))
  const [carbs, setCarbs] = useState(String(goal.carbohydrateGrams))
  const [fat, setFat] = useState(String(goal.fatGrams))
  const [fiber, setFiber] = useState(goal.fiberGrams !== undefined ? String(goal.fiberGrams) : '')

  // Resets the form whenever the modal opens — see WeightEntryModal for the
  // same render-time pattern instead of an Effect.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setCalories(String(goal.dailyCalories))
      setProtein(String(goal.proteinGrams))
      setCarbs(String(goal.carbohydrateGrams))
      setFat(String(goal.fatGrams))
      setFiber(goal.fiberGrams !== undefined ? String(goal.fiberGrams) : '')
    }
  }

  const caloriesValue = Number(calories)
  const proteinValue = Number(protein)
  const carbsValue = Number(carbs)
  const fatValue = Number(fat)
  const fiberValue = fiber.trim() === '' ? undefined : Number(fiber)

  const canSave =
    Number.isFinite(caloriesValue) &&
    caloriesValue > 0 &&
    Number.isFinite(proteinValue) &&
    proteinValue >= 0 &&
    Number.isFinite(carbsValue) &&
    carbsValue >= 0 &&
    Number.isFinite(fatValue) &&
    fatValue >= 0 &&
    (fiberValue === undefined || (Number.isFinite(fiberValue) && fiberValue >= 0))

  function handleSave() {
    if (!canSave) return
    onSave({
      dailyCalories: caloriesValue,
      proteinGrams: proteinValue,
      carbohydrateGrams: carbsValue,
      fatGrams: fatValue,
      fiberGrams: fiberValue,
    })
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nutrition Goals"
      description="Set targets that fit your own goal — maintenance, a deficit, or a surplus."
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Daily calories"
          type="number"
          inputMode="decimal"
          step={10}
          min={0}
          value={calories}
          onChange={(event) => setCalories(event.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Protein (g)"
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
          />
          <Input
            label="Carbs (g)"
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fat (g)"
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            value={fat}
            onChange={(event) => setFat(event.target.value)}
          />
          <Input
            label="Fiber (g, optional)"
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            value={fiber}
            onChange={(event) => setFiber(event.target.value)}
          />
        </div>
        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          Save Goals
        </Button>
      </div>
    </Modal>
  )
}
