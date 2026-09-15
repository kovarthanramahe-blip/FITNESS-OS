import { createContext } from 'react'

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export interface ToastContextValue {
  showToast: (toast: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
