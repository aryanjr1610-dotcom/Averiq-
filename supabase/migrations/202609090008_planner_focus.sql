-- Phase 17: planner, focus sessions, streak, XP, achievements.
-- Complements (never duplicates) Phase 16 learning_sessions / activity_events.

do $guard$
begin
  if to_regclass('public.lessons') is null then
    raise exception 'Run the earlier Averiq migrations (0001-0007) first';
  end if;
  if to_regclass('public.study_tasks') is not null then
    raise exception 'public.study_tasks already exists - review before re-running';
  end if;
end
$guard$;

create or replace function public.planner_touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

create table public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null default 'study',
  status text not null default 'pending',
  priority text not null default 'normal',
  due_at timestamptz,
  scheduled_date date,
  estimated_minutes integer,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  practice_config jsonb,
  recurrence text not null default 'none',
  reminder_at timestamptz,
  reminder_enabled boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_task_title_length check (char_length(title) between 1 and 200),
  constraint study_task_description_length check (description is null or char_length(description) <= 2000),
  constraint study_task_type check (task_type in ('study','revision','practice','assignment','test','custom')),
  constraint study_task_status check (status in ('pending','in_progress','completed','cancelled')),
  constraint study_task_priority check (priority in ('low','normal','high')),
  constraint study_task_recurrence check (recurrence in ('none','daily','weekly')),
  constraint study_task_minutes check (estimated_minutes is null or estimated_minutes between 5 and 600),
  constraint study_task_config_object check (practice_config is null or jsonb_typeof(practice_config) = 'object')
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.study_tasks(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  label text,
  planned_minutes integer not null default 25,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  paused_ms integer not null default 0,
  focus_seconds integer not null default 0,
  status text not null default 'running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint focus_planned_range check (planned_minutes between 5 and 240),
  constraint focus_paused_positive check (paused_ms >= 0),
  constraint focus_seconds_range check (focus_seconds between 0 and 86400),
  constraint focus_status check (status in ('running','paused','completed','cancelled')),
  constraint focus_label_length check (label is null or char_length(label) <= 160)
);

-- Daily rollup that powers streak + XP without re-scanning event tables.
create table public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  xp_earned integer not null default 0,
  study_seconds integer not null default 0,
  focus_seconds integer not null default 0,
  lessons_completed integer not null default 0,
  questions_answered integer not null default 0,
  tasks_completed integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day),
  constraint daily_activity_non_negative check (
    xp_earned >= 0 and study_seconds >= 0 and focus_seconds >= 0
    and lessons_completed >= 0 and questions_answered >= 0 and tasks_completed >= 0
  ),
  constraint daily_activity_caps check (study_seconds <= 86400 and focus_seconds <= 86400 and xp_earned <= 5000)
);

create table public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_day date,
  updated_at timestamptz not null default now(),
  constraint streak_non_negative check (current_streak >= 0 and longest_streak >= 0)
);

create table public.user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  level integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint xp_non_negative check (total_xp >= 0 and level >= 1)
);

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key),
  constraint achievement_key_length check (char_length(achievement_key) between 1 and 64)
);

create index study_tasks_day on public.study_tasks (user_id, scheduled_date desc nulls last);
create index study_tasks_open on public.study_tasks (user_id, status, due_at);
create index focus_sessions_recent on public.focus_sessions (user_id, started_at desc);
create index focus_sessions_open on public.focus_sessions (user_id, status);
create index daily_activity_recent on public.daily_activity (user_id, day desc);

do $rls$
declare
  t text;
begin
  foreach t in array array[
    'study_tasks','focus_sessions','daily_activity','user_streaks','user_xp','user_achievements'
  ] loop
    if t <> 'user_achievements' then
      execute format(
        'create trigger touch_%1$s before update on public.%1$I
         for each row execute function public.planner_touch_updated_at()', t);
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format(
      'create policy %1$s_own on public.%1$I
       for all to authenticated
       using (auth.uid() = user_id)
       with check (auth.uid() = user_id)', t);
  end loop;
end
$rls$;
