import { describe, expect, it } from 'vitest'

describe('supabase client (no env configured)', () => {
  it('reports isSupabaseConfigured as false when env vars are absent', async () => {
    const { isSupabaseConfigured } = await import('./supabase')
    expect(isSupabaseConfigured).toBe(false)
  })

  it('exposes a null client rather than throwing when unconfigured', async () => {
    const { supabase } = await import('./supabase')
    expect(supabase).toBeNull()
  })
})
