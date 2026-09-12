-- Phase 20: roles, review workflow, audit log, imports, completeness tracking.

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  primary key (user_id, role),
  constraint user_role_allowed check (role in ('student','content_editor','reviewer','admin'))
);

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = p_role
  )
$fn$;

create or replace function public.cms_can_edit() returns boolean
language sql stable as $fn$
  select public.has_role('content_editor') or public.has_role('admin')
$fn$;

create or replace function public.cms_can_review() returns boolean
language sql stable as $fn$
  select public.has_role('reviewer') or public.has_role('admin')
$fn$;

create table if not exists public.content_audit_log (
  id bigserial primary key,
  actor uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  created_at timestamptz not null default now(),
  constraint audit_action_length check (char_length(action) between 1 and 60),
  constraint audit_summary_length check (summary is null or char_length(summary) <= 500)
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  block_id text,
  body text not null,
  status text not null default 'open',
  author uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint review_entity check (entity_type in ('lesson','block','formula','derivation','question','chapter')),
  constraint review_status check (status in ('open','resolved')),
  constraint review_body_length check (char_length(body) between 1 and 4000)
);

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  source_label text,
  digest text,
  status text not null default 'validated',
  stats jsonb not null default '{}'::jsonb,
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint import_kind check (kind in ('curriculum','chapters','formulas','questions','revision')),
  constraint import_status check (status in ('validated','committed','failed')),
  constraint import_stats_object check (jsonb_typeof(stats) = 'object'),
  unique (kind, digest)
);

-- Completeness tracker: one row per required deliverable per chapter.
create table if not exists public.content_checklist (
  id uuid primary key default gen_random_uuid(),
  board_key text not null,
  class_level text not null,
  subject_id text not null,
  chapter_id text not null,
  item text not null,
  state text not null default 'missing',
  note text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  unique (chapter_id, item),
  constraint checklist_item check (item in (
    'curriculum','learn_content','formulae','derivations','revision','quick_revision',
    'flashcards','questions','visual_2d','visual_3d','academic_review','published'
  )),
  constraint checklist_state check (state in ('missing','draft','ready','published','not_applicable'))
);

create index if not exists content_checklist_scope on public.content_checklist (board_key, class_level, subject_id);
create index if not exists audit_log_recent on public.content_audit_log (created_at desc);
create index if not exists review_comments_entity on public.review_comments (entity_type, entity_id);

-- Release matrix: completion computed from applicable items only.
create or replace view public.release_matrix as
select
  board_key,
  class_level,
  subject_id,
  count(distinct chapter_id) as chapters,
  count(*) filter (where state <> 'not_applicable') as required_items,
  count(*) filter (where state = 'published') as published_items,
  count(*) filter (where state in ('missing','draft')) as outstanding_items,
  case
    when count(*) filter (where state <> 'not_applicable') = 0 then 0
    else round(
      100.0 * count(*) filter (where state = 'published')
      / count(*) filter (where state <> 'not_applicable')
    )
  end as percent_complete
from public.content_checklist
group by board_key, class_level, subject_id;

do $rls$
declare
  t text;
begin
  foreach t in array array['user_roles','content_audit_log','review_comments','import_jobs','content_checklist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end
$rls$;

-- Students may read only their own role rows; only admins write roles.
drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles
  for select to authenticated using (auth.uid() = user_id or public.has_role('admin'));
drop policy if exists user_roles_admin on public.user_roles;
create policy user_roles_admin on public.user_roles
  for all to authenticated using (public.has_role('admin')) with check (public.has_role('admin'));

drop policy if exists audit_read on public.content_audit_log;
create policy audit_read on public.content_audit_log
  for select to authenticated using (public.cms_can_review() or public.cms_can_edit());
drop policy if exists audit_write on public.content_audit_log;
create policy audit_write on public.content_audit_log
  for insert to authenticated with check (public.cms_can_edit() and auth.uid() = actor);
grant insert on public.content_audit_log to authenticated;
grant usage, select on sequence public.content_audit_log_id_seq to authenticated;

drop policy if exists review_comments_read on public.review_comments;
create policy review_comments_read on public.review_comments
  for select to authenticated using (public.cms_can_edit() or public.cms_can_review());
drop policy if exists review_comments_write on public.review_comments;
create policy review_comments_write on public.review_comments
  for all to authenticated
  using (public.cms_can_review() or auth.uid() = author)
  with check ((public.cms_can_review() or public.cms_can_edit()) and auth.uid() = author);
grant insert, update, delete on public.review_comments to authenticated;

drop policy if exists import_jobs_rw on public.import_jobs;
create policy import_jobs_rw on public.import_jobs
  for all to authenticated using (public.cms_can_edit()) with check (public.cms_can_edit());
grant insert, update on public.import_jobs to authenticated;

drop policy if exists checklist_read on public.content_checklist;
create policy checklist_read on public.content_checklist
  for select to authenticated using (public.cms_can_edit() or public.cms_can_review());
drop policy if exists checklist_write on public.content_checklist;
create policy checklist_write on public.content_checklist
  for all to authenticated using (public.cms_can_edit()) with check (public.cms_can_edit());
grant insert, update, delete on public.content_checklist to authenticated;

-- Editors get write access to curriculum/content tables that exist.
-- Students keep read-only access through the existing academic_* policies.
do $edit$
declare
  t text;
begin
  foreach t in array array[
    'academic_years','education_boards','curriculum_tracks','academic_streams',
    'subject_combinations','subjects','curriculum_releases','curriculum_subjects',
    'curriculum_subject_rules','courses','chapters','topics','lessons','lesson_versions',
    'content_assets','lesson_version_assets',
    'competitive_exams','exam_cycles','exam_subjects','exam_units','exam_topics',
    'exam_concept_links','exam_question_tags','mock_definitions','mock_sections',
    'anatomy_systems','anatomy_organs','anatomy_structures','anatomy_processes',
    'anatomy_curriculum_links','anatomy_assets','search_documents'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format(
        'drop policy if exists cms_write_%1$s on public.%1$I', t);
      execute format(
        'create policy cms_write_%1$s on public.%1$I for all to authenticated
         using (public.cms_can_edit()) with check (public.cms_can_edit())', t);
    end if;
  end loop;
end
$edit$;
