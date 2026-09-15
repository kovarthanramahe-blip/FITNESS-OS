import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { PRIMARY_MOBILE_NAV_ITEMS } from '@/lib/navigation'
import { cn } from '@/utils/cn'

export function BottomNavigation() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch justify-between px-1">
        {PRIMARY_MOBILE_NAV_ITEMS.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition-colors',
                  isActive ? 'text-accent' : 'text-text-muted hover:text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottom-nav-active"
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                    />
                  )}
                  <item.icon className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
