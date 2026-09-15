import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'
import { ToastContext, type ToastOptions, type ToastVariant } from './toastContext'

interface ToastRecord extends ToastOptions {
  id: string
}

const variantConfig: Record<ToastVariant, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'text-secondary' },
  success: { icon: CheckCircle2, className: 'text-success' },
  warning: { icon: TriangleAlert, className: 'text-warning' },
  danger: { icon: XCircle, className: 'text-danger' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: ToastOptions) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, ...toast }])
      window.setTimeout(() => dismissToast(id), toast.duration ?? 4000)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-20 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4 sm:bottom-6">
          <AnimatePresence>
            {toasts.map((toast) => {
              const config = variantConfig[toast.variant ?? 'info']
              const Icon = config.icon
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  role="status"
                  className="pointer-events-auto flex items-start gap-3 rounded-[var(--radius-md)] border border-border bg-surface-elevated p-4 shadow-[var(--shadow-elevated)]"
                >
                  <Icon className={cn('mt-0.5 size-5 shrink-0', config.className)} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary">{toast.title}</p>
                    {toast.description && (
                      <p className="mt-0.5 text-xs text-text-secondary">{toast.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissToast(toast.id)}
                    aria-label="Dismiss notification"
                    className="text-text-muted transition-colors hover:text-text-primary"
                  >
                    <X className="size-4" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
