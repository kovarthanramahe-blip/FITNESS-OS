import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AuthError, AuthUser } from '@/types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  /** True only while the initial session is being restored on load. */
  loading: boolean
  isAuthenticated: boolean
  /** Mirrors `isSupabaseConfigured` from lib/supabase.ts, for UI that needs to know without importing the client directly. */
  isSupabaseConfigured: boolean
  error: AuthError | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
