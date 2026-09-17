import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { modalContent, modalOverlay } from '@/animations/variants'
import { cn } from '@/utils/cn'
import { Button } from './Button'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Read through a ref so the effect below never needs `onClose` in its
  // dependency array — see the comment there for why that matters. Updated
  // in a layout effect rather than during render, since refs aren't meant
  // to be written while rendering.
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
    }
    // Deliberately just `[isOpen]`: this effect's job is the open/close
    // transition (focus the dialog once, lock body scroll, wire Escape) —
    // not something to redo on every render. Callers almost always pass an
    // inline `onClose`, which is a new function identity every render; with
    // it in the dependency array, typing into any input inside the dialog
    // re-ran this effect on every keystroke and `dialogRef.current?.focus()`
    // yanked focus off that input back onto the dialog container. On
    // Android that's enough to dismiss the on-screen keyboard, forcing the
    // user to reopen it after every character.
  }, [isOpen])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            variants={modalOverlay}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            tabIndex={-1}
            className={cn(
              'relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-t-[var(--radius-xl)] border border-border bg-surface-elevated p-6 shadow-[var(--shadow-elevated)] focus:outline-none sm:max-w-md sm:rounded-[var(--radius-xl)]',
              className,
            )}
          >
            {(title || description) && (
              <div className="mb-5 pr-8">
                {title && (
                  <h2 id="modal-title" className="font-display text-lg font-semibold text-text-primary">
                    {title}
                  </h2>
                )}
                {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-4 top-4"
            >
              <X className="size-4" />
            </Button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
