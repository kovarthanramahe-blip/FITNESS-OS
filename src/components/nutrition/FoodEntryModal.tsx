import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { sampleFoodLibrary } from '@/data/foodLibrary'
import { MEAL_LABELS, MEAL_TYPES } from '@/types/nutrition'
import type { FoodEntry, MealType } from '@/types/nutrition'
import { getTodayDateString } from '@/utils/dateRange'

export interface FoodEntrySaveInput {
  foodId: string
  foodName: string
  meal: MealType
  quantity: number
  servingUnit: string
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  date: string
}

export interface FoodEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (entry: FoodEntrySaveInput) => void
  editingEntry?: FoodEntry | null
  defaultMeal?: MealType
  defaultDate?: string
}

const CUSTOM_OPTION = '__custom__'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function FoodEntryModal({ isOpen, onClose, onSave, editingEntry, defaultMeal, defaultDate }: FoodEntryModalProps) {
  const [foodChoice, setFoodChoice] = useState<string>(CUSTOM_OPTION)
  const [customName, setCustomName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [servingUnit, setServingUnit] = useState('serving')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [fiber, setFiber] = useState('')
  const [meal, setMeal] = useState<MealType>(defaultMeal ?? 'breakfast')
  const [date, setDate] = useState(defaultDate ?? getTodayDateString())

  // Resets the form whenever the modal opens (fresh, or for a different
  // entry), without an Effect — see WeightEntryModal for the same pattern.
  const openKey = isOpen ? (editingEntry?.id ?? 'new') : null
  const [lastOpenKey, setLastOpenKey] = useState<string | null>(null)
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey)
    if (openKey) {
      const libraryMatch = editingEntry ? sampleFoodLibrary.find((food) => food.id === editingEntry.foodId) : undefined
      setFoodChoice(editingEntry ? (libraryMatch ? libraryMatch.id : CUSTOM_OPTION) : CUSTOM_OPTION)
      setCustomName(editingEntry && !libraryMatch ? editingEntry.foodName : '')
      setQuantity(editingEntry ? String(editingEntry.quantity) : '1')
      setServingUnit(editingEntry ? editingEntry.servingUnit : 'serving')
      setCalories(editingEntry ? String(editingEntry.calories) : '')
      setProtein(editingEntry ? String(editingEntry.protein) : '')
      setCarbs(editingEntry ? String(editingEntry.carbohydrates) : '')
      setFat(editingEntry ? String(editingEntry.fat) : '')
      setFiber(editingEntry ? String(editingEntry.fiber) : '')
      setMeal(editingEntry?.meal ?? defaultMeal ?? 'breakfast')
      setDate(editingEntry?.date ?? defaultDate ?? getTodayDateString())
    }
  }

  function applyFoodDefaults(foodId: string, forQuantity: number) {
    const food = sampleFoodLibrary.find((candidate) => candidate.id === foodId)
    if (!food) return
    const multiplier = forQuantity > 0 ? forQuantity : 0
    setServingUnit(food.servingUnit)
    setCalories(String(Math.round(food.calories * multiplier)))
    setProtein(String(round1(food.protein * multiplier)))
    setCarbs(String(round1(food.carbohydrates * multiplier)))
    setFat(String(round1(food.fat * multiplier)))
    setFiber(String(round1(food.fiber * multiplier)))
  }

  function handleFoodChoiceChange(value: string) {
    setFoodChoice(value)
    if (value !== CUSTOM_OPTION) {
      applyFoodDefaults(value, Number(quantity) || 1)
    }
  }

  function handleQuantityChange(value: string) {
    setQuantity(value)
    if (foodChoice !== CUSTOM_OPTION) {
      applyFoodDefaults(foodChoice, Number(value) || 0)
    }
  }

  const resolvedName = foodChoice === CUSTOM_OPTION ? customName.trim() : (sampleFoodLibrary.find((f) => f.id === foodChoice)?.name ?? '')
  const quantityValue = Number(quantity)
  const caloriesValue = Number(calories)
  const proteinValue = Number(protein)
  const carbsValue = Number(carbs)
  const fatValue = Number(fat)
  const fiberValue = Number(fiber)

  const canSave =
    resolvedName.length > 0 &&
    date.length > 0 &&
    Number.isFinite(quantityValue) &&
    quantityValue > 0 &&
    Number.isFinite(caloriesValue) &&
    caloriesValue >= 0 &&
    Number.isFinite(proteinValue) &&
    proteinValue >= 0 &&
    Number.isFinite(carbsValue) &&
    carbsValue >= 0 &&
    Number.isFinite(fatValue) &&
    fatValue >= 0 &&
    Number.isFinite(fiberValue) &&
    fiberValue >= 0

  function handleSave() {
    if (!canSave) return
    onSave({
      foodId: foodChoice === CUSTOM_OPTION ? `custom-${resolvedName.toLowerCase().replace(/\s+/g, '-')}` : foodChoice,
      foodName: resolvedName,
      meal,
      quantity: quantityValue,
      servingUnit: servingUnit.trim() || 'serving',
      calories: caloriesValue,
      protein: proteinValue,
      carbohydrates: carbsValue,
      fat: fatValue,
      fiber: fiberValue,
      date,
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingEntry ? 'Edit Food' : 'Add Food'}>
      <div className="flex flex-col gap-4">
        <Select
          label="Food"
          value={foodChoice}
          onChange={(event) => handleFoodChoiceChange(event.target.value)}
          options={[
            { value: CUSTOM_OPTION, label: 'Custom food…' },
            ...sampleFoodLibrary.map((food) => ({ value: food.id, label: food.name })),
          ]}
        />
        {foodChoice === CUSTOM_OPTION && (
          <Input
            label="Custom food name"
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="e.g. Homemade curry"
          />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Quantity"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={quantity}
            onChange={(event) => handleQuantityChange(event.target.value)}
          />
          <Input
            label="Serving unit"
            value={servingUnit}
            onChange={(event) => setServingUnit(event.target.value)}
            placeholder="e.g. cup, g, slice"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Calories"
            type="number"
            inputMode="decimal"
            step={1}
            min={0}
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
          />
          <Input
            label="Protein (g)"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Carbs (g)"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
          />
          <Input
            label="Fat (g)"
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            value={fat}
            onChange={(event) => setFat(event.target.value)}
          />
        </div>

        <Input
          label="Fiber (g)"
          type="number"
          inputMode="decimal"
          step={0.1}
          min={0}
          value={fiber}
          onChange={(event) => setFiber(event.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Meal"
            value={meal}
            onChange={(event) => setMeal(event.target.value as MealType)}
            options={MEAL_TYPES.map((type) => ({ value: type, label: MEAL_LABELS[type] }))}
          />
          <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={getTodayDateString()} />
        </div>

        <Button variant="primary" size="lg" className="w-full justify-center" onClick={handleSave} disabled={!canSave}>
          {editingEntry ? 'Save Changes' : 'Add Food'}
        </Button>
      </div>
    </Modal>
  )
}
