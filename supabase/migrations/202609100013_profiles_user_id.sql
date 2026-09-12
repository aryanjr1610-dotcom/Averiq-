-- 202609100013_profiles_user_id.sql
-- Run in Supabase SQL Editor to resolve profile schema mismatch

alter table public.profiles
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

update public.profiles set user_id = id where user_id is null;

create unique index if not exists profiles_user_id_key on public.profiles(user_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_upsert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
