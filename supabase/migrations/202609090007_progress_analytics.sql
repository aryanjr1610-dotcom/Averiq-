-- Averiq Phase 16: private per-student progress, sessions, activity, mastery cache.
set local search_path = public;

do $guard$
begin
  if to_regclass('public.lessons') is null then
    raise exception 'curriculum tables required (migration 202609080002)';
  end if;
  if to_regclass('public.lesson_progress') is not null then
    raise exception 'lesson_progress already exists; review before re-running';
  end if;
end
$guard$;

create or replace function public.progress_touch_updated_at()
returns trigger language plpgsql as $fn$
begin new.updated_at := now(); return new; end
$fn$;

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('not_started','in_progress','completed')),
  reading_progress numeric(5,2) not null default 0 check (reading_progress between 0 and 100),
  last_position text,
  study_seconds integer not null default 0 check (study_seconds >= 0 and study_seconds <= 2000000),
  started_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id),
  constraint lesson_progress_completion check (status <> 'completed' or completed_at is not null)
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('lesson','practice','revision','flashcards','focus','visual')),
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  exam_key text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  active_seconds integer not null default 0 check (active_seconds >= 0 and active_seconds <= 86400),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'lesson_opened','lesson_completed','practice_completed','revision_completed',
    'flashcards_completed','formula_viewed','derivation_viewed','visual_opened',
    'focus_completed','test_completed')),
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  exam_key text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint activity_metadata_object check (jsonb_typeof(metadata) = 'object')
);

-- Cache only. Every value is recomputed from evidence and is safe to delete.
create table public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  scope text not null default 'board' check (scope in ('board','competitive')),
  exam_key text not null default '',
  score integer check (score between 0 and 100),
  band text not null default 'insufficient'
    check (band in ('insufficient','needs_work','developing','good','strong')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  recent_accuracy numeric(5,2) check (recent_accuracy between 0 and 100),
  reading_progress numeric(5,2) check (reading_progress between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  last_practiced_at timestamptz,
  last_revised_at timestamptz,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id, scope, exam_key),
  constraint topic_mastery_evidence_object check (jsonb_typeof(evidence) = 'object'),
  constraint topic_mastery_score_requires_band
    check ((band = 'insufficient' and score is null) or (band <> 'insufficient' and score is not null))
);

create index lesson_progress_recent on public.lesson_progress (user_id, last_opened_at desc);
create index lesson_progress_status on public.lesson_progress (user_id, status);
create index learning_sessions_window on public.learning_sessions (user_id, started_at desc);
create index activity_events_window on public.activity_events (user_id, occurred_at desc);
create index activity_events_topic on public.activity_events (user_id, topic_id);
create index topic_mastery_lookup on public.topic_mastery (user_id, scope, band);

do $rls$
declare t text;
begin
  foreach t in array array['lesson_progress','learning_sessions','activity_events','topic_mastery']
  loop
    if t <> 'activity_events' then
      execute format(
        'create trigger touch_%1$s before update on public.%1$I for each row execute function public.progress_touch_updated_at()',
        t);
    end if;
    execute format('alter table public.%1$I enable row level security', t);
    execute format('alter table public.%1$I force row level security', t);
    execute format('revoke all on public.%1$I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%1$I to authenticated', t);
    execute format('grant all on public.%1$I to service_role', t);
    execute format(
      'create policy %1$s_own on public.%1$I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t);
  end loop;
end
$rls$;

grant usage, select on sequence public.activity_events_id_seq to authenticated;
grant all on sequence public.activity_events_id_seq to service_role;
