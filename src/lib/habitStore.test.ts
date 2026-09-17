import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapHabitEntryRow, mapHabitRow, mapWaterLogRow } from '@/lib/repositories/cloud/mappers'
import { resetStorageScopeForTests, setCurrentUserId } from '@/lib/storageScope'
import {
  addHabit,
  addWaterLog,
  completeHabit,
  deleteHabit,
  editHabit,
  getHabitHistory,
  getHabitState,
  getHabitsForDate,
  mergeHabitFromCloud,
  purgeLegacyServerIdHabitEntries,
  purgeLegacyServerIdHabits,
  purgeLegacyServerIdWaterLogs,
  removeLatestWaterLog,
  resetHabitStoreForTests,
  setWaterGoal,
  toggleHabitActive,
  uncompleteHabit,
} from './habitStore'
import { getTodayDateString } from '@/utils/dateRange'
import { getDailyWaterMl } from '@/utils/habits'

const SAMPLE_HABIT = {
  name: 'Read 10 pages',
  icon: 'sparkles' as const,
  category: 'wellness' as const,
  frequency: { type: 'daily' as const },
  target: 1,
  reminderEnabled: false,
  active: true,
}

beforeEach(() => {
  resetHabitStoreForTests()
})

describe('habit CRUD', () => {
  it('adds a new habit', () => {
    const before = getHabitState().habits.length
    addHabit(SAMPLE_HABIT)

    const state = getHabitState()
    expect(state.habits).toHaveLength(before + 1)
    expect(state.habits.at(-1)).toMatchObject({ name: 'Read 10 pages' })
  })

  it('edits a habit without touching its completion history', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    editHabit(added.id, { name: 'Read 20 pages' })

    const updated = getHabitState().habits.find((h) => h.id === added.id)
    expect(updated?.name).toBe('Read 20 pages')
    expect(getHabitHistory(added.id)).toHaveLength(1)
  })

  it('deletes a habit and its entries', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    deleteHabit(added.id)

    expect(getHabitState().habits.some((h) => h.id === added.id)).toBe(false)
    expect(getHabitHistory(added.id)).toHaveLength(0)
  })

  it('toggles active state', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    expect(added.active).toBe(true)

    toggleHabitActive(added.id)
    expect(getHabitState().habits.find((h) => h.id === added.id)?.active).toBe(false)

    toggleHabitActive(added.id)
    expect(getHabitState().habits.find((h) => h.id === added.id)?.active).toBe(true)
  })

  it('supports a weekday schedule', () => {
    addHabit({ ...SAMPLE_HABIT, frequency: { type: 'weekdays', days: [1, 3, 5] } })
    const added = getHabitState().habits.at(-1)!
    expect(added.frequency).toEqual({ type: 'weekdays', days: [1, 3, 5] })
  })

  it('supports a weekly target schedule', () => {
    addHabit({ ...SAMPLE_HABIT, frequency: { type: 'weekly', timesPerWeek: 3 } })
    const added = getHabitState().habits.at(-1)!
    expect(added.frequency).toEqual({ type: 'weekly', timesPerWeek: 3 })
  })

  it('filters habits for a date to those active as of that date', () => {
    addHabit(SAMPLE_HABIT)
    const forToday = getHabitsForDate(getTodayDateString())
    expect(forToday.some((h) => h.name === 'Read 10 pages')).toBe(true)
  })
})

describe('habit completion', () => {
  it('marks a habit complete for a specific date', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!

    completeHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(1)
    expect(getHabitHistory(added.id)[0]?.date).toBe('2024-06-01')
  })

  it('does not create a duplicate entry for the same date', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!

    completeHabit(added.id, '2024-06-01')
    completeHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(1)
  })

  it('undoes a completion', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    uncompleteHabit(added.id, '2024-06-01')

    expect(getHabitHistory(added.id)).toHaveLength(0)
  })

  it('completion is date-specific, not global', () => {
    addHabit(SAMPLE_HABIT)
    const added = getHabitState().habits.at(-1)!
    completeHabit(added.id, '2024-06-01')

    uncompleteHabit(added.id, '2024-06-02')

    expect(getHabitHistory(added.id)).toHaveLength(1)
  })
})

describe('water tracking', () => {
  it('adds a water log for a date', () => {
    addWaterLog(250, '2024-06-01')
    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')).toBeGreaterThanOrEqual(250)
  })

  it('removes the latest water log for a date', () => {
    resetHabitStoreForTests()
    const before = getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')
    addWaterLog(250, '2024-06-01')
    addWaterLog(500, '2024-06-01')

    removeLatestWaterLog('2024-06-01')

    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-06-01')).toBe(before + 250)
  })

  it('does nothing when removing from a date with no logs', () => {
    const countBefore = getHabitState().waterLogs.length
    removeLatestWaterLog('2099-01-01')
    expect(getHabitState().waterLogs).toHaveLength(countBefore)
  })

  it('updates the water goal', () => {
    setWaterGoal({ goalMl: 3000 })
    expect(getHabitState().waterGoal.goalMl).toBe(3000)
  })

  it('supports multiple dates independently', () => {
    addWaterLog(300, '2024-07-01')
    addWaterLog(400, '2024-07-02')

    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-07-01')).toBe(300)
    expect(getDailyWaterMl(getHabitState().waterLogs, '2024-07-02')).toBe(400)
  })
})

describe('persistence', () => {
  it('persists habits, entries, and water state to localStorage', () => {
    addHabit(SAMPLE_HABIT)
    addWaterLog(250, '2024-06-01')

    const raw = window.localStorage.getItem('fitness-os:habit-store:v1')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.habits.some((h: { name: string }) => h.name === 'Read 10 pages')).toBe(true)
    expect(parsed.waterLogs.some((w: { amountMl: number }) => w.amountMl === 250)).toBe(true)
  })
})

describe('authenticated zero-state', () => {
  afterEach(() => {
    resetStorageScopeForTests()
    resetHabitStoreForTests()
  })

  it('starts a new authenticated user with no habits, entries, or water logs', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()

    const state = getHabitState()
    expect(state.habits).toEqual([])
    expect(state.entries).toEqual([])
    expect(state.waterLogs).toEqual([])
  })

  it('keeps guest/demo mode seeded with mock data', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()
    setCurrentUserId(null)
    resetHabitStoreForTests()

    const state = getHabitState()
    expect(state.habits.length).toBeGreaterThan(0)
  })

  it('isolates two different users on the same device', () => {
    setCurrentUserId('user-1')
    resetHabitStoreForTests()
    addHabit(SAMPLE_HABIT)
    expect(getHabitState().habits).toHaveLength(1)

    setCurrentUserId('user-2')
    expect(getHabitState().habits).toEqual([])
  })
})

describe('mergeHabitFromCloud', () => {
  beforeEach(() => {
    setCurrentUserId('user-merge-test')
    resetHabitStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('unions cloud and local-only habits, keeping both', () => {
    addHabit(SAMPLE_HABIT)
    const localOnlyId = getHabitState().habits[0]!.id
    const cloudHabit = { ...SAMPLE_HABIT, id: 'cloud-habit-1', createdAt: '2024-06-01T00:00:00.000Z' }

    const { localOnlyHabits } = mergeHabitFromCloud({ habits: [cloudHabit], entries: [], waterLogs: [], waterGoal: null })

    expect(localOnlyHabits.map((h) => h.id)).toEqual([localOnlyId])
    expect(getHabitState().habits.map((h) => h.id).sort()).toEqual([localOnlyId, 'cloud-habit-1'].sort())
  })

  it('cloud wins on a shared habit id', () => {
    addHabit(SAMPLE_HABIT)
    const sharedId = getHabitState().habits[0]!.id
    const cloudVersion = { ...SAMPLE_HABIT, id: sharedId, name: 'Renamed elsewhere', createdAt: '2024-06-01T00:00:00.000Z' }

    mergeHabitFromCloud({ habits: [cloudVersion], entries: [], waterLogs: [], waterGoal: null })

    expect(getHabitState().habits).toHaveLength(1)
    expect(getHabitState().habits[0]?.name).toBe('Renamed elsewhere')
  })

  it('pairs a local-only entry with its owning habit for push-back', () => {
    addHabit(SAMPLE_HABIT)
    const habit = getHabitState().habits[0]!
    completeHabit(habit.id, '2024-06-01')
    const localEntry = getHabitState().entries[0]!

    const { localOnlyEntries } = mergeHabitFromCloud({
      habits: [habit],
      entries: [],
      waterLogs: [],
      waterGoal: null,
    })

    expect(localOnlyEntries).toEqual([{ entry: localEntry, habit }])
  })

  it('cloud wins on a shared water log id', () => {
    addWaterLog(250, '2024-06-01')
    const sharedId = getHabitState().waterLogs[0]!.id
    const cloudLog = { id: sharedId, date: '2024-06-01', amountMl: 500, createdAt: '2024-06-01T00:00:00.000Z' }

    mergeHabitFromCloud({ habits: [], entries: [], waterLogs: [cloudLog], waterGoal: null })

    expect(getHabitState().waterLogs).toEqual([cloudLog])
  })

  it('a null cloud water goal keeps the local one and reports it for push-back', () => {
    const { waterGoalToPush } = mergeHabitFromCloud({ habits: [], entries: [], waterLogs: [], waterGoal: null })
    expect(waterGoalToPush).toEqual(getHabitState().waterGoal)
  })

  // Regression for the double-counting bug: a habit, its completion entry,
  // and a water log already pushed to the cloud come back through the real
  // mappers keyed by their `client_*_id` columns (the local ids), never the
  // server row id — feeding the mappers' actual output in here is what
  // makes this test fail against the old `id: row.id` mappers (duplicates
  // on the very next hydration/app-reopen) and pass against the fix. The
  // habit entry case additionally proves `habitId` resolves back to the
  // *client* habit id (via the server-id map `getEntries` builds), not the
  // server-side foreign key `habit_id` — otherwise the entry would survive
  // the merge but silently detach from its habit.
  it('hydrating the same already-synced habit, entry, and water log repeatedly (closing/reopening the app) never duplicates them', () => {
    addHabit(SAMPLE_HABIT)
    const localHabitId = getHabitState().habits[0]!.id
    completeHabit(localHabitId, '2024-06-01')
    const localEntryId = getHabitState().entries[0]!.id
    addWaterLog(250, '2024-06-01')
    const localWaterLogId = getHabitState().waterLogs[0]!.id

    const cloudHabit = mapHabitRow({
      id: 'server-generated-habit-uuid',
      user_id: 'user-merge-test',
      client_habit_id: localHabitId,
      name: SAMPLE_HABIT.name,
      description: null,
      icon: SAMPLE_HABIT.icon,
      category: SAMPLE_HABIT.category,
      frequency_type: 'daily',
      frequency_days: null,
      frequency_times_per_week: null,
      target: SAMPLE_HABIT.target,
      unit: null,
      reminder_enabled: SAMPLE_HABIT.reminderEnabled,
      reminder_time: null,
      active: SAMPLE_HABIT.active,
      created_at: '2024-06-01T00:00:00.000Z',
      updated_at: '2024-06-01T00:00:00.000Z',
    })
    const cloudEntry = mapHabitEntryRow(
      {
        id: 'server-generated-entry-uuid',
        user_id: 'user-merge-test',
        habit_id: 'server-generated-habit-uuid',
        client_entry_id: localEntryId,
        log_date: '2024-06-01',
        completed_at: '2024-06-01T00:00:00.000Z',
      },
      new Map([['server-generated-habit-uuid', localHabitId]]),
    )
    const cloudWaterLog = mapWaterLogRow({
      id: 'server-generated-water-uuid',
      user_id: 'user-merge-test',
      client_log_id: localWaterLogId,
      log_date: '2024-06-01',
      amount_ml: 250,
      created_at: '2024-06-01T00:00:00.000Z',
    })

    mergeHabitFromCloud({ habits: [cloudHabit], entries: [cloudEntry], waterLogs: [cloudWaterLog], waterGoal: null })
    expect(getHabitState().habits).toHaveLength(1)
    expect(getHabitState().entries).toHaveLength(1)
    expect(getHabitState().waterLogs).toHaveLength(1)
    expect(getHabitState().entries[0]!.habitId).toBe(localHabitId)

    // Close the app and reopen it (repeatedly) — counts must never grow.
    mergeHabitFromCloud({ habits: [cloudHabit], entries: [cloudEntry], waterLogs: [cloudWaterLog], waterGoal: null })
    mergeHabitFromCloud({ habits: [cloudHabit], entries: [cloudEntry], waterLogs: [cloudWaterLog], waterGoal: null })

    expect(getHabitState().habits).toHaveLength(1)
    expect(getHabitState().habits[0]!.id).toBe(localHabitId)
    expect(getHabitState().entries).toHaveLength(1)
    expect(getHabitState().entries[0]!.id).toBe(localEntryId)
    expect(getHabitState().waterLogs).toHaveLength(1)
    expect(getHabitState().waterLogs[0]!.id).toBe(localWaterLogId)
  })
})

describe('purgeLegacyServerId(Habits|HabitEntries|WaterLogs) (one-time local-duplicate cleanup)', () => {
  beforeEach(() => {
    setCurrentUserId('user-purge-test')
    resetHabitStoreForTests()
  })

  afterEach(() => {
    resetStorageScopeForTests()
  })

  // TEST A
  it('does nothing for a fresh store with no records at all', () => {
    expect(purgeLegacyServerIdHabits(['server-uuid'])).toEqual([])
    expect(purgeLegacyServerIdHabitEntries(['server-uuid'], {})).toEqual([])
    expect(purgeLegacyServerIdWaterLogs(['server-uuid'])).toEqual([])
    expect(getHabitState().habits).toEqual([])
    expect(getHabitState().entries).toEqual([])
    expect(getHabitState().waterLogs).toEqual([])
  })

  // TEST B
  it('removes a legacy server-id-keyed habit and water log while keeping the canonical client-id copies', () => {
    addHabit(SAMPLE_HABIT)
    const canonicalHabit = getHabitState().habits[0]!
    addWaterLog(250, '2024-06-01')
    const canonicalWaterLog = getHabitState().waterLogs[0]!

    mergeHabitFromCloud({
      habits: [{ ...canonicalHabit, id: 'server-habit-uuid' }],
      entries: [],
      waterLogs: [{ ...canonicalWaterLog, id: 'server-water-uuid' }],
      waterGoal: null,
    })
    expect(getHabitState().habits).toHaveLength(2)
    expect(getHabitState().waterLogs).toHaveLength(2)

    const removedHabits = purgeLegacyServerIdHabits(['server-habit-uuid'])
    const removedWaterLogs = purgeLegacyServerIdWaterLogs(['server-water-uuid'])

    expect(removedHabits).toEqual([{ ...canonicalHabit, id: 'server-habit-uuid' }])
    expect(removedWaterLogs).toEqual([{ ...canonicalWaterLog, id: 'server-water-uuid' }])
    expect(getHabitState().habits).toEqual([canonicalHabit])
    expect(getHabitState().waterLogs).toEqual([canonicalWaterLog])
  })

  it('removes a legacy server-id-keyed habit entry and re-points a surviving entry whose habitId is still a legacy server habit id', () => {
    addHabit(SAMPLE_HABIT)
    const canonicalHabit = getHabitState().habits[0]!
    completeHabit(canonicalHabit.id, '2024-06-01')
    const canonicalEntry = getHabitState().entries[0]!

    // Simulate the old bug's compounded corruption directly: a legacy
    // duplicate entry (own id is a server id) AND a *surviving* entry whose
    // habitId still points at the legacy server habit id (as the old
    // mapHabitEntryRow produced) rather than the canonical client habit id.
    const legacyDuplicateEntry = { ...canonicalEntry, id: 'server-entry-uuid', habitId: 'server-habit-uuid' }
    const survivingEntryWithStaleHabitId = {
      id: 'entry-client-2',
      habitId: 'server-habit-uuid',
      date: '2024-06-02',
      completedAt: '2024-06-02T00:00:00.000Z',
    }
    mergeHabitFromCloud({
      habits: [],
      entries: [legacyDuplicateEntry, survivingEntryWithStaleHabitId],
      waterLogs: [],
      waterGoal: null,
    })
    expect(getHabitState().entries).toHaveLength(3)

    const removed = purgeLegacyServerIdHabitEntries(['server-entry-uuid'], { 'server-habit-uuid': canonicalHabit.id })

    expect(removed).toEqual([legacyDuplicateEntry])
    const remainingIds = getHabitState().entries.map((e) => e.id).sort()
    expect(remainingIds).toEqual([canonicalEntry.id, 'entry-client-2'].sort())
    // The surviving entry's habitId was re-pointed to the canonical client habit id.
    const repointed = getHabitState().entries.find((e) => e.id === 'entry-client-2')!
    expect(repointed.habitId).toBe(canonicalHabit.id)
    // An entry that already had the canonical habitId is untouched.
    const untouched = getHabitState().entries.find((e) => e.id === canonicalEntry.id)!
    expect(untouched.habitId).toBe(canonicalHabit.id)
  })

  // TEST C (covers both plain removal and the habitId re-point being idempotent)
  it('running the purge twice makes no further changes the second time, including no further habitId re-pointing', () => {
    addHabit(SAMPLE_HABIT)
    const canonicalHabit = getHabitState().habits[0]!
    completeHabit(canonicalHabit.id, '2024-06-01')
    const staleEntry = { id: 'entry-client-2', habitId: 'server-habit-uuid', date: '2024-06-02', completedAt: '2024-06-02T00:00:00.000Z' }
    mergeHabitFromCloud({ habits: [], entries: [staleEntry], waterLogs: [], waterGoal: null })

    const habitIdMap = { 'server-habit-uuid': canonicalHabit.id }
    purgeLegacyServerIdHabitEntries([], habitIdMap)
    const stateAfterFirst = getHabitState().entries.find((e) => e.id === 'entry-client-2')!.habitId
    const removedSecond = purgeLegacyServerIdHabitEntries([], habitIdMap)
    const stateAfterSecond = getHabitState().entries.find((e) => e.id === 'entry-client-2')!.habitId

    expect(stateAfterFirst).toBe(canonicalHabit.id)
    expect(removedSecond).toEqual([])
    expect(stateAfterSecond).toBe(canonicalHabit.id)
  })

  // TEST D
  it('never removes two legitimate habits, entries, or water logs that merely look alike', () => {
    const habitA = { ...SAMPLE_HABIT, id: 'habit-client-a', createdAt: '2024-06-01T00:00:00.000Z' }
    const habitB = { ...SAMPLE_HABIT, id: 'habit-client-b', createdAt: '2024-06-01T00:00:00.000Z' }
    const waterLogA = { id: 'water-client-a', date: '2024-06-01', amountMl: 250, createdAt: '2024-06-01T00:00:00.000Z' }
    const waterLogB = { id: 'water-client-b', date: '2024-06-01', amountMl: 250, createdAt: '2024-06-01T00:00:00.000Z' }
    mergeHabitFromCloud({ habits: [habitA, habitB], entries: [], waterLogs: [waterLogA, waterLogB], waterGoal: null })

    expect(purgeLegacyServerIdHabits(['unrelated-server-uuid'])).toEqual([])
    expect(purgeLegacyServerIdWaterLogs(['unrelated-server-uuid'])).toEqual([])
    expect(getHabitState().habits.map((h) => h.id).sort()).toEqual(['habit-client-a', 'habit-client-b'])
    expect(getHabitState().waterLogs.map((l) => l.id).sort()).toEqual(['water-client-a', 'water-client-b'])
  })

  // TEST E
  it('never removes local-only habits, entries, or water logs whose ids were never seen on the server', () => {
    addHabit(SAMPLE_HABIT)
    const habit = getHabitState().habits[0]!
    completeHabit(habit.id, '2024-06-01')
    addWaterLog(250, '2024-06-01')
    const habitsBefore = getHabitState().habits
    const entriesBefore = getHabitState().entries
    const waterLogsBefore = getHabitState().waterLogs

    purgeLegacyServerIdHabits(['unrelated-server-uuid'])
    purgeLegacyServerIdHabitEntries(['unrelated-server-uuid'], {})
    purgeLegacyServerIdWaterLogs(['unrelated-server-uuid'])

    expect(getHabitState().habits).toBe(habitsBefore)
    expect(getHabitState().entries).toBe(entriesBefore)
    expect(getHabitState().waterLogs).toBe(waterLogsBefore)
  })
})

describe('local persistence survives closing and reopening the app without duplicating records', () => {
  afterEach(() => {
    resetStorageScopeForTests()
  })

  it('re-importing the store module against the same localStorage content (simulating an app restart) never grows habits, entries, or water logs', async () => {
    vi.resetModules()
    const first = await import('./habitStore')
    first.resetHabitStoreForTests()
    first.addHabit(SAMPLE_HABIT)
    const habitId = first.getHabitState().habits[0]!.id
    first.completeHabit(habitId, '2024-06-01')
    first.addWaterLog(250, '2024-06-01')
    const afterFirstOpen = {
      habits: first.getHabitState().habits.length,
      entries: first.getHabitState().entries.length,
      waterLogs: first.getHabitState().waterLogs.length,
    }

    vi.resetModules()
    const second = await import('./habitStore')
    expect(second.getHabitState().habits).toHaveLength(afterFirstOpen.habits)
    expect(second.getHabitState().entries).toHaveLength(afterFirstOpen.entries)
    expect(second.getHabitState().waterLogs).toHaveLength(afterFirstOpen.waterLogs)

    vi.resetModules()
    const third = await import('./habitStore')
    expect(third.getHabitState().habits).toHaveLength(afterFirstOpen.habits)
    expect(third.getHabitState().entries).toHaveLength(afterFirstOpen.entries)
    expect(third.getHabitState().waterLogs).toHaveLength(afterFirstOpen.waterLogs)
  })
})
