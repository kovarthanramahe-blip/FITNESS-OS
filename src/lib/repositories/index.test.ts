import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('getRepositories', () => {
  it('returns the local repositories when there is no authenticated user', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: {} }))
    const { getRepositories } = await import('./index')
    const { localRepositories } = await import('./local')
    expect(getRepositories(null)).toBe(localRepositories)
  })

  it('returns the local repositories when Supabase is not configured, even with a user id', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false, supabase: null }))
    const { getRepositories } = await import('./index')
    const { localRepositories } = await import('./local')
    expect(getRepositories('user-1')).toBe(localRepositories)
  })

  it('returns cloud repositories when signed in and Supabase is configured', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true, supabase: { from: vi.fn() } }))
    const { getRepositories } = await import('./index')
    const { localRepositories } = await import('./local')

    const repos = getRepositories('user-1')
    expect(repos).not.toBe(localRepositories)
    expect(Object.keys(repos).sort()).toEqual(['gamification', 'habit', 'nutrition', 'progress', 'workout'])
  })
})
