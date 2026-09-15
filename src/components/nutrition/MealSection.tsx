import { AnimatePresence, motion } from 'framer-motion'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { fadeIn } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MEAL_LABELS } from '@/types/nutrition'
import type { FoodEntry, MealType } from '@/types/nutrition'
import { sumMacros } from '@/utils/nutrition'

export interface MealSectionProps {
  meal: MealType
  entries: FoodEntry[]
  onAdd: (meal: MealType) => void
  onEdit: (entry: FoodEntry) => void
  onDelete: (entry: FoodEntry) => void
}

export function MealSection({ meal, entries, onAdd, onEdit, onDelete }: MealSectionProps) {
  const totals = sumMacros(entries)

  return (
    <Card padding="md" data-testid={`meal-section-${meal}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{MEAL_LABELS[meal]}</CardTitle>
          {entries.length > 0 && <Badge variant="accent">{totals.calories} kcal</Badge>}
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Plus className="size-4" />} onClick={() => onAdd(meal)}>
          Add Food
        </Button>
      </CardHeader>

      {entries.length === 0 ? (
        <EmptyState title={`No ${MEAL_LABELS[meal].toLowerCase()} logged yet`} className="py-6" />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border">
            <AnimatePresence initial={false}>
              {entries.map((entry) => (
                <motion.li
                  key={entry.id}
                  layout
                  variants={fadeIn}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{entry.foodName}</p>
                    <p className="text-xs text-text-muted">
                      {entry.quantity} {entry.servingUnit} · {entry.calories} kcal
                    </p>
                    <p className="text-xs text-text-muted">
                      P {entry.protein}g · C {entry.carbohydrates}g · F {entry.fat}g
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${entry.foodName}`} onClick={() => onEdit(entry)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${entry.foodName}`} onClick={() => onDelete(entry)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <div className="mt-3 flex gap-4 border-t border-border pt-3 text-xs text-text-muted">
            <span>Total {totals.calories} kcal</span>
            <span>P {totals.protein}g</span>
            <span>C {totals.carbohydrates}g</span>
            <span>F {totals.fat}g</span>
          </div>
        </>
      )}
    </Card>
  )
}
