import { motion, useReducedMotion } from 'framer-motion'
import { clamp } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface ProgressBarProps {
  value: number
  max?: number
  className?: string
  trackClassName?: string
  fillClassName?: string
  color?: 'accent' | 'secondary' | 'purple' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
}

const colorStyles = {
  accent: 'bg-accent',
  secondary: 'bg-secondary',
  purple: 'bg-purple',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
}

export function ProgressBar({
  value,
  max = 100,
  className,
  trackClassName,
  fillClassName,
  color = 'accent',
  size = 'md',
  label,
  showValue = false,
}: ProgressBarProps) {
  const prefersReducedMotion = useReducedMotion()
  const percent = clamp((value / max) * 100, 0, 100)

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="text-text-secondary">{label}</span>}
          {showValue && <span className="font-medium text-text-primary">{Math.round(percent)}%</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn(
          'w-full overflow-hidden rounded-full bg-surface-elevated',
          sizeStyles[size],
          trackClassName,
        )}
      >
        <motion.div
          className={cn('h-full rounded-full', colorStyles[color], fillClassName)}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
