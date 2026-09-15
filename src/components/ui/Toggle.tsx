import { motion } from 'framer-motion'
import { useId } from 'react'
import { cn } from '@/utils/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
}

export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  const id = useId()

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {(label || description) && (
        <div>
          {label && (
            <label htmlFor={id} className="text-sm font-medium text-text-primary">
              {label}
            </label>
          )}
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-surface-elevated border border-border',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'inline-block size-5 rounded-full bg-text-inverse shadow',
            checked ? 'ml-6' : 'ml-1',
          )}
          style={{ backgroundColor: checked ? '#0b0f14' : '#f4f6f8' }}
        />
      </button>
    </div>
  )
}
