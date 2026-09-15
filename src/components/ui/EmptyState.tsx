import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-border px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="flex size-12 items-center justify-center rounded-full bg-surface-elevated text-text-muted">
          <Icon className="size-6" />
        </span>
      )}
      <div>
        <p className="font-display text-sm font-semibold text-text-primary">{title}</p>
        {description && <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button size="sm" variant="secondary" onClick={onAction} className="mt-1">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
