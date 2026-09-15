# Fitness OS — Supabase setup

This is a **new, dedicated Supabase project for Fitness OS only**. Never
point Fitness OS at the APFC-TRACKER Supabase project, database, or
credentials — the two apps must stay completely independent.

## 1. Create the project

1. Create a new project at [supabase.com](https://supabase.com) (any name,
   e.g. "fitness-os").
2. Note its **Project URL** and **anon/public key** from
   Project Settings → API. These are the only two values the app needs.

## 2. Apply the schema

Run the SQL files in `supabase/migrations/` **in filename order** — either:

- Paste each file's contents into the Supabase dashboard's SQL Editor and
  run them one at a time, in order, or
- Use the Supabase CLI: `supabase link --project-ref <your-project-ref>`
  then `supabase db push`.

Migrations, in order:

1. `20240101000001_profiles.sql` — profiles table, RLS, and the
   `on_auth_user_created` trigger that creates a profile row automatically
   whenever someone signs in for the first time.
2. `20240101000002_workout_schema.sql` — workout sessions/exercises/sets,
   personal records.
3. `20240101000003_progress_schema.sql` — weight logs, body measurements,
   weight goal.
4. `20240101000004_nutrition_schema.sql` — nutrition goal, food entries.
5. `20240101000005_habits_schema.sql` — habits (includes reminders),
   habit entries, water goal, water logs.
6. `20240101000006_gamification_schema.sql` — XP events, earned badges,
   challenge completions.

Every user-owned table has Row Level Security enabled with policies that
restrict all access to `auth.uid() = user_id` (or `= id` for `profiles`) —
see Part 10 of the Phase 7 spec / the migration files themselves.

## 3. Enable Google sign-in

In the Supabase dashboard:

1. **Authentication → Providers → Google** → toggle it on.
2. You'll need a **Google OAuth Client ID and Secret** from the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create (or reuse) a project, then create an **OAuth 2.0 Client ID**
     of type **Web application**.
   - **Authorized redirect URI**: use the callback URL Supabase shows on
     its Google provider settings page — it looks like
     `https://<your-project-ref>.supabase.co/auth/v1/callback`. Supabase
     generates this for you; copy it exactly into Google Cloud Console.
   - Copy the resulting **Client ID** and **Client Secret** into the
     Supabase Google provider settings and save.
3. In **Authentication → URL Configuration**, add both of these to
   **Redirect URLs** (the app always redirects back to its own origin, so
   both environments need to be allow-listed):
   - `http://localhost:5173` (or whatever port `npm run dev` prints)
   - `https://fitness-os-two.vercel.app`

This project never fabricates or stores these credentials — they only
ever live in the Supabase dashboard and Google Cloud Console, not in this
repository.

## 4. Configure the app

Copy `.env.example` to `.env.local` (already git-ignored) in the project
root and fill in the two values from step 1:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Without `.env.local`, Fitness OS runs fully local-first: no login wall, no
Supabase calls, every existing feature works exactly as it did before
Phase 7.

## What's intentionally NOT here yet

Phase 7 only lays the foundation: schema, RLS, auth, and a repository
boundary that *can* read from Supabase. It does not sync any existing
local data to the cloud yet — see `../docs/SYNC_STRATEGY.md` for the
planned Phase 8+ approach.
