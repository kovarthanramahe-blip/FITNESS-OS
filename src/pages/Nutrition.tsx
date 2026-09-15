import { motion } from 'framer-motion'
import { Droplets, Minus, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { TimeRangeSelector } from '@/components/shared/TimeRangeSelector'
import { DateNavigator } from '@/components/nutrition/DateNavigator'
import { FoodEntryModal } from '@/components/nutrition/FoodEntryModal'
import type { FoodEntrySaveInput } from '@/components/nutrition/FoodEntryModal'
import { MealSection } from '@/components/nutrition/MealSection'
import { NutritionGoalsModal } from '@/components/nutrition/NutritionGoalsModal'
import { NutritionHistoryChart } from '@/components/nutrition/NutritionHistoryChart'
import { NutritionInsights } from '@/components/nutrition/NutritionInsights'
import { NutritionSummaryCards } from '@/components/nutrition/NutritionSummaryCards'
import { TodaysWeightCard } from '@/components/nutrition/TodaysWeightCard'
import { mockDashboardData } from '@/data/mockDashboard'
import { addFoodEntry, deleteFoodEntry, editFoodEntry, setNutritionGoals, useNutritionStore } from '@/lib/nutritionStore'
import { useProgressStore } from '@/lib/progressStore'
import { MEAL_TYPES } from '@/types/nutrition'
import type { FoodEntry, MealType, NutritionTimeRange } from '@/types/nutrition'
import { clamp } from '@/utils/format'
import { getDailyNutrition, getNutritionHistory, goalToMacroTargets } from '@/utils/nutrition'

const WATER_STEP_ML = 250

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function Nutrition() {
  const { entries, goal } = useNutritionStore()
  const { weightLogs } = useProgressStore()

  const [selectedDate, setSelectedDate] = useState(today())
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
  const [modalDefaultMeal, setModalDefaultMeal] = useState<MealType>('breakfast')
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [historyRange, setHistoryRange] = useState<NutritionTimeRange>('30D')
  const [waterMl, setWaterMl] = useState(mockDashboardData.water.consumedMl)

  const waterTargetMl = mockDashboardData.water.targetMl
  const waterGlasses = Math.round(waterTargetMl / WATER_STEP_ML)
  const filledGlasses = Math.round(waterMl / WATER_STEP_ML)

  const daily = getDailyNutrition(entries, selectedDate)
  const targets = goalToMacroTargets(goal)
  const history = getNutritionHistory(entries, historyRange)

  function handleAddFood(meal: MealType) {
    setEditingEntry(null)
    setModalDefaultMeal(meal)
    setIsFoodModalOpen(true)
  }

  function handleEditFood(entry: FoodEntry) {
    setEditingEntry(entry)
    setIsFoodModalOpen(true)
  }

  function handleDeleteFood(entry: FoodEntry) {
    if (window.confirm(`Delete ${entry.foodName}?`)) {
      deleteFoodEntry(entry.id)
    }
  }

  function handleSaveFood(input: FoodEntrySaveInput) {
    if (editingEntry) {
      editFoodEntry(editingEntry.id, input)
    } else {
      addFoodEntry(input)
    }
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem} className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">Nutrition</h1>
          <p className="mt-1 text-sm text-text-secondary">Track calories, macros and hydration</p>
        </div>
        <DateNavigator date={selectedDate} onChange={setSelectedDate} />
      </motion.div>

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" leftIcon={<Settings2 className="size-4" />} onClick={() => setIsGoalsModalOpen(true)}>
            Nutrition Goals
          </Button>
        </div>
        <NutritionSummaryCards totals={daily.totals} targets={targets} />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Droplets className="size-5 text-secondary" />
              <CardTitle>Water Intake</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Remove one glass of water"
                onClick={() => setWaterMl((current) => clamp(current - WATER_STEP_ML, 0, waterTargetMl * 2))}
              >
                <Minus className="size-4" />
              </Button>
              <Button
                variant="primary"
                size="icon"
                aria-label="Add one glass of water"
                onClick={() => setWaterMl((current) => clamp(current + WATER_STEP_ML, 0, waterTargetMl * 2))}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: waterGlasses }).map((_, index) => (
              <span
                key={index}
                className={`flex size-9 items-center justify-center rounded-[var(--radius-sm)] border transition-colors ${
                  index < filledGlasses
                    ? 'border-secondary/40 bg-secondary-soft text-secondary'
                    : 'border-border text-text-muted'
                }`}
              >
                <Droplets className="size-4" />
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-text-secondary">
            {(waterMl / 1000).toFixed(2)} L of {(waterTargetMl / 1000).toFixed(1)} L goal
          </p>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {MEAL_TYPES.map((meal) => (
            <MealSection
              key={meal}
              meal={meal}
              entries={daily.entriesByMeal[meal]}
              onAdd={handleAddFood}
              onEdit={handleEditFood}
              onDelete={handleDeleteFood}
            />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <TodaysWeightCard />
          <NutritionInsights totals={daily.totals} targets={targets} weightLogs={weightLogs} />
        </div>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Nutrition History</CardTitle>
          </CardHeader>
          <TimeRangeSelector value={historyRange} onChange={setHistoryRange} className="mb-4" />
          <NutritionHistoryChart history={history} />
        </Card>
      </motion.div>

      <FoodEntryModal
        isOpen={isFoodModalOpen}
        onClose={() => setIsFoodModalOpen(false)}
        onSave={handleSaveFood}
        editingEntry={editingEntry}
        defaultMeal={modalDefaultMeal}
        defaultDate={selectedDate}
      />
      <NutritionGoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        goal={goal}
        onSave={setNutritionGoals}
      />
    </motion.div>
  )
}
