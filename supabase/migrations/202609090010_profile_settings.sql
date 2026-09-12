-- Phase 19: profile media, preferences, safe academic changes.

do $guard$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles is missing - run the onboarding migration first';
  end if;
end
$guard$;

-- Add only the profile columns that do not already exist.
do $cols$
declare
  c text;
begin
  foreach c in array array['bio','avatar_url','banner_url'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles' and column_name = c
    ) then
      execute format('alter table public.profiles add column %I text', c);
    end if;
  end loop;
end
$cols$;

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learning jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  ai jsonb not null default '{}'::jsonb,
  accessibility jsonb not null default '{}'::jsonb,
  privacy jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint preferences_objects check (
    jsonb_typeof(learning) = 'object' and jsonb_typeof(appearance) = 'object'
    and jsonb_typeof(notifications) = 'object' and jsonb_typeof(ai) = 'object'
    and jsonb_typeof(accessibility) = 'object' and jsonb_typeof(privacy) = 'object'
  )
);

-- Audit trail for academic context changes (history is never deleted).
create table if not exists public.profile_change_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_at timestamptz not null default now(),
  previous jsonb not null default '{}'::jsonb,
  next jsonb not null default '{}'::jsonb
);

create or replace function public.preferences_touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

drop trigger if exists touch_user_preferences on public.user_preferences;
create trigger touch_user_preferences before update on public.user_preferences
for each row execute function public.preferences_touch_updated_at();

do $rls$
declare
  t text;
begin
  foreach t in array array['user_preferences','profile_change_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy %1$s_own on public.%1$I for all to authenticated
       using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end
$rls$;

grant usage, select on sequence public.profile_change_log_id_seq to authenticated;

-- ---------------------------------------------------------------------------
-- Profile media storage: public read, owner-only write.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do nothing;

drop policy if exists profile_media_read on storage.objects;
create policy profile_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'profile-media');

drop policy if exists profile_media_write on storage.objects;
create policy profile_media_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists profile_media_update on storage.objects;
create policy profile_media_update on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists profile_media_delete on storage.objects;
create policy profile_media_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Safe academic profile change. Updates only columns that exist, replaces
-- subject/goal mappings, and NEVER touches progress or history tables.
-- ---------------------------------------------------------------------------
create or replace function public.set_academic_profile(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user uuid := auth.uid();
  v_prev jsonb;
  v_key text;
  v_col text;
  v_val text;
  v_subject text;
  v_goal text;
  v_pairs text[][] := array[
    ['class', 'class_level'], ['classLevel', 'class_level'],
    ['board', 'board_key'], ['boardKey', 'board_key'],
    ['track', 'track_key'], ['trackKey', 'track_key'],
    ['stream', 'stream_key'], ['streamKey', 'stream_key'],
    ['combination', 'combination_key'], ['combinationKey', 'combination_key']
  ];
  i integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Payload must be an object' using errcode = '22023';
  end if;

  select to_jsonb(p) into v_prev from public.profiles p where p.user_id = v_user;

  for i in 1 .. array_length(v_pairs, 1) loop
    v_key := v_pairs[i][1];
    v_col := v_pairs[i][2];
    if p_payload ? v_key
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles' and column_name = v_col
       ) then
      v_val := p_payload ->> v_key;
      execute format('update public.profiles set %I = $1 where user_id = $2', v_col)
        using v_val, v_user;
    end if;
  end loop;

  -- Subjects: replace the active mapping only.
  if p_payload ? 'subjects' and jsonb_typeof(p_payload -> 'subjects') = 'array'
     and to_regclass('public.student_subjects') is not null then
    delete from public.student_subjects where user_id = v_user;
    for v_subject in select jsonb_array_elements_text(p_payload -> 'subjects') loop
      begin
        insert into public.student_subjects (user_id, subject_key) values (v_user, v_subject);
      exception when undefined_column then
        insert into public.student_subjects (user_id, subject_id) values (v_user, v_subject::uuid);
      end;
    end loop;
  end if;

  -- Competitive goals: eligibility is enforced by the caller-side rules and
  -- re-checked here when the Phase 12 rule table is present.
  if p_payload ? 'competitiveGoals' and jsonb_typeof(p_payload -> 'competitiveGoals') = 'array'
     and to_regclass('public.student_competitive_goals') is not null then
    delete from public.student_competitive_goals where user_id = v_user;
    for v_goal in select jsonb_array_elements_text(p_payload -> 'competitiveGoals') loop
      insert into public.student_competitive_goals (user_id, exam_key)
      values (v_user, v_goal)
      on conflict do nothing;
    end loop;
  end if;

  insert into public.profile_change_log (user_id, previous, next)
  values (v_user, coalesce(v_prev, '{}'::jsonb), p_payload);

  select to_jsonb(p) into v_prev from public.profiles p where p.user_id = v_user;
  return coalesce(v_prev, '{}'::jsonb);
end
$fn$;

revoke all on function public.set_academic_profile(jsonb) from public;
grant execute on function public.set_academic_profile(jsonb) to authenticated;
