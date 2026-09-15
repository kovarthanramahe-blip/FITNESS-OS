/**
 * A trimmed, UI-friendly view over Supabase's own `User` — callers never
 * need to know the shape of `user_metadata`.
 */
export interface AuthUser {
  id: string
  email: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type AuthErrorReason = 'not_configured' | 'oauth_failed' | 'network_error' | 'session_expired' | 'sign_out_failed'

export interface AuthError {
  reason: AuthErrorReason
  /** Always user-friendly — never a raw backend/error-object message. */
  message: string
}
