-- Averiq Phase 14: canonical anatomy data. Read-only for students.
set local search_path = public;

do $guard$
begin
  if to_regclass('public.lessons') is null then
    raise exception 'curriculum tables required (migration 202609080002)';
  end if;
  if to_regclass('public.anatomy_systems') is not null then
    raise exception 'anatomy_systems already exists; review before re-running';
  end if;
end
$guard$;

create or replace function public.anatomy_touch_updated_at()
returns trigger language plpgsql as $fn$
begin new.updated_at := now(); return new; end
$fn$;

create table public.anatomy_systems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null default '',
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.anatomy_organs (
  id uuid primary key default gen_random_uuid(),
  system_id uuid not null references public.anatomy_systems(id) on delete cascade,
  slug text not null,
  name text not null,
  summary text not null default '',
  visualization_id text,
  fallback_visualization_id text,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (system_id, slug)
);

create table public.anatomy_structures (
  id uuid primary key default gen_random_uuid(),
  organ_id uuid not null references public.anatomy_organs(id) on delete cascade,
  slug text not null,
  name text not null,
  object_key text,                      -- stable key inside the 3D/2D scene
  location text not null default '',
  structure text not null default '',
  function text not null default '',
  flow_role text not null default '',
  layer text not null default 'organs',
  essential boolean not null default true,
  position integer not null default 0,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organ_id, slug)
);

create table public.anatomy_processes (
  id uuid primary key default gen_random_uuid(),
  organ_id uuid references public.anatomy_organs(id) on delete cascade,
  system_id uuid references public.anatomy_systems(id) on delete cascade,
  slug text not null,
  name text not null,
  summary text not null default '',
  step_duration_ms integer not null default 2600 check (step_duration_ms between 400 and 20000),
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','review','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anatomy_process_parent check (organ_id is not null or system_id is not null),
  constraint anatomy_process_steps_array check (jsonb_typeof(steps) = 'array')
);
create unique index anatomy_process_slug on public.anatomy_processes (slug);

create table public.anatomy_curriculum_links (
  id uuid primary key default gen_random_uuid(),
  system_id uuid references public.anatomy_systems(id) on delete cascade,
  organ_id uuid references public.anatomy_organs(id) on delete cascade,
  structure_id uuid references public.anatomy_structures(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  topic_id uuid references public.topics(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  exam_key text,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anatomy_link_anchor check (system_id is not null or organ_id is not null or structure_id is not null)
);

create table public.anatomy_assets (
  id uuid primary key default gen_random_uuid(),
  organ_id uuid references public.anatomy_organs(id) on delete cascade,
  kind text not null check (kind in ('model','diagram','texture')),
  path text not null,                    -- same-origin curated path, e.g. /models/heart.glb
  source text not null,
  license text not null,
  credit text not null,
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','reviewed','rejected')),
  accuracy_status text not null default 'unverified' check (accuracy_status in ('unverified','educationally-accurate','needs-work')),
  bytes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anatomy_asset_local_path check (path ~ '^/[A-Za-z0-9._/-]+$')
);

create index anatomy_organs_system on public.anatomy_organs (system_id, position);
create index anatomy_structures_organ on public.anatomy_structures (organ_id, position);
create index anatomy_links_lesson on public.anatomy_curriculum_links (lesson_id);
create index anatomy_links_organ on public.anatomy_curriculum_links (organ_id);

do $trg$
declare t text;
begin
  foreach t in array array['anatomy_systems','anatomy_organs','anatomy_structures',
                           'anatomy_processes','anatomy_curriculum_links','anatomy_assets']
  loop
    execute format(
      'create trigger touch_%1$s before update on public.%1$I for each row execute function public.anatomy_touch_updated_at()',
      t);
    execute format('alter table public.%1$I enable row level security', t);
    execute format('alter table public.%1$I force row level security', t);
    execute format('revoke all on public.%1$I from anon, authenticated', t);
    execute format('grant select on public.%1$I to authenticated', t);
    execute format('grant all on public.%1$I to service_role', t);
  end loop;
end
$trg$;

create policy anatomy_read_systems on public.anatomy_systems
  for select to authenticated using (status = 'published' or public.academic_is_reviewer());

create policy anatomy_read_organs on public.anatomy_organs
  for select to authenticated using (
    (status = 'published' and exists (select 1 from public.anatomy_systems s where s.id = system_id and s.status = 'published'))
    or public.academic_is_reviewer());

create policy anatomy_read_structures on public.anatomy_structures
  for select to authenticated using (
    (status = 'published' and exists (select 1 from public.anatomy_organs o where o.id = organ_id and o.status = 'published'))
    or public.academic_is_reviewer());

create policy anatomy_read_processes on public.anatomy_processes
  for select to authenticated using (status = 'published' or public.academic_is_reviewer());

create policy anatomy_read_links on public.anatomy_curriculum_links
  for select to authenticated using (true);

create policy anatomy_read_assets on public.anatomy_assets
  for select to authenticated using (
    review_status = 'reviewed' or public.academic_is_reviewer());
