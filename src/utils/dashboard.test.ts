import { describe, expect, it } from 'vitest'
import { getRemaining, getScoreLabel, getWeightTrendStatus } from './dashboard'

describe('getScoreLabel', () => {
  it('labels scores across the range', () => {
    expect(getScoreLabel(90, 100)).toBe('Excellent day')
    expect(getScoreLabel(78, 100)).toBe('Great day')
    expect(getScoreLabel(55, 100)).toBe('Good progress')
    expect(getScoreLabel(20, 100)).toBe("Let's build momentum")
  })
})

describe('getRemaining', () => {
  it('returns the positive difference', () => {
    expect(getRemaining(1680, 2200)).toBe(520)
  })

  it('never returns a negative amount', () => {
    expect(getRemaining(2500, 2200)).toBe(0)
  })
})

describe('getWeightTrendStatus', () => {
  it('is positive when the change moves toward the target', () => {
    expect(getWeightTrendStatus(-0.6, 72.4, 68)).toBe('positive')
  })

  it('is negative when the change moves away from the target', () => {
    expect(getWeightTrendStatus(0.6, 72.4, 68)).toBe('negative')
  })

  it('is neutral when there is no change', () => {
    expect(getWeightTrendStatus(0, 72.4, 68)).toBe('neutral')
  })
})
