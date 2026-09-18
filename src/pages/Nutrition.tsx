import { motion } from 'framer-motion'
import { Settings2 } from 'lucide-react'
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
import { WaterGoalModal } from '@/components/habits/WaterGoalModal'
import { WaterTracker } from '@/components/habits/WaterTracker'
import { addFoodEntry, deleteFoodEntry, editFoodEntry, setNutritionGoals, useNutritionStore } from '@/lib/nutritionStore'
import { addWaterLog, removeLatestWaterLog, setWaterGoal, useHabitStore } from '@/lib/habitStore'
import { useProgressStore } from '@/lib/progressStore'
import { MEAL_TYPES } from '@/types/nutrition'
import type { FoodEntry, MealType, NutritionTimeRange } from '@/types/nutrition'
import { getTodayDateString } from '@/utils/dateRange'
import { getDailyNutrition, getNutritionHistory, goalToMacroTargets } from '@/utils/nutrition'

export function Nutrition() {
  const { entries, goal } = useNutritionStore()
  const { weightLogs } = useProgressStore()
  const { waterLogs, waterGoal } = useHabitStore()

  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
  const [modalDefaultMeal, setModalDefaultMeal] = useState<MealType>('breakfast')
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false)
  const [isWaterGoalModalOpen, setIsWaterGoalModalOpen] = useState(false)
  const [historyRange, setHistoryRange] = useState<NutritionTimeRange>('30D')

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
        <WaterTracker
          logs={waterLogs}
          goal={waterGoal}
          date={selectedDate}
          onAdd={(amountMl) => addWaterLog(amountMl, selectedDate)}
          onUndo={() => removeLatestWaterLog(selectedDate)}
          onEditGoal={() => setIsWaterGoalModalOpen(true)}
        />
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
      <WaterGoalModal
        isOpen={isWaterGoalModalOpen}
        onClose={() => setIsWaterGoalModalOpen(false)}
        goal={waterGoal}
        onSave={setWaterGoal}
      />
    </motion.div>
  )
}
