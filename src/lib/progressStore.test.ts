import { beforeEach, describe, expect, it } from 'vitest'
import {
  addMeasurement,
  addWeightLog,
  deleteMeasurement,
  deleteWeightLog,
  getProgressState,
  resetProgressStoreForTests,
  setWeightGoal,
  updateMeasurement,
  updateWeightLog,
} from './progressStore'

beforeEach(() => {
  resetProgressStoreForTests()
})

describe('weight logs', () => {
  it('adds a new weight entry', () => {
    const before = getProgressState().weightLogs.length
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })

    const state = getProgressState()
    expect(state.weightLogs).toHaveLength(before + 1)
    expect(state.weightLogs.at(-1)).toMatchObject({ date: '2024-06-01', weightKg: 71.2 })
  })

  it('edits an existing weight entry', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })
    const entry = getProgressState().weightLogs.at(-1)
    expect(entry).toBeDefined()

    updateWeightLog(entry!.id, { weightKg: 70.5, note: 'after workout' })

    const updated = getProgressState().weightLogs.find((log) => log.id === entry!.id)
    expect(updated?.weightKg).toBe(70.5)
    expect(updated?.note).toBe('after workout')
  })

  it('deletes a weight entry', () => {
    addWeightLog({ date: '2024-06-01', weightKg: 71.2 })
    const entry = getProgressState().weightLogs.at(-1)
    const countBefore = getProgressState().weightLogs.length

    deleteWeightLog(entry!.id)

    expect(getProgressState().weightLogs).toHaveLength(countBefore - 1)
    expect(getProgressState().weightLogs.some((log) => log.id === entry!.id)).toBe(false)
  })

  it('updates the weight goal', () => {
    setWeightGoal({ targetWeightKg: 65 })
    expect(getProgressState().weightGoal.targetWeightKg).toBe(65)
  })
})

describe('body measurements', () => {
  it('adds, edits and deletes a measurement', () => {
    const before = getProgressState().measurements.length
    addMeasurement({ type: 'Waist', date: '2024-06-01', value: 82, unit: 'cm' })

    const added = getProgressState().measurements.at(-1)
    expect(getProgressState().measurements).toHaveLength(before + 1)
    expect(added).toMatchObject({ type: 'Waist', value: 82, unit: 'cm' })

    updateMeasurement(added!.id, { value: 81 })
    expect(getProgressState().measurements.find((m) => m.id === added!.id)?.value).toBe(81)

    deleteMeasurement(added!.id)
    expect(getProgressState().measurements).toHaveLength(before)
  })

  it('supports a custom measurement type', () => {
    addMeasurement({ type: 'Neck', date: '2024-06-01', value: 38, unit: 'cm' })
    expect(getProgressState().measurements.some((m) => m.type === 'Neck')).toBe(true)
  })
})
