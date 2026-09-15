import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '@/lib/navigation'
import { cn } from '@/utils/cn'
import { Avatar } from '@/components/ui/Avatar'

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface px-4 py-6 lg:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-text-inverse">
          <Zap className="size-5" fill="currentColor" strokeWidth={0} />
        </span>
        <span className="font-display text-lg font-bold text-text-primary">Fitness OS</span>
      </div>

      <nav aria-label="Primary" className="mt-8 flex-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-text-inverse'
                      : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-[var(--radius-md)] bg-accent"
                        transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                      />
                    )}
                    <item.icon className="relative z-10 size-5" strokeWidth={2.1} />
                    <span className="relative z-10">{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-elevated px-3 py-3">
        <Avatar name="Kovarthan Ramahe" size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text-primary">Kovarthan</p>
          <p className="truncate text-xs text-text-muted">Level 7 · Intermediate</p>
        </div>
      </div>
    </aside>
  )
}
