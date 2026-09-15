import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

describe('fetchProfile', () => {
  it('returns null without querying when Supabase is not configured', async () => {
    vi.doMock('@/lib/supabase', () => ({ supabase: null }))
    const { fetchProfile } = await import('./profileService')

    const result = await fetchProfile('user-1')
    expect(result).toBeNull()
  })

  it('maps a found row to a Profile', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'user-1', display_name: 'Ada', avatar_url: 'https://x/y.png', email: 'ada@example.com' },
      error: null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    vi.doMock('@/lib/supabase', () => ({ supabase: { from } }))

    const { fetchProfile } = await import('./profileService')
    const result = await fetchProfile('user-1')

    expect(from).toHaveBeenCalledWith('profiles')
    expect(eq).toHaveBeenCalledWith('id', 'user-1')
    expect(result).toEqual({ id: 'user-1', displayName: 'Ada', avatarUrl: 'https://x/y.png', email: 'ada@example.com' })
  })

  it('returns null when no profile row exists yet', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    vi.doMock('@/lib/supabase', () => ({ supabase: { from } }))

    const { fetchProfile } = await import('./profileService')
    expect(await fetchProfile('user-1')).toBeNull()
  })

  it('throws when the query errors', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    vi.doMock('@/lib/supabase', () => ({ supabase: { from } }))

    const { fetchProfile } = await import('./profileService')
    await expect(fetchProfile('user-1')).rejects.toBeTruthy()
  })
})
