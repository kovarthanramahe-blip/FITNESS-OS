import { motion } from 'framer-motion'
import { createContext, useContext, useId } from 'react'
import { cn } from '@/utils/cn'

interface TabsContextValue {
  value: string
  onChange: (value: string) => void
  layoutId: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) throw new Error('Tabs.* components must be used within <Tabs>')
  return context
}

export interface TabsProps {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onChange, children, className }: TabsProps) {
  const layoutId = useId()
  return (
    <TabsContext.Provider value={{ value, onChange, layoutId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-border bg-surface p-1',
        className,
      )}
      {...props}
    />
  )
}

export interface TabProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function Tab({ value, children, className }: TabProps) {
  const { value: activeValue, onChange, layoutId } = useTabsContext()
  const isActive = activeValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onChange(value)}
      className={cn(
        'relative rounded-[calc(var(--radius-md)-4px)] px-3.5 py-1.5 text-sm font-medium transition-colors',
        isActive ? 'text-text-inverse' : 'text-text-secondary hover:text-text-primary',
        className,
      )}
    >
      {isActive && (
        <motion.span
          layoutId={`tab-active-${layoutId}`}
          className="absolute inset-0 rounded-[calc(var(--radius-md)-4px)] bg-accent"
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}
