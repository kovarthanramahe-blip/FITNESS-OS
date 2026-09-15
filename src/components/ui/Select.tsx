import { ChevronDown } from 'lucide-react'
import { forwardRef, useId } from 'react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<React.ComponentPropsWithoutRef<'select'>, 'children'> {
  label?: string
  hint?: string
  error?: string
  options: SelectOption[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, error, options, id, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id ?? generatedId

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={cn(
              'h-11 w-full appearance-none rounded-[var(--radius-md)] border border-border bg-surface px-3.5 pr-10 text-sm text-text-primary',
              'transition-colors focus:border-accent focus:outline-none',
              error && 'border-danger focus:border-danger',
              className,
            )}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-text-muted">{hint}</p>
        ) : null}
      </div>
    )
  },
)

Select.displayName = 'Select'
