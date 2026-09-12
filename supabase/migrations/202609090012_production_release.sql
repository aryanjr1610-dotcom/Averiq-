-- Phase 22: production release gating, sample-data quarantine, checklist seeding.

do $guard$
begin
  if to_regclass('public.curriculum_releases') is null then
    raise exception 'Curriculum tables are missing - apply 202609080002 first';
  end if;
  if to_regclass('public.content_checklist') is null then
    raise exception 'Apply 202609090011_admin_cms.sql before this migration';
  end if;
end
$guard$;

-- 1. Mark development/sample data explicitly so student queries can exclude it.
do $flags$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'curriculum_releases' and column_name = 'is_development'
  ) then
    alter table public.curriculum_releases add column is_development boolean not null default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'curriculum_releases' and column_name = 'source_url'
  ) then
    alter table public.curriculum_releases add column source_url text;
    alter table public.curriculum_releases add column source_name text;
    alter table public.curriculum_releases add column source_published_on date;
    alter table public.curriculum_releases add column last_verified_at timestamptz;
    alter table public.curriculum_releases add column verified_by uuid references auth.users(id) on delete set null;
  end if;
end
$flags$;

-- Existing sample releases are development-only from now on.
update public.curriculum_releases
set is_development = true
where release_key in (
  'starter-2026-27-v1',
  'sample-cbse-class-12-2026-27-v1',
  'sample-cbse-class-12-2026-27-v2'
);

-- A production release cannot be published without verified official-source metadata.
alter table public.curriculum_releases drop constraint if exists curriculum_release_source_required;
alter table public.curriculum_releases add constraint curriculum_release_source_required check (
  is_development
  or status <> 'published'
  or (source_url is not null and source_name is not null and last_verified_at is not null and verified_by is not null)
);

-- 2. Student-facing view that never exposes development or unpublished releases.
create or replace view public.student_releases as
select *
from public.curriculum_releases
where status = 'published' and is_development = false;

grant select on public.student_releases to authenticated;

-- 3. Seed checklist rows for a scope so the completeness tracker reflects reality.
create or replace function public.seed_content_checklist(
  p_board_key text,
  p_class_level text,
  p_subject_id text,
  p_chapter_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_chapter text;
  v_item text;
  v_count integer := 0;
begin
  if not public.cms_can_edit() then
    raise exception 'Content permissions required' using errcode = '42501';
  end if;

  foreach v_chapter in array p_chapter_ids loop
    foreach v_item in array array[
      'curriculum','learn_content','formulae','derivations','revision','quick_revision',
      'flashcards','questions','visual_2d','visual_3d','academic_review','published'
    ] loop
      insert into public.content_checklist (board_key, class_level, subject_id, chapter_id, item, state, updated_by)
      values (p_board_key, p_class_level, p_subject_id, v_chapter, v_item, 'missing', auth.uid())
      on conflict (chapter_id, item) do nothing;
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end
$fn$;

revoke all on function public.seed_content_checklist(text, text, text, text[]) from public;
grant execute on function public.seed_content_checklist(text, text, text, text[]) to authenticated;

-- 4. Release gate: a subject is releasable only when every applicable item is published.
create or replace function public.subject_release_ready(
  p_board_key text,
  p_class_level text,
  p_subject_id text
)
returns boolean
language sql
stable
as $fn$
  select coalesce(
    (
      select count(*) filter (where state <> 'not_applicable' and state <> 'published') = 0
             and count(*) filter (where state <> 'not_applicable') > 0
      from public.content_checklist
      where board_key = p_board_key and class_level = p_class_level and subject_id = p_subject_id
    ),
    false
  )
$fn$;

-- 5. Indexes that matter once production data lands.
create index if not exists lessons_chapter_position on public.lessons (chapter_id, position);
create index if not exists chapters_course_position on public.chapters (course_id, position);
create index if not exists lesson_versions_published on public.lesson_versions (lesson_id) where status = 'published';
create index if not exists releases_production on public.curriculum_releases (status) where is_development = false;
