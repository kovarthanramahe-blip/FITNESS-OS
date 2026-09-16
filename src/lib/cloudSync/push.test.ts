import { beforeEach, describe, expect, it, vi } from 'vitest'

const sampleWeightLog = { id: 'w1', date: '2024-06-01', weightKg: 80 }

beforeEach(() => {
  vi.resetModules()
})

describe('push functions — gating', () => {
  it('no-ops without calling Supabase when the user is signed out', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => null }))
    const saveWeightLog = vi.fn()
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudProgressRepository: vi.fn(() => ({ saveWeightLog })),
    }))

    const { pushWeightLog } = await import('./push')
    await pushWeightLog(sampleWeightLog)

    expect(saveWeightLog).not.toHaveBeenCalled()
  })

  it('no-ops when Supabase is not configured, even if a userId happens to be set', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: false }))
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => 'user-1' }))
    const saveWeightLog = vi.fn()
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudProgressRepository: vi.fn(() => ({ saveWeightLog })),
    }))

    const { pushWeightLog } = await import('./push')
    await pushWeightLog(sampleWeightLog)

    expect(saveWeightLog).not.toHaveBeenCalled()
  })

  it('calls the cloud repository for the current authenticated user when configured', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => 'user-1' }))
    const saveWeightLog = vi.fn().mockResolvedValue(undefined)
    const createCloudProgressRepository = vi.fn(() => ({ saveWeightLog }))
    vi.doMock('@/lib/repositories/cloud', () => ({ createCloudProgressRepository }))

    const { pushWeightLog } = await import('./push')
    await pushWeightLog(sampleWeightLog)

    expect(createCloudProgressRepository).toHaveBeenCalledWith('user-1')
    expect(saveWeightLog).toHaveBeenCalledWith(sampleWeightLog)
  })

  it('never throws — a network failure is logged, not surfaced to the caller', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => 'user-1' }))
    vi.doMock('@/lib/repositories/cloud', () => ({
      createCloudProgressRepository: vi.fn(() => ({ saveWeightLog: vi.fn().mockRejectedValue(new Error('offline')) })),
    }))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { pushWeightLog } = await import('./push')
    await expect(pushWeightLog(sampleWeightLog)).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalled()
  })
})

describe('push functions — never pushes to the wrong user', () => {
  it('always scopes the write to whatever storageScope currently reports, never a value passed in by the caller', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
    let currentUser = 'user-a'
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => currentUser }))
    const createCloudProgressRepository = vi.fn(() => ({ saveWeightLog: vi.fn().mockResolvedValue(undefined) }))
    vi.doMock('@/lib/repositories/cloud', () => ({ createCloudProgressRepository }))

    const { pushWeightLog } = await import('./push')
    await pushWeightLog(sampleWeightLog)
    expect(createCloudProgressRepository).toHaveBeenLastCalledWith('user-a')

    currentUser = 'user-b'
    await pushWeightLog(sampleWeightLog)
    expect(createCloudProgressRepository).toHaveBeenLastCalledWith('user-b')
  })
})

describe('empty-batch gamification pushes', () => {
  it('pushXpEvents / pushEarnedBadges / pushCompletedChallenges skip the network entirely for empty arrays', async () => {
    vi.doMock('@/lib/supabase', () => ({ isSupabaseConfigured: true }))
    vi.doMock('@/lib/storageScope', () => ({ getCurrentUserId: () => 'user-1' }))
    const createCloudGamificationRepository = vi.fn()
    vi.doMock('@/lib/repositories/cloud', () => ({ createCloudGamificationRepository }))

    const { pushXpEvents, pushEarnedBadges, pushCompletedChallenges } = await import('./push')
    await pushXpEvents([])
    await pushEarnedBadges([])
    await pushCompletedChallenges([], '2024-06-01T00:00:00.000Z')

    expect(createCloudGamificationRepository).not.toHaveBeenCalled()
  })
})
