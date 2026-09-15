import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef } from 'react'
import { fadeInUp } from '@/animations/variants'
import { cn } from '@/utils/cn'

export interface CardProps extends HTMLMotionProps<'div'> {
  elevated?: boolean
  interactive?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  animate?: boolean
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, elevated = false, interactive = false, padding = 'md', animate = true, ...props },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={animate ? fadeInUp : undefined}
        initial={animate ? 'hidden' : undefined}
        animate={animate ? 'visible' : undefined}
        whileHover={interactive ? { y: -2 } : undefined}
        className={cn(
          'rounded-[var(--radius-lg)] border border-border',
          elevated ? 'bg-surface-elevated shadow-[var(--shadow-elevated)]' : 'bg-surface shadow-[var(--shadow-card)]',
          interactive && 'cursor-pointer transition-shadow hover:border-border-strong',
          paddingStyles[padding],
          className,
        )}
        {...props}
      />
    )
  },
)

Card.displayName = 'Card'

export function CardHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('mb-4 flex items-center justify-between gap-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      className={cn('font-display text-base font-semibold text-text-primary', className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return <p className={cn('text-sm text-text-secondary', className)} {...props} />
}
