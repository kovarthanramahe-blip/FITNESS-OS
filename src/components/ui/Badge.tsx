import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/utils/cn'

export type BadgeVariant = 'neutral' | 'accent' | 'secondary' | 'purple' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-elevated text-text-secondary border-border',
  accent: 'bg-accent-soft text-accent border-transparent',
  secondary: 'bg-secondary-soft text-secondary border-transparent',
  purple: 'bg-purple-soft text-purple border-transparent',
  success: 'bg-success/10 text-success border-transparent',
  warning: 'bg-warning/10 text-warning border-transparent',
  danger: 'bg-danger/10 text-danger border-transparent',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium leading-none',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
