# Health Connect — Activity-domain integration

This documents what's actually implemented, so later phases (exercise
session import, richer history) build on an accurate picture instead of
assumptions. Reimplemented from scratch against the current Activity
domain (`ActivityEntry` / `DailySteps`) after the original Phase 8
implementation was removed — it does not restore or extend that code.

## What this covers, and doesn't

**Is:** availability detection, a native Capacitor bridge, a permission
request/check flow for two read-only permissions (steps, plus the
optional "read health data history" permission), a Health Connect status
section on the Activity tab, and reading real daily step totals — always
via Health Connect's own aggregate API, never raw records summed by hand.

**Is not:** reading or writing exercise session data, writing anything to
Health Connect, syncing anything to Supabase, a direct Samsung Health SDK
integration, or any other health metric (heart rate, sleep, location,
nutrition, weight, body composition). The integration boundary is always
Health Connect —

```
Galaxy Watch -> Samsung Health -> Health Connect -> Fitness OS
```

— this app never talks to Samsung Health directly and has no way to know
which original source contributed to an aggregated total, so results are
always labeled "Health Connect," never "Samsung Health."

## Why minSdk is 26

`androidx.health.connect:connect-client`'s stable release (`1.1.0`)
requires `minSdk 26` (Android 8.0). This was already the case before this
phase (see `variables.gradle`) and did not need to change again.

## Native architecture

- `android/app/src/main/java/com/fitnessos/app/healthconnect/HealthConnectPlugin.kt`
  — the Capacitor plugin (`@CapacitorPlugin(name = "HealthConnect")`),
  registered in `MainActivity.java`. Exposes `isAvailable`, `getStatus`,
  `requestPermissions`, `getSteps({ startDate, endDate })`, and
  `openSettings`, all resolving (never crashing) even when Health Connect
  is unavailable, with a stable error `code` on rejection so the
  TypeScript side can distinguish unavailable / permission-denied / a
  genuine read failure from a legitimate zero.
  - `getSteps` reads `StepsRecord.COUNT_TOTAL` via `aggregateGroupByPeriod`
    sliced into 1-day `Period`s — one Health Connect call for the whole
    requested range, bucketed per local calendar day, letting Health
    Connect's own source de-duplication/priority resolution do its job.
    It deliberately never filters by `DataOrigin`: Health Connect can
    attribute a phone's native step sensor to a per-device Synthetic
    Package Name that isn't stable across devices/versions, so hard-coding
    any origin (old or new) would silently exclude real data.
  - Permission requests use Health Connect's own
    `PermissionController.createRequestPermissionResultContract()` via
    Capacitor's `startActivityForResult` + `@ActivityCallback`, re-reading
    the authoritative granted-permission set afterward rather than trusting
    the activity result payload alone.
- `android/app/src/main/java/com/fitnessos/app/healthconnect/PermissionsRationaleActivity.kt`
  — the static native screen Health Connect's own permission UI links to;
  required on every Android version Health Connect supports.
- Kotlin support was re-added to the Android project (`kotlin-android`
  Gradle plugin, `jvmTarget = "21"` to match `capacitor.build.gradle`'s
  Java 21 `sourceCompatibility`/`targetCompatibility`) since the client
  library is Kotlin-first.
- Two permissions, both read-only: `android.permission.health.READ_STEPS`
  and `android.permission.health.READ_HEALTH_DATA_HISTORY`.

## React/TypeScript architecture

- `src/lib/healthConnect/plugin.ts` — wraps
  `registerPlugin<HealthConnectPlugin>('HealthConnect')`.
- `src/lib/healthConnect/index.ts` — the public API every other file
  imports (`isAvailable`, `getStatus`, `requestPermissions`, `getSteps`,
  `openSettings`), with a web/non-native fallback (reports "unavailable,"
  never throws or hangs) and its own date validation — reusing
  `parseDateOnly`/`toDateString` from `src/utils/dateRange.ts`, never
  `new Date("yyyy-mm-dd")`/UTC conversion — before ever reaching the
  native side.
- `src/hooks/useHealthConnect.ts` — drives the Activity screen's Health
  Connect section: `status`, `hasHistoryPermission`, `error`/`stepsError`,
  `connect()`, `refresh()`, `openSettings()`. Runs one status check (and,
  if already connected, one 7-day steps read) when the Activity screen
  mounts — no polling, no background sync — and otherwise only syncs on
  an explicit `connect()`/`refresh()` call. Writes into the existing
  `activityStore` (`DailySteps`, `source: 'health-connect'`) via
  `setStepsForDate`, whose existing upsert-by-date behavior is what makes
  a repeated refresh replace a date's imported value instead of
  duplicating it; this hook never touches `ActivityEntry` records.
- `src/components/activity/HealthConnectStatusCard.tsx` — the status/
  actions card on the Activity tab (Connected / Permission required /
  Unavailable, "Connect Health Connect," "Refresh Steps," "Open Health
  Connect Settings"). Steps live on the Activity tab only — never under
  Settings.

## Manual step still required (not done by this phase)

None — everything required lives in the manifest and the native plugin.

## What later phases add on top of this

Reading exercise session data, writing anything, any additional
permission (heart rate, sleep, distance, calories, etc.), any Supabase
sync of health data, and a richer historical-data browser beyond the
Today/Yesterday/Last 7 Days view are all explicitly out of scope here.
