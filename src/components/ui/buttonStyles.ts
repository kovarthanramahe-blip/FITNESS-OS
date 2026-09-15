import { cn } from '@/utils/cn'
import type { ButtonSize, ButtonVariant } from './Button'

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-text-inverse hover:bg-accent-strong shadow-[var(--shadow-card)] focus-ring-on-accent',
  secondary:
    'bg-surface-elevated text-text-primary border border-border hover:border-border-strong',
  outline: 'bg-transparent text-text-primary border border-border hover:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface hover:text-text-primary',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 p-0 justify-center',
}

export function buttonClassNames(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(
    'inline-flex items-center justify-center rounded-[var(--radius-md)] font-medium transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50',
    variantStyles[variant],
    sizeStyles[size],
    className,
  )
}
