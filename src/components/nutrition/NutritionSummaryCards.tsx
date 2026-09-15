import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import type { MacroTargets, MacroTotals } from '@/types/nutrition'
import { getCaloriesOverTarget, getRemainingCalories, isOverTarget } from '@/utils/nutrition'

export interface NutritionSummaryCardsProps {
  totals: MacroTotals
  targets: MacroTargets
}

export function NutritionSummaryCards({ totals, targets }: NutritionSummaryCardsProps) {
  const remaining = getRemainingCalories(totals.calories, targets.calories)
  const overBy = getCaloriesOverTarget(totals.calories, targets.calories)
  const over = isOverTarget(totals.calories, targets.calories)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card elevated padding="lg" className="flex items-center gap-6 lg:col-span-1" animate={false}>
        <ProgressRing value={totals.calories} max={targets.calories} color={over ? 'warning' : 'accent'} size={104} strokeWidth={9}>
          <div className="text-center">
            <p className="font-display text-xl font-bold text-text-primary">{over ? overBy : remaining}</p>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">{over ? 'kcal over' : 'kcal left'}</p>
          </div>
        </ProgressRing>
        <div>
          <p className="text-sm font-medium text-text-secondary">Calories</p>
          <p className="mt-1 text-2xl font-bold text-text-primary" data-testid="calories-total">
            {totals.calories} <span className="text-sm font-normal text-text-muted">/ {targets.calories}</span>
          </p>
          <p className="mt-1 text-xs text-text-muted">{over ? `Over target by ${overBy} kcal` : `${remaining} kcal remaining`}</p>
        </div>
      </Card>

      <Card elevated padding="lg" className="lg:col-span-2" animate={false}>
        <CardHeader>
          <CardTitle>Macros</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-4">
          <div data-testid="protein-total">
            <ProgressBar
              value={totals.protein}
              max={targets.protein}
              color="secondary"
              label={`Protein — ${totals.protein}g / ${targets.protein}g`}
            />
          </div>
          <div data-testid="carbs-total">
            <ProgressBar
              value={totals.carbohydrates}
              max={targets.carbohydrates}
              color="purple"
              label={`Carbs — ${totals.carbohydrates}g / ${targets.carbohydrates}g`}
            />
          </div>
          <div data-testid="fat-total">
            <ProgressBar
              value={totals.fat}
              max={targets.fat}
              color="warning"
              label={`Fat — ${totals.fat}g / ${targets.fat}g`}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
