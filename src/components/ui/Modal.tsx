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

// Standard interactive-element selector for a focus trap — deliberately no
// visibility filtering (e.g. via `offsetParent`): jsdom never computes
// layout, so any such filter would silently discard every candidate under
// test and this trap would appear to do nothing there while working in a
// real browser. Every element this app actually puts inside a modal is
// already visible whenever the modal is open, so the simpler selector is
// correct in both environments.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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

  // The element focused right before this modal opened — restored on close
  // so closing a modal (Escape, the X button, an outside click, or the
  // caller flipping `isOpen` after a save) never strands focus on
  // `<body>`, which is what happens by default once the focused element
  // (the dialog) unmounts.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null

    function getFocusableElements(): HTMLElement[] {
      if (!dialogRef.current) return []
      return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      // Trap Tab/Shift+Tab within the dialog's own focusable elements —
      // computed fresh on every keypress (never cached) since a modal's
      // content, like a form growing an extra field, can change while it's
      // open.
      const focusable = getFocusableElements()
      if (focusable.length === 0) return
      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || active === dialogRef.current || !dialogRef.current?.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last || active === dialogRef.current || !dialogRef.current?.contains(active)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      previouslyFocusedRef.current?.focus()
    }
    // Deliberately just `[isOpen]`: this effect's job is the open/close
    // transition (focus the dialog once, lock body scroll, wire Escape/Tab)
    // — not something to redo on every render. Callers almost always pass
    // an inline `onClose`, which is a new function identity every render;
    // with it in the dependency array, typing into any input inside the
    // dialog re-ran this effect on every keystroke and
    // `dialogRef.current?.focus()` yanked focus off that input back onto
    // the dialog container. On Android that's enough to dismiss the
    // on-screen keyboard, forcing the user to reopen it after every
    // character. The focus trap above reads `dialogRef`/`document` fresh
    // on every keydown rather than depending on anything reactive, so it
    // doesn't reintroduce that problem.
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
