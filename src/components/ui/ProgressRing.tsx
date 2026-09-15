import { motion, useReducedMotion } from 'framer-motion'
import { clamp } from '@/utils/format'
import { cn } from '@/utils/cn'

export interface ProgressRingProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'accent' | 'secondary' | 'purple' | 'success' | 'warning' | 'danger'
  className?: string
  children?: React.ReactNode
}

const colorStrokes: Record<NonNullable<ProgressRingProps['color']>, string> = {
  accent: 'stroke-accent',
  secondary: 'stroke-secondary',
  purple: 'stroke-purple',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

export function ProgressRing({
  value,
  max = 100,
  size = 96,
  strokeWidth = 8,
  color = 'accent',
  className,
  children,
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion()
  const percent = clamp((value / max) * 100, 0, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-surface-elevated"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none', colorStrokes[color])}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}
