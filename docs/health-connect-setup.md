# Health Connect — Phase 8A foundation

This documents what Phase 8A actually implements, so later phases (steps
display, exercise sync, Galaxy Watch/Samsung Health) build on an accurate
picture instead of assumptions.

## What this phase is, and isn't

**Is:** availability detection, a native Capacitor bridge, a permission
request/check flow for exactly two read-only permissions (steps, exercise
session), a Settings UI reflecting connection state, and the mandatory
privacy-rationale screens Health Connect requires to show its permission
dialog at all.

**Is not:** reading any step count or exercise data, writing anything to
Health Connect, syncing anything to Supabase, or any other health metric
(heart rate, sleep, location, nutrition, weight, body composition).
"Sync Now" in this phase only re-checks availability/permission state —
it does not transfer any health data anywhere.

## Why minSdk changed from 24 to 26

`androidx.health.connect:connect-client`'s current **stable** release
(`1.1.0`) requires `minSdk 26` (Android 8.0) — confirmed by checking the
requirement was not relaxed until the `1.2.0-alpha` pre-release track,
which this project deliberately does not use for a production dependency.
Building against the stable client without raising `minSdk` fails at
Gradle's manifest-merge step. This is a real, unavoidable side effect of
adding Health Connect, not an unrelated version change — Android 8.0 has a
small and shrinking installed base as of 2026.

## Native architecture

- `android/app/src/main/java/com/fitnessos/app/healthconnect/HealthConnectPlugin.kt`
  — the Capacitor plugin (`@CapacitorPlugin(name = "HealthConnect")`),
  registered in `MainActivity.java`. Exposes exactly five methods, all of
  which resolve (never crash) even when Health Connect is unavailable:
  `isAvailable`, `getStatus`, `getGrantedPermissions`, `requestPermissions`,
  `openSettings`.
- `android/app/src/main/java/com/fitnessos/app/healthconnect/PermissionsRationaleActivity.kt`
  — the native screen Health Connect's own permission UI links to. Required
  on every Android version Health Connect supports; without it, Health
  Connect refuses to show the permission dialog for this app at all. Purely
  static text for this phase, matching what the manifest declares.
- Two permissions only, both read-only:
  `android.permission.health.READ_STEPS`,
  `android.permission.health.READ_EXERCISE`.

## React/TypeScript architecture

- `src/lib/healthConnect/` — the isolated bridge module. `plugin.ts` wraps
  `registerPlugin<HealthConnectPlugin>('HealthConnect')`; `index.ts` is the
  public API every other file should import
  (`isAvailable/getStatus/getGrantedPermissions/requestPermissions/openSettings`),
  with a web/non-native fallback (reports "unavailable", never throws) so
  nothing native is required to run the rest of the app, in tests or on web.
- `src/hooks/useHealthConnect.ts` — the stateful hook the Settings UI reads:
  status, granted permissions, loading, error, plus `connect()` (requests
  permissions) and `refresh()` (re-checks status/permissions — the "Sync
  Now" action for this phase).
- `src/components/settings/HealthDevicesSection.tsx` — the "Health &
  Devices" Settings section, wired into `src/pages/Settings.tsx` in place
  of the old "Connected Devices" placeholder row.

## Manual step still required (not done by this phase)

None — unlike the Google OAuth redirect URL, Health Connect's permission
model needs no external dashboard configuration. Everything required lives
in the manifest and the native plugin.

## What later phases add on top of this

Reading actual step/exercise data, writing anything, any additional
permission (heart rate, sleep, distance, calories, etc.), and any
Supabase sync of health data are all explicitly out of scope here and
will each need their own review of exactly what's requested and why.
