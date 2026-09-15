-- Fitness OS — gamification domain
--
-- Mirrors GamificationProfile / XPEvent / EarnedBadge / completedChallengeIds
-- from src/types/gamification.ts and src/lib/gamificationStore.ts. Badge
-- and challenge *definitions* (data/gamification.ts) are static app data,
-- not stored here — only the per-user unlock/completion state is.
--
-- `xp_events.event_id` is the same deterministic, source-derived string id
-- the local store already computes (see utils/gamification.ts
-- `deriveEligibleXpEvents`) — keying on (user_id, event_id) lets a future
-- sync upsert with `on conflict do nothing` and inherit the exact same
-- idempotency guarantee the local store relies on, with no separate
-- "have we synced this yet" bookkeeping.

create table public.gamification_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.xp_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  amount integer not null,
  event_date date not null,
  source_id text not null,
  description text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index xp_events_user_date_idx on public.xp_events (user_id, event_date desc);

create table public.earned_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.challenge_completions (
  user_id uuid not null references auth.users(id) on delete cascade,
  instance_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, instance_id)
);

alter table public.gamification_profiles enable row level security;
alter table public.xp_events enable row level security;
alter table public.earned_badges enable row level security;
alter table public.challenge_completions enable row level security;

create policy "gamification_profiles_select_own" on public.gamification_profiles for select using (auth.uid() = user_id);
create policy "gamification_profiles_insert_own" on public.gamification_profiles for insert with check (auth.uid() = user_id);
create policy "gamification_profiles_update_own" on public.gamification_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gamification_profiles_delete_own" on public.gamification_profiles for delete using (auth.uid() = user_id);

create policy "xp_events_select_own" on public.xp_events for select using (auth.uid() = user_id);
create policy "xp_events_insert_own" on public.xp_events for insert with check (auth.uid() = user_id);
create policy "xp_events_update_own" on public.xp_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "xp_events_delete_own" on public.xp_events for delete using (auth.uid() = user_id);

create policy "earned_badges_select_own" on public.earned_badges for select using (auth.uid() = user_id);
create policy "earned_badges_insert_own" on public.earned_badges for insert with check (auth.uid() = user_id);
create policy "earned_badges_update_own" on public.earned_badges for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "earned_badges_delete_own" on public.earned_badges for delete using (auth.uid() = user_id);

create policy "challenge_completions_select_own" on public.challenge_completions for select using (auth.uid() = user_id);
create policy "challenge_completions_insert_own" on public.challenge_completions for insert with check (auth.uid() = user_id);
create policy "challenge_completions_update_own" on public.challenge_completions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "challenge_completions_delete_own" on public.challenge_completions for delete using (auth.uid() = user_id);
