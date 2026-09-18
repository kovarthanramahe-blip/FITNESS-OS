import { describe, expect, it } from 'vitest'
import type { ActivityType } from '@/types/activity'
import { ACTIVITY_MET_CATALOGUE, ACTIVITY_TYPE_LABELS, getMetOption, getMetOptionsForActivity } from './activityCatalogue'

const ALL_TYPES = Object.keys(ACTIVITY_TYPE_LABELS) as ActivityType[]

describe('ACTIVITY_MET_CATALOGUE', () => {
  it('gives every activity type at least one MET option', () => {
    for (const type of ALL_TYPES) {
      expect(getMetOptionsForActivity(type).length).toBeGreaterThan(0)
    }
  })

  it('has a unique id for every catalogue entry', () => {
    const ids = ACTIVITY_MET_CATALOGUE.map((option) => option.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every entry a positive MET value', () => {
    for (const option of ACTIVITY_MET_CATALOGUE) {
      expect(option.met).toBeGreaterThan(0)
    }
  })

  it('tags every entry with a source so the UI can identify Compendium provenance', () => {
    for (const option of ACTIVITY_MET_CATALOGUE) {
      expect(['compendium-2024', 'estimate']).toContain(option.source)
    }
  })

  it('matches the exact seeded Compendium MET values', () => {
    expect(getMetOption('walking-light')?.met).toBe(3.8)
    expect(getMetOption('walking-moderate')?.met).toBe(4.8)
    expect(getMetOption('walking-vigorous')?.met).toBe(5.5)
    expect(getMetOption('running-moderate')?.met).toBe(8.5)
    expect(getMetOption('running-vigorous')?.met).toBe(9.3)
    expect(getMetOption('cycling-light')?.met).toBe(4.0)
    expect(getMetOption('cycling-moderate')?.met).toBe(6.8)
    expect(getMetOption('cycling-vigorous')?.met).toBe(8.0)
    expect(getMetOption('hiking-moderate')?.met).toBe(7.8)
    expect(getMetOption('badminton-light')?.met).toBe(5.5)
    expect(getMetOption('badminton-moderate')?.met).toBe(7.0)
    expect(getMetOption('badminton-vigorous')?.met).toBe(9.0)
    expect(getMetOption('swimming-light')?.met).toBe(6.0)
    expect(getMetOption('swimming-moderate')?.met).toBe(5.8)
    expect(getMetOption('calisthenics-moderate')?.met).toBe(3.8)
    expect(getMetOption('calisthenics-vigorous')?.met).toBe(7.5)
  })

  it('marks the Compendium-supplied seed entries with the compendium-2024 source', () => {
    for (const id of [
      'walking-light',
      'walking-moderate',
      'walking-vigorous',
      'running-moderate',
      'running-vigorous',
      'cycling-light',
      'cycling-moderate',
      'cycling-vigorous',
      'hiking-moderate',
      'badminton-light',
      'badminton-moderate',
      'badminton-vigorous',
      'swimming-light',
      'swimming-moderate',
      'calisthenics-moderate',
      'calisthenics-vigorous',
    ]) {
      expect(getMetOption(id)?.source).toBe('compendium-2024')
    }
  })

  it('returns undefined for an unknown option id, rather than throwing', () => {
    expect(getMetOption('not-a-real-id')).toBeUndefined()
  })
})
