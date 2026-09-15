import { motion } from 'framer-motion'
import { Droplets, Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { staggerContainer, staggerItem } from '@/animations/variants'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { mockNutritionDay } from '@/data/mockNutrition'
import { clamp } from '@/utils/format'

const WATER_STEP_ML = 250

export function Nutrition() {
  const { target, consumed, meals, waterTargetMl } = mockNutritionDay
  const [waterMl, setWaterMl] = useState(mockNutritionDay.waterMl)

  const caloriesRemaining = Math.max(target.calories - consumed.calories, 0)
  const waterGlasses = Math.round(waterTargetMl / WATER_STEP_ML)
  const filledGlasses = Math.round(waterMl / WATER_STEP_ML)

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl font-bold text-text-primary">Nutrition</h1>
        <p className="mt-1 text-sm text-text-secondary">Track calories, macros and hydration for today</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid gap-4 lg:grid-cols-3">
        <Card elevated padding="lg" className="flex items-center gap-6 lg:col-span-1" animate={false}>
          <ProgressRing value={consumed.calories} max={target.calories} color="accent" size={104} strokeWidth={9}>
            <div className="text-center">
              <p className="font-display text-xl font-bold text-text-primary">{caloriesRemaining}</p>
              <p className="text-[10px] uppercase tracking-wide text-text-muted">kcal left</p>
            </div>
          </ProgressRing>
          <div>
            <p className="text-sm font-medium text-text-secondary">Calories</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {consumed.calories} <span className="text-sm font-normal text-text-muted">/ {target.calories}</span>
            </p>
          </div>
        </Card>

        <Card elevated padding="lg" className="lg:col-span-2" animate={false}>
          <CardHeader>
            <CardTitle>Macros</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-4">
            <ProgressBar
              value={consumed.proteinG}
              max={target.proteinG}
              color="secondary"
              label={`Protein — ${consumed.proteinG}g / ${target.proteinG}g`}
            />
            <ProgressBar
              value={consumed.carbsG}
              max={target.carbsG}
              color="purple"
              label={`Carbohydrates — ${consumed.carbsG}g / ${target.carbsG}g`}
            />
            <ProgressBar
              value={consumed.fatG}
              max={target.fatG}
              color="warning"
              label={`Fat — ${consumed.fatG}g / ${target.fatG}g`}
            />
          </div>
        </Card>
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

      <motion.div variants={staggerItem} className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="size-5 text-accent" />
          <h2 className="font-display text-lg font-semibold text-text-primary">Meals</h2>
        </div>
        {meals.map((meal) => (
          <Card key={meal.id} padding="md">
            <CardHeader>
              <div>
                <CardTitle>{meal.name}</CardTitle>
                <CardDescription className="mt-0.5">{meal.time}</CardDescription>
              </div>
              <Badge variant="accent">{meal.totals.calories} kcal</Badge>
            </CardHeader>
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {meal.items.map((item) => (
                <li key={item} className="rounded-full bg-surface-elevated px-2.5 py-1 text-xs text-text-secondary">
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-4 text-xs text-text-muted">
              <span>P {meal.totals.proteinG}g</span>
              <span>C {meal.totals.carbsG}g</span>
              <span>F {meal.totals.fatG}g</span>
            </div>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  )
}
