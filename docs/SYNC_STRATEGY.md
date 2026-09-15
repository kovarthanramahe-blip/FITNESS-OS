# Fitness OS — cloud sync strategy (Phase 8+)

Phase 7 establishes the cloud foundation — auth, schema, RLS, and a
repository boundary — without migrating any existing local data or
changing how any page reads/writes today. This document is the plan for
the incremental work that comes after.

## Current state (end of Phase 7)

| Concern | Where it lives today |
| --- | --- |
| Reads | Every page still reads from `workoutStore` / `progressStore` / `nutritionStore` / `habitStore` / `gamificationStore` directly, via their `useXStore()` hooks. |
| Writes | Same — all writes go through each store's own actions (`addWeightLog`, `completeHabit`, `syncGamification`, etc.), unchanged. |
| Cloud | `src/lib/repositories/cloud/*` can already read the equivalent data from Supabase, but nothing calls it yet. |
| Auth | Fully wired: `AuthProvider`/`useAuth`, Google sign-in, route protection, a `profiles` row created automatically per user. |

This is deliberate: Phase 7 is additive infrastructure. Nothing about the
local-only experience changed, and no local data was touched.

## Guiding rules for every future sync phase

1. **Never delete local data as a side effect of adding cloud sync.** A
   failed or partial sync must leave the local store exactly as it was.
2. **Never let an empty cloud account silently overwrite non-empty local
   data.** The very first sync for a given user/device pair must be a
   *merge* decision, not a blind push or pull.
3. **Local always keeps working.** Every domain must remain fully usable
   offline or with Supabase unset — sync is additive, not a replacement
   for local-first behavior.
4. **Idempotency first.** The existing local stores already generate
   stable ids for most records (`client_session_id`, `client_log_id`,
   etc. — see the `unique(user_id, client_*_id)` constraints in the
   migrations) specifically so a sync pass can `upsert ... on conflict do
   nothing/update` instead of needing separate "have I synced this"
   bookkeeping. `xp_events` goes further: its primary key IS the
   deterministic event id the gamification engine already computes, so
   syncing XP is a pure upsert with no new logic.

## Planned phases

**Phase 8 — one-way backup sync (local → cloud).**
On sign-in, push any local records that don't yet exist in the
corresponding cloud table (matched by the `client_*_id` unique
constraints). This is safe because it only ever *adds* rows in the cloud;
local data and behavior are untouched. Gives every user a cloud backup
without yet trusting the cloud as a second source of truth.

**Phase 9 — read-through on additional devices.**
When a user signs in on a *second* device with no local history for a
given domain, offer to pull their cloud data down to seed the local store
(explicit user action, never automatic/silent) rather than starting them
from empty mock data. First-device behavior is unchanged.

**Phase 10 — two-way sync.**
Once both directions are proven independently, reconcile ongoing changes
from either side using `updated_at`/timestamps plus the existing
deterministic ids as the merge key. This is the only phase that needs a
real conflict-resolution policy, and it should ship with its own explicit
migration/backfill plan and rollback story — not bundled into an earlier
phase "while we're at it."

Each phase should ship independently, behind the same
`isSupabaseConfigured` / `isAuthenticated` gates already established in
Phase 7, and each should be validated with the same rigor (full test
suite, RLS review, no destructive migrations) before moving to the next.
