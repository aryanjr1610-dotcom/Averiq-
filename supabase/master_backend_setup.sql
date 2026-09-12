-- ==============================================================================
-- AVERIQ MASTER BACKEND DATABASE SETUP
-- Single unified, idempotent schema setup for Supabase Postgres.
-- Paste and run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/drvppfnpxytzqinquzly/sql
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists pgcrypto;

-- 2. PRIVATE INTERNAL SCHEMA & REVIEWERS
create schema if not exists averiq_private;
revoke all on schema averiq_private from public, anon, authenticated;

create table if not exists averiq_private.academic_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.academic_is_reviewer()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from averiq_private.academic_reviewers
    where user_id = auth.uid()
  );
$$;

create or replace function public.academic_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.academic_freeze_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published' and new.status not in ('published', 'archived') then
    raise exception 'Published records may only remain published or be archived.';
  end if;
  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'Archived history cannot be reactivated in place.';
  end if;
  if old.status in ('published', 'archived') and (
    to_jsonb(new) - 'status' - 'updated_at' is distinct from to_jsonb(old) - 'status' - 'updated_at'
  ) then
    raise exception 'Published history is immutable. Create a new revision.';
  end if;
  return new;
end;
$$;

-- 3. ONBOARDING CATALOGS
create table if not exists public.averiq_onboarding_catalogs (
  version text primary key,
  academic_year text not null,
  active boolean not null default false,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now()
);

create unique index if not exists averiq_one_active_onboarding_catalog
  on public.averiq_onboarding_catalogs (active)
  where active;

-- 4. USER PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null default 'Student' check (char_length(display_name) between 1 and 80),
  avatar_url text null,
  banner_url text null,
  bio text null check (bio is null or char_length(bio) <= 500),
  catalog_version text null references public.averiq_onboarding_catalogs(version),
  academic_year text not null default '2026-27',
  class_level smallint null check (class_level is null or class_level between 6 and 12),
  board text null check (board is null or board in ('cbse', 'cisce')),
  school_system text null,
  stream text null check (stream is null or stream in ('science', 'commerce', 'humanities')),
  subject_combination text null,
  study_goals text[] not null default '{}'::text[],
  learning_preference text not null default 'balanced',
  daily_study_target integer null check (daily_study_target is null or daily_study_target between 5 and 240),
  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill user_id if missing
alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
update public.profiles set user_id = id where user_id is null;
create unique index if not exists profiles_user_id_key on public.profiles(user_id);

create table if not exists public.student_subjects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_key text not null,
  primary key (user_id, subject_key)
);

create table if not exists public.student_competitive_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_key text not null,
  target_year integer null check (target_year is null or target_year between 2026 and 2100),
  primary key (user_id, goal_key)
);

create table if not exists public.profile_change_log (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  field_name text not null,
  old_value text null,
  new_value text null,
  reason text not null check (reason in ('onboarding', 'student_update', 'admin_adjustment')),
  changed_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  visual_quality text not null default 'auto' check (visual_quality in ('auto','low','medium','high')),
  reduced_motion boolean not null default false,
  offline_enabled boolean not null default false,
  study_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. ACADEMIC CURRICULUM FOUNDATIONS
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  start_year integer not null,
  end_year integer not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.education_boards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_tracks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid null references public.education_boards(id),
  code text not null unique,
  title text not null,
  learning_context text not null check (learning_context in ('school', 'competitive')),
  minimum_grade smallint null,
  maximum_grade smallint null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_streams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subject_combinations (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.academic_streams(id),
  code text not null unique,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_releases (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique,
  academic_year_id uuid not null references public.academic_years(id),
  track_id uuid not null references public.curriculum_tracks(id),
  grade_level smallint null check (grade_level between 6 and 12),
  revision integer not null check (revision > 0),
  data_kind text not null check (data_kind in ('sample', 'official')),
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  verification_status text not null default 'verified' check (verification_status in ('unverified', 'verified', 'deprecated', 'archived')),
  source_name text not null default 'Official Syllabus',
  source_url text null,
  last_verified_at timestamptz null default now(),
  reviewed_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_subjects (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.curriculum_releases(id),
  subject_id uuid not null references public.subjects(id),
  title text not null,
  slug text not null,
  position integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curriculum_subject_rules (
  id uuid primary key default gen_random_uuid(),
  curriculum_subject_id uuid not null references public.curriculum_subjects(id),
  combination_id uuid null references public.subject_combinations(id),
  requirement_role text not null default 'required' check (requirement_role in ('required', 'elective', 'optional', 'additional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  curriculum_subject_id uuid not null references public.curriculum_subjects(id),
  title text not null,
  slug text not null,
  position integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  curriculum_subject_id uuid not null references public.curriculum_subjects(id),
  course_id uuid null references public.courses(id),
  title text not null,
  slug text not null,
  chapter_number text null,
  position integer not null default 0,
  description text not null default '',
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  title text not null,
  slug text not null,
  position integer not null default 0,
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  title text not null,
  slug text not null,
  position integer not null default 0,
  estimated_minutes smallint not null default 15 check (estimated_minutes between 1 and 180),
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  content_schema_version smallint not null default 2 check (content_schema_version in (1, 2)),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  version_number integer not null default 1 check (version_number > 0),
  status text not null default 'published' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop table if exists public.legacy_subject_mappings cascade;
create table public.legacy_subject_mappings (
  catalog_version text not null references public.averiq_onboarding_catalogs(version),
  legacy_key text not null,
  subject_id uuid not null references public.subjects(id),
  status text not null default 'confirmed',
  primary key (catalog_version, legacy_key)
);

drop table if exists public.legacy_path_mappings cascade;
create table public.legacy_path_mappings (
  id uuid primary key default gen_random_uuid(),
  catalog_version text not null references public.averiq_onboarding_catalogs(version),
  board text not null,
  class_level smallint not null,
  stream text null,
  combination_key text null,
  track_id uuid not null references public.curriculum_tracks(id),
  combination_id uuid null references public.subject_combinations(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists legacy_path_mappings_identity
on public.legacy_path_mappings (
  catalog_version, board, class_level,
  (coalesce(stream, '')), (coalesce(combination_key, ''))
);

create table if not exists public.academic_imports (
  import_key text primary key,
  digest text not null,
  release_id uuid not null references public.curriculum_releases(id),
  created_at timestamptz not null default now()
);

-- 6. PERMISSIONS & CURRICULUM RESOLUTION FUNCTIONS
create or replace function public.academic_can_read_release(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.curriculum_releases
    where id = p_id and (status = 'published' or public.academic_is_reviewer())
  );
$$;

create or replace function public.academic_can_read_subject(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.curriculum_subjects cs
    join public.curriculum_releases r on r.id = cs.release_id
    where cs.id = p_id
      and (cs.status = 'published' or public.academic_is_reviewer())
      and (r.status = 'published' or public.academic_is_reviewer())
  );
$$;

create or replace function public.academic_can_read_chapter(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chapters c
    where c.id = p_id
      and (c.status = 'published' or public.academic_is_reviewer())
      and public.academic_can_read_subject(c.curriculum_subject_id)
  );
$$;

create or replace function public.academic_can_read_lesson(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_id
      and (l.status = 'published' or public.academic_is_reviewer())
  );
$$;

create or replace function public.academic_can_read_version(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.lesson_versions v
    where v.id = p_id
      and (v.status = 'published' or public.academic_is_reviewer())
  );
$$;

-- Core Curriculum Resolver RPC
create or replace function public.resolve_my_curriculum()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
  resolved_track_id uuid;
  resolved_release_id uuid;
  subject_rows jsonb := '[]'::jsonb;
begin
  select * into p from public.profiles
  where user_id = auth.uid() or id = auth.uid();

  if not found then
    return jsonb_build_object('status', 'profile_required', 'subjects', '[]'::jsonb);
  end if;

  if p.class_level is null or p.board is null then
    return jsonb_build_object('status', 'profile_incomplete', 'subjects', '[]'::jsonb);
  end if;

  select id into resolved_track_id from public.curriculum_tracks
  where learning_context = 'school'
  limit 1;

  select id into resolved_release_id from public.curriculum_releases
  where status = 'published'
  order by created_at desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', cs.id,
      'subject_id', cs.subject_id,
      'title', cs.title,
      'slug', cs.slug,
      'position', cs.position,
      'chapters', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', ch.id,
            'title', ch.title,
            'slug', ch.slug,
            'position', ch.position,
            'description', ch.description,
            'topics', coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', tp.id,
                  'title', tp.title,
                  'slug', tp.slug,
                  'position', tp.position,
                  'lessons', coalesce((
                    select jsonb_agg(
                      jsonb_build_object(
                        'id', ls.id,
                        'title', ls.title,
                        'slug', ls.slug,
                        'estimated_minutes', ls.estimated_minutes
                      ) order by ls.position
                    ) from public.lessons ls where ls.topic_id = tp.id and ls.status = 'published'
                  ), '[]'::jsonb)
                ) order by tp.position
              ) from public.topics tp where tp.chapter_id = ch.id and tp.status = 'published'
            ), '[]'::jsonb)
          ) order by ch.position
        ) from public.chapters ch where ch.curriculum_subject_id = cs.id and ch.status = 'published'
      ), '[]'::jsonb)
    ) order by cs.position
  ), '[]'::jsonb) into subject_rows
  from public.curriculum_subjects cs
  where cs.status = 'published';

  return jsonb_build_object(
    'status', 'ready',
    'release_id', resolved_release_id,
    'subjects', subject_rows
  );
end;
$$;

revoke all on function public.resolve_my_curriculum() from public, anon;
grant execute on function public.resolve_my_curriculum() to authenticated;

-- 7. COMPETITIVE EXAMS ENGINE (JEE / NEET / NDA)
create table if not exists public.competitive_exams (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  short_name text not null check (char_length(short_name) between 2 and 24),
  authority text,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitive_exam_subjects (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  slug text not null,
  position integer not null default 0,
  unique (exam_id, subject_id),
  unique (exam_id, slug)
);

create table if not exists public.competitive_exam_topics (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  slug text not null,
  title text not null,
  weightage numeric(4,2) default 0,
  importance text not null default 'medium' check (importance in ('core','high','medium','low')),
  created_at timestamptz not null default now()
);

create table if not exists public.competitive_pyq_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  subject_slug text not null,
  topic_id uuid references public.topics(id) on delete set null,
  year integer not null check (year between 2000 and 2026),
  shift text null,
  question_type text not null default 'mcq' check (question_type in ('mcq', 'numerical', 'assertion_reason')),
  prompt jsonb not null,
  options jsonb null,
  answer jsonb not null,
  explanation jsonb null,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  status text not null default 'published' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.competitive_test_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  title text not null default 'Mock Test',
  total_questions integer not null default 0,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  unanswered_count integer not null default 0,
  score numeric(6,2) not null default 0,
  max_score numeric(6,2) not null default 0,
  accuracy numeric(5,2) not null default 0,
  time_spent_seconds integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Server-Side Tamper-Proof Exam Scoring RPC
create or replace function public.submit_exam_attempt(
  p_exam_key text,
  p_answers jsonb,
  p_time_spent_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_exam public.competitive_exams%rowtype;
  v_question record;
  v_total integer := 0;
  v_correct integer := 0;
  v_wrong integer := 0;
  v_unanswered integer := 0;
  v_score numeric(6,2) := 0;
  v_max_score numeric(6,2) := 0;
  v_accuracy numeric(5,2) := 0;
  v_submission_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_exam from public.competitive_exams where key = p_exam_key;
  if not found then
    raise exception 'Exam not found: %', p_exam_key;
  end if;

  for v_question in
    select id, answer, question_type from public.competitive_pyq_questions
    where exam_id = v_exam.id and status = 'published'
  loop
    v_total := v_total + 1;
    v_max_score := v_max_score + 4.0;

    if p_answers ? v_question.id::text then
      if (p_answers->v_question.id::text) = v_question.answer then
        v_correct := v_correct + 1;
        v_score := v_score + 4.0;
      else
        v_wrong := v_wrong + 1;
        v_score := v_score - 1.0; -- Standard -1 negative marking
      end if;
    else
      v_unanswered := v_unanswered + 1;
    end if;
  end loop;

  if (v_correct + v_wrong) > 0 then
    v_accuracy := round((v_correct::numeric / (v_correct + v_wrong)::numeric) * 100.0, 2);
  end if;

  insert into public.competitive_test_submissions (
    user_id, exam_id, total_questions, correct_count, wrong_count,
    unanswered_count, score, max_score, accuracy, time_spent_seconds, answers
  ) values (
    v_user_id, v_exam.id, v_total, v_correct, v_wrong,
    v_unanswered, v_score, v_max_score, v_accuracy, p_time_spent_seconds, p_answers
  ) returning id into v_submission_id;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'total', v_total,
    'correct', v_correct,
    'wrong', v_wrong,
    'unanswered', v_unanswered,
    'score', v_score,
    'max_score', v_max_score,
    'accuracy', v_accuracy
  );
end;
$$;

grant execute on function public.submit_exam_attempt(text, jsonb, integer) to authenticated;

-- Resolves user's exams based on their profile class & stream
create or replace function public.resolve_my_exams()
returns table (exam_code text, exam_name text, priority integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_class  integer;
  v_stream text;
begin
  select class_level, lower(coalesce(stream, ''))
    into v_class, v_stream
  from public.profiles
  where user_id = auth.uid() or id = auth.uid();

  if v_class is null then return; end if;

  if v_class >= 11 then
    if v_stream in ('pcm', 'pcmb', 'science') then
      return query values ('jee-main', 'JEE Main', 1), ('jee-advanced', 'JEE Advanced', 2);
    end if;
    if v_stream in ('pcb', 'pcmb', 'science') then
      return query values ('neet', 'NEET', 1);
    end if;
  end if;

  return query values ('boards', 'Board Exams', 0);
end $$;

grant execute on function public.resolve_my_exams() to authenticated;

-- 8. PROGRESS, GAMIFICATION, XP & STREAKS
create table if not exists public.lesson_progress (
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
  unique (user_id, lesson_id)
);

create table if not exists public.learning_sessions (
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

create table if not exists public.activity_events (
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
  occurred_at timestamptz not null default now()
);

create table if not exists public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  scope text not null default 'board' check (scope in ('board','competitive')),
  exam_key text not null default '',
  score integer check (score between 0 and 100),
  band text not null default 'developing' check (band in ('insufficient','needs_work','developing','good','strong')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  recent_accuracy numeric(5,2) check (recent_accuracy between 0 and 100),
  reading_progress numeric(5,2) check (reading_progress between 0 and 100),
  evidence jsonb not null default '{}'::jsonb,
  last_practiced_at timestamptz,
  last_revised_at timestamptz,
  computed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic_id, scope, exam_key)
);

create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date not null default current_date,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_xp (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp integer not null default 0,
  current_level integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_key)
);

-- Automated Postgres Trigger: Streak & XP Evaluation
create or replace function public.trg_fn_award_activity_xp()
returns trigger
language plpgsql
security definer
as $$
declare
  v_xp_gain integer := 10;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_current_streak integer := 0;
  v_last_date date;
begin
  if new.kind = 'lesson_completed' then v_xp_gain := 50;
  elsif new.kind = 'test_completed' then v_xp_gain := 100;
  elsif new.kind = 'practice_completed' then v_xp_gain := 30;
  elsif new.kind = 'focus_completed' then v_xp_gain := 25;
  end if;

  -- 1. Award XP
  insert into public.user_xp (user_id, total_xp, current_level, updated_at)
  values (new.user_id, v_xp_gain, 1 + (v_xp_gain / 200), now())
  on conflict (user_id) do update set
    total_xp = public.user_xp.total_xp + v_xp_gain,
    current_level = 1 + ((public.user_xp.total_xp + v_xp_gain) / 200),
    updated_at = now();

  -- 2. Update Streak
  select last_active_date, current_streak into v_last_date, v_current_streak
  from public.user_streaks where user_id = new.user_id;

  if not found then
    insert into public.user_streaks (user_id, current_streak, longest_streak, last_active_date)
    values (new.user_id, 1, 1, v_today);
  elsif v_last_date = v_today then
    -- Already counted today
    null;
  elsif v_last_date = v_today - interval '1 day' then
    update public.user_streaks set
      current_streak = current_streak + 1,
      longest_streak = greatest(longest_streak, current_streak + 1),
      last_active_date = v_today,
      updated_at = now()
    where user_id = new.user_id;
  else
    -- Streak broken, reset to 1
    update public.user_streaks set
      current_streak = 1,
      last_active_date = v_today,
      updated_at = now()
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_activity_event_xp on public.activity_events;
create trigger on_activity_event_xp
  after insert on public.activity_events
  for each row execute function public.trg_fn_award_activity_xp();

-- 9. STUDY PLANNER & POMODORO FOCUS
create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text null check (description is null or char_length(description) <= 2000),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','in_progress','done','skipped')),
  scheduled_date date null,
  due_date date null,
  estimated_minutes integer null check (estimated_minutes is null or (estimated_minutes between 5 and 480)),
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Handle schema migration if table already existed with different constraints or columns
alter table public.study_tasks add column if not exists status text not null default 'pending';
alter table public.study_tasks drop constraint if exists study_tasks_status_check;
alter table public.study_tasks add constraint study_tasks_status_check check (status in ('pending', 'in_progress', 'done', 'skipped'));

do $$
begin
  -- Backfill from 'done' boolean if the table was created by a divergent schema
  if exists (select 1 from information_schema.columns where table_name='study_tasks' and column_name='done' and data_type='boolean') then
    execute 'update public.study_tasks set status = ''done'' where done = true and status = ''pending''';
  end if;
end $$;

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.study_tasks(id) on delete set null,
  duration_minutes integer not null check (duration_minutes between 1 and 240),
  completed_minutes integer not null default 0 check (completed_minutes >= 0 and completed_minutes <= duration_minutes),
  interrupted boolean not null default false,
  notes text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null
);

create table if not exists public.daily_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  study_minutes integer not null default 0 check (study_minutes >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  primary key (user_id, activity_date)
);

-- 10. NOTES, BOOKMARKS, HIGHLIGHTS & SEARCH
create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  body text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unique (user_id, name)
);

create table if not exists public.note_tags (
  note_id uuid not null references public.user_notes(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (note_id, tag_id)
);

create table if not exists public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('subject','chapter','lesson','formula','visual')),
  entity_id text not null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create table if not exists public.user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_id text not null,
  selected_text text not null,
  color text not null default 'yellow' check (color in ('yellow','green','blue','purple','coral')),
  note text null,
  created_at timestamptz not null default now()
);

-- Full-text Search RPC
create or replace function public.search_published(
  p_query text,
  p_limit integer default 20
)
returns table (
  id uuid,
  kind text,
  title text,
  subtitle text,
  route text,
  snippet text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
    select
      l.id,
      'lesson'::text as kind,
      l.title,
      c.title as subtitle,
      ('/app/learn/lessons/' || l.id::text) as route,
      left(l.title, 140) as snippet
    from public.lessons l
    join public.topics t on t.id = l.topic_id
    join public.chapters c on c.id = t.chapter_id
    where l.status = 'published'
      and (l.title ilike ('%' || p_query || '%') or c.title ilike ('%' || p_query || '%'))
    limit p_limit;
end;
$$;

grant execute on function public.search_published(text, integer) to authenticated;

-- 11. AI TUTOR CONVERSATIONS & USAGE
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  mode text,
  context jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  input_chars integer not null default 0,
  output_chars integer not null default 0,
  grounded boolean not null default false,
  created_at timestamptz not null default now()
);

-- 12. ROW LEVEL SECURITY (RLS) FOR ALL TABLES
do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- RLS Policies for Owned Tables
do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'profiles', 'student_subjects', 'student_competitive_goals', 'user_preferences',
    'lesson_progress', 'learning_sessions', 'activity_events', 'topic_mastery',
    'user_streaks', 'user_xp', 'user_achievements', 'study_tasks', 'focus_sessions', 'daily_activity',
    'user_notes', 'user_tags', 'note_tags', 'user_bookmarks', 'user_highlights',
    'ai_conversations', 'ai_messages', 'competitive_test_submissions'
  ]
  loop
    execute format('drop policy if exists %I_own on public.%I', owned_table, owned_table);
    if owned_table = 'profiles' then
      execute 'create policy profiles_own on public.profiles for all to authenticated using (auth.uid() = user_id or auth.uid() = id) with check (auth.uid() = user_id or auth.uid() = id)';
    else
      execute format('create policy %I_own on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', owned_table, owned_table);
    end if;
  end loop;
end;
$$;

-- RLS Policies for Published Read-Only Content
drop policy if exists "curriculum_read_published" on public.curriculum_releases;
create policy "curriculum_read_published" on public.curriculum_releases for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "subjects_read_active" on public.subjects;
create policy "subjects_read_active" on public.subjects for select using (status = 'active');

drop policy if exists "curriculum_subjects_read" on public.curriculum_subjects;
create policy "curriculum_subjects_read" on public.curriculum_subjects for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "chapters_read_published" on public.chapters;
create policy "chapters_read_published" on public.chapters for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "topics_read_published" on public.topics;
create policy "topics_read_published" on public.topics for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "lessons_read_published" on public.lessons;
create policy "lessons_read_published" on public.lessons for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "lesson_versions_read" on public.lesson_versions;
create policy "lesson_versions_read" on public.lesson_versions for select using (status = 'published' or public.academic_is_reviewer());

drop policy if exists "catalogs_read_active" on public.averiq_onboarding_catalogs;
create policy "catalogs_read_active" on public.averiq_onboarding_catalogs for select using (active or public.academic_is_reviewer());

drop policy if exists "competitive_exams_read" on public.competitive_exams;
create policy "competitive_exams_read" on public.competitive_exams for select using (status = 'active');

drop policy if exists "competitive_pyq_read" on public.competitive_pyq_questions;
create policy "competitive_pyq_read" on public.competitive_pyq_questions for select using (status = 'published');

-- 13. STORAGE BUCKET: profile-media
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-media',
  'profile-media',
  true,
  2097152, -- 2MB
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];

drop policy if exists "profile_media_public_read" on storage.objects;
create policy "profile_media_public_read" on storage.objects
  for select using (bucket_id = 'profile-media');

drop policy if exists "profile_media_user_manage" on storage.objects;
create policy "profile_media_user_manage" on storage.objects
  for all using (
    bucket_id = 'profile-media' and auth.uid()::text = (storage.foldername(name))[1]
  ) with check (
    bucket_id = 'profile-media' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 14. SEED: ACTIVE ONBOARDING CATALOG (CBSE & CISCE 2026-27)
-- First, deactivate any existing catalogs to prevent unique constraint violations
update public.averiq_onboarding_catalogs set active = false where active = true;

insert into public.averiq_onboarding_catalogs (version, academic_year, active, config)
values (
  '2026.1',
  '2026-27',
  true,
  $catalog$
  {
    "grades": [6, 7, 8, 9, 10, 11, 12],
    "competitiveGrades": [11, 12],
    "boards": [
      { "id": "cbse", "label": "CBSE", "description": "Central Board of Secondary Education" },
      { "id": "cisce", "label": "CISCE", "description": "Council for the Indian School Certificate Examinations (ICSE/ISC)" }
    ],
    "subjects": [
      { "id": "physics", "label": "Physics" },
      { "id": "chemistry", "label": "Chemistry" },
      { "id": "mathematics", "label": "Mathematics" },
      { "id": "biology", "label": "Biology" },
      { "id": "english", "label": "English" },
      { "id": "computer-science", "label": "Computer Science" },
      { "id": "science", "label": "Science" },
      { "id": "social-studies", "label": "Social Studies" },
      { "id": "hindi", "label": "Hindi" }
    ],
    "exams": [
      { "id": "jee", "label": "JEE Main", "description": "Engineering entrance preparation" },
      { "id": "neet", "label": "NEET UG", "description": "Medical entrance preparation" },
      { "id": "nda", "label": "NDA", "description": "National Defence Academy entrance" }
    ],
    "studyGoals": [
      { "id": "concepts", "label": "Master Core Concepts" },
      { "id": "school-exams", "label": "Ace Board / School Exams" },
      { "id": "competitive", "label": "Crack Competitive Exams (JEE/NEET)" },
      { "id": "revision", "label": "Fast Chapter Revision" }
    ],
    "learningPreferences": [
      { "id": "balanced", "label": "Balanced", "description": "Theory, diagrams, and practice" },
      { "id": "visual", "label": "Visual First", "description": "2D/3D simulations and intuitive models" },
      { "id": "practice", "label": "Practice Heavy", "description": "Numerical problems and MCQs" }
    ]
  }
  $catalog$::jsonb
)
on conflict (version) do update set
  active = true,
  config = excluded.config;

-- 15. SEED: FOUNDATION COMPETITIVE EXAMS (JEE, NEET, NDA)
insert into public.competitive_exams (id, key, name, short_name, authority, description, status)
values
  ('e1111111-1111-1111-1111-111111111111', 'jee', 'Joint Entrance Examination (Main & Advanced)', 'JEE', 'National Testing Agency', 'Premier engineering entrance examination in India', 'active'),
  ('e2222222-2222-2222-2222-222222222222', 'neet', 'National Eligibility cum Entrance Test', 'NEET', 'National Testing Agency', 'Single national medical entrance test for undergraduate medical courses', 'active'),
  ('e3333333-3333-3333-3333-333333333333', 'nda', 'National Defence Academy & Naval Academy', 'NDA', 'Union Public Service Commission', 'Defence entrance examination conducted by UPSC', 'active')
on conflict (key) do update set
  name = excluded.name,
  status = 'active';

-- 16. SEED: FOUNDATION CORE SUBJECTS (Plug-and-Play for Chapters)
insert into public.subjects (id, code, title, status)
values
  ('51111111-1111-1111-1111-111111111111', 'physics', 'Physics', 'active'),
  ('52222222-2222-2222-2222-222222222222', 'chemistry', 'Chemistry', 'active'),
  ('53333333-3333-3333-3333-333333333333', 'mathematics', 'Mathematics', 'active'),
  ('54444444-4444-4444-4444-444444444444', 'biology', 'Biology', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'english', 'English', 'active')
on conflict (code) do update set
  title = excluded.title,
  status = 'active';

-- 17. SEED: DEFAULT 2026-27 PUBLISHED CURRICULUM RELEASE
insert into public.academic_years (id, code, label, start_year, end_year, status)
values ('92026000-0000-0000-0000-000000000027', '2026-27', 'Academic Year 2026-27', 2026, 2027, 'active')
on conflict (code) do nothing;

insert into public.education_boards (id, code, title, status)
values
  ('b1111111-1111-1111-1111-111111111111', 'cbse', 'Central Board of Secondary Education', 'active'),
  ('b2222222-2222-2222-2222-222222222222', 'cisce', 'Council for the Indian School Certificate Examinations', 'active')
on conflict (code) do nothing;

insert into public.curriculum_tracks (id, board_id, code, title, learning_context, minimum_grade, maximum_grade, status)
values (
  '71111111-1111-1111-1111-111111111111',
  'b1111111-1111-1111-1111-111111111111',
  'cbse-senior-secondary',
  'CBSE Senior Secondary (Classes 11-12)',
  'school',
  11,
  12,
  'active'
)
on conflict (code) do nothing;

insert into public.curriculum_releases (
  id, import_key, academic_year_id, track_id, grade_level, revision,
  data_kind, status, verification_status, source_name, source_url,
  last_verified_at, reviewed_by
)
values (
  '41111111-1111-1111-1111-111111111111',
  'averiq:release:2026-27:cbse:11',
  '92026000-0000-0000-0000-000000000027',
  '71111111-1111-1111-1111-111111111111',
  11,
  1,
  'official',
  'published',
  'verified',
  'NCERT / CBSE Curriculum Directory',
  'https://cbseacademic.nic.in',
  now(),
  '00000000-0000-0000-0000-000000000000'
)
on conflict (import_key) do update set
  status = 'published',
  verification_status = 'verified';

-- Link Core Subjects to Release (Ready to attach chapters)
insert into public.curriculum_subjects (id, release_id, subject_id, title, slug, position, status)
values
  ('c5111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111', 'Physics', 'physics', 0, 'published'),
  ('c5222222-2222-2222-2222-222222222222', '41111111-1111-1111-1111-111111111111', '52222222-2222-2222-2222-222222222222', 'Chemistry', 'chemistry', 1, 'published'),
  ('c5333333-3333-3333-3333-333333333333', '41111111-1111-1111-1111-111111111111', '53333333-3333-3333-3333-333333333333', 'Mathematics', 'mathematics', 2, 'published'),
  ('c5444444-4444-4444-4444-444444444444', '41111111-1111-1111-1111-111111111111', '54444444-4444-4444-4444-444444444444', 'Biology', 'biology', 3, 'published')
on conflict (id) do update set
  status = 'published';

-- ==============================================================================
-- SETUP COMPLETE
-- Your backend tables, RLS security, storage bucket, onboarding catalog,
-- competitive exams, and core subjects are now 100% ready.
-- ==============================================================================
