import type { ActivityIntensity, ActivityType } from '@/types/activity'

/**
 * One selectable MET option for a given activity type. `source` records
 * where the number came from so the UI/code can identify a value's
 * provenance rather than presenting every number as equally authoritative:
 *
 * - `compendium-2024`: taken directly from the 2024 Adult Compendium of
 *   Physical Activities (the values explicitly specified for this feature —
 *   walking, running, cycling, hiking, badminton, swimming, calisthenics).
 * - `estimate`: a commonly-cited MET figure for an activity the Compendium
 *   values weren't supplied for (basketball, football, the generic "other"
 *   bucket) — used so those activities aren't stuck on one crude universal
 *   number, but never labeled as if independently verified against the
 *   document itself.
 *
 * `kcal/min = MET × bodyWeightKg × 3.5 / 200` (see `estimateCaloriesBurned`
 * in utils/activity.ts) — this catalogue only supplies the MET side of
 * that formula; body weight and duration come from the user's own data.
 */
export interface ActivityMetOption {
  id: string
  activityType: ActivityType
  intensity: ActivityIntensity
  /** Short, human-readable description of the speed/effort band this MET value covers. */
  label: string
  met: number
  source: 'compendium-2024' | 'estimate'
}

export const ACTIVITY_MET_CATALOGUE: ActivityMetOption[] = [
  // Walking
  { id: 'walking-light', activityType: 'walking', intensity: 'light', label: '2.8–3.4 mph', met: 3.8, source: 'compendium-2024' },
  { id: 'walking-moderate', activityType: 'walking', intensity: 'moderate', label: '3.5–3.9 mph, brisk', met: 4.8, source: 'compendium-2024' },
  { id: 'walking-vigorous', activityType: 'walking', intensity: 'vigorous', label: '4.0–4.4 mph, very brisk', met: 5.5, source: 'compendium-2024' },

  // Running
  { id: 'running-moderate', activityType: 'running', intensity: 'moderate', label: '5.0–5.2 mph', met: 8.5, source: 'compendium-2024' },
  { id: 'running-vigorous', activityType: 'running', intensity: 'vigorous', label: '6.0–6.3 mph', met: 9.3, source: 'compendium-2024' },

  // Cycling
  { id: 'cycling-light', activityType: 'cycling', intensity: 'light', label: '<10 mph, leisure', met: 4.0, source: 'compendium-2024' },
  { id: 'cycling-moderate', activityType: 'cycling', intensity: 'moderate', label: '10–11.9 mph', met: 6.8, source: 'compendium-2024' },
  { id: 'cycling-vigorous', activityType: 'cycling', intensity: 'vigorous', label: '12–13.9 mph', met: 8.0, source: 'compendium-2024' },

  // Hiking
  { id: 'hiking-moderate', activityType: 'hiking', intensity: 'moderate', label: 'With daypack', met: 7.8, source: 'compendium-2024' },

  // Badminton
  { id: 'badminton-light', activityType: 'badminton', intensity: 'light', label: 'Social singles/doubles', met: 5.5, source: 'compendium-2024' },
  { id: 'badminton-moderate', activityType: 'badminton', intensity: 'moderate', label: 'Competitive', met: 7.0, source: 'compendium-2024' },
  { id: 'badminton-vigorous', activityType: 'badminton', intensity: 'vigorous', label: 'Competitive match play', met: 9.0, source: 'compendium-2024' },

  // Swimming
  { id: 'swimming-light', activityType: 'swimming', intensity: 'light', label: 'Leisurely', met: 6.0, source: 'compendium-2024' },
  { id: 'swimming-moderate', activityType: 'swimming', intensity: 'moderate', label: 'Crawl, moderate effort', met: 5.8, source: 'compendium-2024' },

  // Basketball — not in the supplied Compendium seed list; a commonly-cited estimate.
  { id: 'basketball-moderate', activityType: 'basketball', intensity: 'moderate', label: 'Game play, general', met: 6.5, source: 'estimate' },
  { id: 'basketball-vigorous', activityType: 'basketball', intensity: 'vigorous', label: 'Competitive game', met: 8.0, source: 'estimate' },

  // Football (soccer) — not in the supplied Compendium seed list; a commonly-cited estimate.
  { id: 'football-moderate', activityType: 'football', intensity: 'moderate', label: 'Casual play', met: 7.0, source: 'estimate' },
  { id: 'football-vigorous', activityType: 'football', intensity: 'vigorous', label: 'Competitive match', met: 10.0, source: 'estimate' },

  // Calisthenics
  { id: 'calisthenics-moderate', activityType: 'calisthenics', intensity: 'moderate', label: 'Moderate effort', met: 3.8, source: 'compendium-2024' },
  { id: 'calisthenics-vigorous', activityType: 'calisthenics', intensity: 'vigorous', label: 'Vigorous effort', met: 7.5, source: 'compendium-2024' },

  // Other — generic fallback for anything not covered above.
  { id: 'other-light', activityType: 'other', intensity: 'light', label: 'Light effort', met: 3.0, source: 'estimate' },
  { id: 'other-moderate', activityType: 'other', intensity: 'moderate', label: 'Moderate effort', met: 5.0, source: 'estimate' },
  { id: 'other-vigorous', activityType: 'other', intensity: 'vigorous', label: 'Vigorous effort', met: 8.0, source: 'estimate' },
]

export function getMetOptionsForActivity(activityType: ActivityType): ActivityMetOption[] {
  return ACTIVITY_MET_CATALOGUE.filter((option) => option.activityType === activityType)
}

export function getMetOption(id: string): ActivityMetOption | undefined {
  return ACTIVITY_MET_CATALOGUE.find((option) => option.id === id)
}

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  walking: 'Walking',
  running: 'Running',
  cycling: 'Cycling',
  hiking: 'Hiking',
  badminton: 'Badminton',
  swimming: 'Swimming',
  basketball: 'Basketball',
  football: 'Football',
  calisthenics: 'Calisthenics',
  other: 'Other',
}
