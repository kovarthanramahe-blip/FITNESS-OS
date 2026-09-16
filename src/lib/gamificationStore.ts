import { useSyncExternalStore } from 'react'
import { BADGES, BADGES_BY_ID } from '@/data/gamification'
import { pushCompletedChallenges, pushEarnedBadges, pushGamificationProfile, pushXpEvents } from '@/lib/cloudSync/push'
import { persistLocalState } from '@/lib/localStorageHealth'
import { onUserScopeChange, scopedStorageKey } from '@/lib/storageScope'
import type { Badge, ChallengeProgress, EarnedBadge, GamificationProfile, GamificationStats, XPEvent } from '@/types/gamification'
import type { BadgeContext } from '@/utils/badgeEngine'
import { evaluateBadges } from '@/utils/badgeEngine'
import { buildChallengeCompletionEvent, getDailyChallengeProgress, getWeeklyChallengeProgress } from '@/utils/challengeEngine'
import {
  deriveEligibleXpEvents,
  getActivitySnapshot,
  getLevelForXp,
  getLevelProgressPercent,
  getLevelTitle,
  getTotalXp,
  getXpIntoCurrentLevel,
  getXpRequiredForLevel,
  reconcileNewXpEvents,
  sortXpEventsRecentFirst,
} from '@/utils/gamification'
import { getStreakSummary } from '@/utils/streaks'

const RECENT_XP_EVENT_LIMIT = 10

const BASE_STORAGE_KEY = 'fitness-os:gamification-store:v1'

/**
 * Only gamification-specific state lives here: the XP audit trail, which
 * badges/challenges have been earned, and when the profile was created.
 * Workouts, food entries, weight logs, habit entries and water logs all
 * stay in their own stores — this never duplicates them.
 */
export interface GamificationStoreState {
  xpEvents: XPEvent[]
  earnedBadges: EarnedBadge[]
  completedChallengeIds: string[]
  createdAt: string
}

function createInitialState(): GamificationStoreState {
  return {
    xpEvents: [],
    earnedBadges: [],
    completedChallengeIds: [],
    createdAt: new Date().toISOString(),
  }
}

function loadPersistedState(): GamificationStoreState {
  const initial = createInitialState()
  if (typeof window === 'undefined') return initial

  try {
    const raw = window.localStorage.getItem(scopedStorageKey(BASE_STORAGE_KEY))
    if (!raw) return initial
    const parsed = JSON.parse(raw) as Partial<GamificationStoreState>
    return {
      xpEvents: parsed.xpEvents ?? initial.xpEvents,
      earnedBadges: parsed.earnedBadges ?? initial.earnedBadges,
      completedChallengeIds: parsed.completedChallengeIds ?? initial.completedChallengeIds,
      createdAt: parsed.createdAt ?? initial.createdAt,
    }
  } catch {
    return initial
  }
}

function persist(state: GamificationStoreState): void {
  if (typeof window === 'undefined') return
  persistLocalState(scopedStorageKey(BASE_STORAGE_KEY), state)
}

let state: GamificationStoreState = loadPersistedState()
const listeners = new Set<() => void>()

onUserScopeChange(() => {
  state = loadPersistedState()
  for (const listener of listeners) listener()
})

function setState(updater: (current: GamificationStoreState) => GamificationStoreState): void {
  state = updater(state)
  persist(state)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): GamificationStoreState {
  return state
}

export function useGamificationStore(): GamificationStoreState {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function getGamificationState(): GamificationStoreState {
  return state
}

export function getGamificationProfile(): GamificationProfile {
  const totalXp = getTotalXp(state.xpEvents)
  return { totalXp, currentLevel: getLevelForXp(totalXp), createdAt: state.createdAt }
}

export interface SyncResult {
  newXpEvents: XPEvent[]
  newBadges: Badge[]
}

const NO_SYNC_CHANGES: SyncResult = { newXpEvents: [], newBadges: [] }

function getNewlyCompletedChallenges(
  daily: ChallengeProgress[],
  weekly: ChallengeProgress[],
  completedChallengeIds: string[],
): ChallengeProgress[] {
  const completedSet = new Set(completedChallengeIds)
  return [...daily, ...weekly].filter((progress) => progress.completed && !completedSet.has(progress.instanceId))
}

/**
 * Recomputes the full set of XP events, earned badges and completed
 * challenges from current store data and appends only what's genuinely
 * new. Safe to call as often as needed (every render, every store change,
 * React StrictMode's double-invoked effects) — since it only ever adds
 * events/badges/challenge ids that weren't already recorded, repeated
 * calls against unchanged source data are a no-op.
 */
export function syncGamification(now: Date = new Date()): SyncResult {
  const snapshot = getActivitySnapshot(now)

  const eligibleXpEvents = deriveEligibleXpEvents(snapshot)
  const newActivityEvents = reconcileNewXpEvents(state.xpEvents, eligibleXpEvents)

  const dailyChallenges = getDailyChallengeProgress(snapshot)
  const weeklyChallenges = getWeeklyChallengeProgress(snapshot)
  const newlyCompletedChallenges = getNewlyCompletedChallenges(dailyChallenges, weeklyChallenges, state.completedChallengeIds)
  const newChallengeEvents = newlyCompletedChallenges.map(buildChallengeCompletionEvent)

  const newXpEvents = [...newActivityEvents, ...newChallengeEvents]

  const projectedTotalXp = getTotalXp([...state.xpEvents, ...newXpEvents])
  const badgeContext: BadgeContext = { snapshot, totalXp: projectedTotalXp }
  const newBadges = evaluateBadges(
    badgeContext,
    state.earnedBadges.map((earned) => earned.badgeId),
  )

  if (newXpEvents.length === 0 && newBadges.length === 0) {
    return NO_SYNC_CHANGES
  }

  const newEarnedBadges = newBadges.map((badge) => ({ badgeId: badge.id, earnedAt: now.toISOString() }))
  const newChallengeInstanceIds = newlyCompletedChallenges.map((progress) => progress.instanceId)

  setState((current) => ({
    ...current,
    xpEvents: [...current.xpEvents, ...newXpEvents],
    earnedBadges: [...current.earnedBadges, ...newEarnedBadges],
    completedChallengeIds: [...current.completedChallengeIds, ...newChallengeInstanceIds],
  }))

  void pushGamificationProfile(state.createdAt)
  void pushXpEvents(newXpEvents)
  void pushEarnedBadges(newEarnedBadges)
  void pushCompletedChallenges(newChallengeInstanceIds, now.toISOString())

  return { newXpEvents, newBadges }
}

/**
 * The full read model for the Achievements page and Dashboard — pulls
 * together the persisted gamification state and a fresh activity
 * snapshot into one clean, ready-to-render shape (see the aggregation
 * layer described in types/gamification.ts `GamificationStats`).
 */
export function getGamificationStats(now: Date = new Date()): GamificationStats {
  const snapshot = getActivitySnapshot(now)
  const profile = getGamificationProfile()

  const earnedIds = new Set(state.earnedBadges.map((earned) => earned.badgeId))
  const earnedBadges = state.earnedBadges
    .map((earned) => {
      const badge = BADGES_BY_ID[earned.badgeId]
      return badge ? { ...badge, earnedAt: earned.earnedAt } : null
    })
    .filter((badge): badge is Badge & { earnedAt: string } => badge !== null)
  const lockedBadges = BADGES.filter((badge) => !earnedIds.has(badge.id))

  return {
    profile,
    xpIntoLevel: getXpIntoCurrentLevel(profile.totalXp),
    xpForNextLevel: getXpRequiredForLevel(profile.currentLevel),
    levelProgressPercent: getLevelProgressPercent(profile.totalXp),
    levelTitle: getLevelTitle(profile.currentLevel),
    recentEvents: sortXpEventsRecentFirst(state.xpEvents).slice(0, RECENT_XP_EVENT_LIMIT),
    earnedBadges,
    lockedBadges,
    dailyChallenges: getDailyChallengeProgress(snapshot),
    weeklyChallenges: getWeeklyChallengeProgress(snapshot),
    streaks: getStreakSummary(snapshot),
  }
}

export interface GamificationCloudSnapshot {
  xpEvents: XPEvent[]
  earnedBadges: EarnedBadge[]
  completedChallengeIds: string[]
}

/**
 * Merges a cloud snapshot (pulled on sign-in) into local state — a union
 * by id/badgeId/instanceId, never a drop. Since (user_id, event_id) /
 * (user_id, badge_id) / (user_id, instance_id) are the tables' own primary
 * keys, this union can never double-count an event the way farming would:
 * an event present on both sides is the same row, not two.
 */
export function mergeGamificationFromCloud(cloud: GamificationCloudSnapshot): {
  localOnlyXpEvents: XPEvent[]
  localOnlyEarnedBadges: EarnedBadge[]
  localOnlyChallengeIds: string[]
} {
  const cloudEventIds = new Set(cloud.xpEvents.map((event) => event.id))
  const localOnlyXpEvents = state.xpEvents.filter((event) => !cloudEventIds.has(event.id))

  const cloudBadgeIds = new Set(cloud.earnedBadges.map((badge) => badge.badgeId))
  const localOnlyEarnedBadges = state.earnedBadges.filter((badge) => !cloudBadgeIds.has(badge.badgeId))

  const cloudChallengeIds = new Set(cloud.completedChallengeIds)
  const localOnlyChallengeIds = state.completedChallengeIds.filter((id) => !cloudChallengeIds.has(id))

  setState((current) => ({
    ...current,
    xpEvents: [...localOnlyXpEvents, ...cloud.xpEvents],
    earnedBadges: [...localOnlyEarnedBadges, ...cloud.earnedBadges],
    completedChallengeIds: [...localOnlyChallengeIds, ...cloud.completedChallengeIds],
  }))

  return { localOnlyXpEvents, localOnlyEarnedBadges, localOnlyChallengeIds }
}

/**
 * Wipes all XP/badge/challenge data for the current scope back to its
 * clean initial state (used by both tests and the production "Reset
 * Fitness Data" setting) and notifies subscribers so any mounted UI
 * updates immediately.
 */
export function resetGamificationStoreForTests(): void {
  state = createInitialState()
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(scopedStorageKey(BASE_STORAGE_KEY))
    } catch {
      // ignore
    }
  }
  for (const listener of listeners) listener()
}

/** Production-facing alias for the Settings "Reset Fitness Data" action. */
export const resetGamificationData = resetGamificationStoreForTests
