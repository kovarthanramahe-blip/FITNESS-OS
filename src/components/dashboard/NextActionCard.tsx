import { motion } from 'framer-motion'
import { ArrowRight, Beef, CheckCircle2, Droplets, Dumbbell, ListChecks } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { buttonClassNames } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import type { NextAction, NextActionId } from '@/utils/dashboard'
import { cn } from '@/utils/cn'

const MotionLink = motion(Link)

const ACTION_ICONS: Record<NextActionId, ComponentType<{ className?: string; strokeWidth?: number }>> = {
  workout: Dumbbell,
  protein: Beef,
  water: Droplets,
  habit: ListChecks,
}

export interface NextActionCardProps {
  action: NextAction | null
  className?: string
}

/**
 * The single highest-priority thing to do today (see getNextAction) —
 * deliberately one compact row, not another full card, so it reads as a
 * quick pointer rather than competing with the dashboard's existing
 * widgets or repeating the numbers they already show in full.
 */
export function NextActionCard({ action, className }: NextActionCardProps) {
  if (!action) {
    return (
      <Card elevated padding="md" animate={false} className={cn('flex items-center gap-3', className)}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-semibold text-text-primary">All caught up for today</p>
          <p className="truncate text-xs text-text-secondary">Workout, nutrition, water and habits are all on track.</p>
        </div>
      </Card>
    )
  }

  const Icon = ACTION_ICONS[action.id]

  return (
    <Card elevated padding="md" animate={false} className={cn('flex items-center gap-3', className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon className="size-4" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">Next up</p>
        <p className="truncate font-display text-sm font-semibold text-text-primary">{action.title}</p>
        <p className="truncate text-xs text-text-secondary">{action.description}</p>
      </div>
      <MotionLink
        to={action.href}
        whileTap={{ scale: 0.95 }}
        className={cn(buttonClassNames('secondary', 'sm'), 'shrink-0 gap-1.5')}
      >
        Go
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </MotionLink>
    </Card>
  )
}
