begin;

do $$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.student_subjects') is null
     or to_regclass('public.averiq_onboarding_catalogs') is null
  then
    raise exception 'Apply the Phase 4 profile migration first.';
  end if;

  if to_regclass('public.curriculum_releases') is not null
     or to_regclass('public.subjects') is not null
     or to_regclass('public.lessons') is not null
  then
    raise exception 'Existing curriculum tables detected. Review the schema before applying this migration.';
  end if;
end
$$;

create schema averiq_private;

revoke all on schema averiq_private
from public, anon, authenticated;

create table averiq_private.academic_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.academic_years (
  id uuid primary key,
  code text not null unique,
  label text not null,
  start_year integer not null,
  end_year integer not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_year = start_year + 1),
  check (code = start_year::text || '-' || right(end_year::text, 2))
);

create table public.education_boards (
  id uuid primary key,
  code text not null unique,
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_tracks (
  id uuid primary key,
  board_id uuid null references public.education_boards(id),
  code text not null unique,
  title text not null,
  learning_context text not null
    check (learning_context in ('school', 'competitive')),
  minimum_grade smallint null,
  maximum_grade smallint null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    learning_context = 'competitive'
    or (
      board_id is not null
      and minimum_grade between 6 and 12
      and maximum_grade between minimum_grade and 12
    )
  )
);

create table public.academic_streams (
  id uuid primary key,
  code text not null unique,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subject_combinations (
  id uuid primary key,
  stream_id uuid not null references public.academic_streams(id),
  code text not null unique,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id uuid primary key,
  code text not null unique,
  title text not null,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.curriculum_releases (
  id uuid primary key,
  import_key text not null unique,
  academic_year_id uuid not null references public.academic_years(id),
  track_id uuid not null references public.curriculum_tracks(id),
  grade_level smallint null check (grade_level between 6 and 12),
  revision integer not null check (revision > 0),

  data_kind text not null check (data_kind in ('sample', 'official')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),

  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'deprecated', 'archived')),

  source_name text not null,
  source_url text null check (source_url is null or source_url like 'https://%'),
  source_document text null,
  source_publication_date date null,
  last_verified_at timestamptz null,
  reviewed_by uuid null,
  review_notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (academic_year_id, track_id, grade_level, revision, data_kind),

  check (
    status <> 'published'
    or (
      data_kind = 'official'
      and verification_status = 'verified'
      and source_url is not null
      and last_verified_at is not null
      and reviewed_by is not null
    )
  )
);

create unique index curriculum_one_published_release
on public.curriculum_releases (
  academic_year_id,
  track_id,
  coalesce(grade_level, 0)
)
where status = 'published';

create index curriculum_release_resolution
on public.curriculum_releases (
  academic_year_id, track_id, grade_level, status
);

create table public.curriculum_subjects (
  id uuid primary key,
  release_id uuid not null references public.curriculum_releases(id),
  subject_id uuid not null references public.subjects(id),
  title text not null,
  slug text not null,
  position integer not null check (position >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (release_id, subject_id),
  unique (release_id, slug),
  unique (release_id, position)
);

create table public.curriculum_subject_rules (
  id uuid primary key,
  curriculum_subject_id uuid not null
    references public.curriculum_subjects(id),
  combination_id uuid null references public.subject_combinations(id),
  requirement_role text not null
    check (requirement_role in ('required', 'elective', 'optional', 'additional')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index curriculum_subject_rule_identity
on public.curriculum_subject_rules (
  curriculum_subject_id,
  coalesce(combination_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

create index curriculum_rules_combination
on public.curriculum_subject_rules (combination_id, curriculum_subject_id);

create table public.courses (
  id uuid primary key,
  curriculum_subject_id uuid not null
    references public.curriculum_subjects(id),
  title text not null,
  slug text not null,
  position integer not null check (position >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (id, curriculum_subject_id),
  unique (curriculum_subject_id, slug),
  unique (curriculum_subject_id, position)
);

create table public.chapters (
  id uuid primary key,
  curriculum_subject_id uuid not null
    references public.curriculum_subjects(id),
  course_id uuid null,
  title text not null,
  slug text not null,
  chapter_number text null,
  position integer not null check (position >= 0),
  description text not null default '',
  estimated_minutes integer null check (estimated_minutes > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (course_id, curriculum_subject_id)
    references public.courses(id, curriculum_subject_id),

  unique (curriculum_subject_id, slug),
  unique (curriculum_subject_id, position)
);

create table public.topics (
  id uuid primary key,
  chapter_id uuid not null references public.chapters(id),
  title text not null,
  slug text not null,
  position integer not null check (position >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (chapter_id, slug),
  unique (chapter_id, position)
);

create table public.lessons (
  id uuid primary key,
  topic_id uuid not null references public.topics(id),
  title text not null,
  slug text not null,
  position integer not null check (position >= 0),
  lesson_type text not null default 'concept',
  estimated_minutes integer null check (estimated_minutes > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (topic_id, slug),
  unique (topic_id, position)
);

create table public.lesson_versions (
  id uuid primary key,
  lesson_id uuid not null references public.lessons(id),
  version integer not null check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),

  content_schema_version integer not null check (content_schema_version = 1),
  content jsonb not null,
  content_hash text not null check (char_length(content_hash) = 64),
  author_source text not null,

  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
  accuracy_status text not null default 'unverified'
    check (accuracy_status in ('unverified', 'verified')),
  alignment_status text not null default 'unverified'
    check (alignment_status in ('unverified', 'verified')),
  rights_status text not null default 'pending'
    check (rights_status in ('pending', 'approved', 'rejected')),

  reviewed_by uuid null,
  reviewed_at timestamptz null,
  published_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (lesson_id, version),

  check (
    jsonb_typeof(content) = 'object'
    and content->>'schemaVersion' = '1'
    and jsonb_typeof(content->'blocks') = 'array'
    and octet_length(content::text) <= 2000000
  ),

  check (
    status <> 'published'
    or (
      review_status = 'approved'
      and accuracy_status = 'verified'
      and alignment_status = 'verified'
      and rights_status = 'approved'
      and reviewed_by is not null
      and reviewed_at is not null
      and published_at is not null
    )
  )
);

create unique index one_published_lesson_version
on public.lesson_versions (lesson_id)
where status = 'published';

create table public.content_assets (
  id uuid primary key,
  asset_key text not null unique,
  bucket text not null check (bucket = 'academic-content'),
  object_path text not null unique
    check (object_path !~ '(^/|(^|/)\.\.(/|$))'),
  alt_text text not null,
  credit text not null,
  license_reference text not null,
  rights_status text not null default 'pending'
    check (rights_status in ('pending', 'approved', 'rejected')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_version_assets (
  version_id uuid not null references public.lesson_versions(id),
  asset_id uuid not null references public.content_assets(id),
  primary key (version_id, asset_id)
);

create index lesson_assets_reverse
on public.lesson_version_assets (asset_id, version_id);

create table public.legacy_subject_mappings (
  id uuid primary key,
  catalog_version text not null
    references public.averiq_onboarding_catalogs(version),
  legacy_key text not null,
  subject_id uuid not null references public.subjects(id),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (catalog_version, legacy_key)
);

create table public.legacy_path_mappings (
  id uuid primary key,
  catalog_version text not null
    references public.averiq_onboarding_catalogs(version),
  legacy_key text not null,
  combination_id uuid not null references public.subject_combinations(id),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (catalog_version, legacy_key)
);

create table public.academic_imports (
  import_key text primary key,
  digest text not null,
  release_id uuid not null references public.curriculum_releases(id),
  created_at timestamptz not null default now()
);

create function public.academic_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create function public.academic_freeze_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('published', 'archived')
     and (
       to_jsonb(new) - 'status' - 'updated_at'
       is distinct from
       to_jsonb(old) - 'status' - 'updated_at'
     )
  then
    raise exception 'Published history is immutable. Create a new revision.';
  end if;

  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'Archived history cannot be reactivated in place.';
  end if;

  return new;
end
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'academic_years', 'education_boards', 'curriculum_tracks',
    'academic_streams', 'subject_combinations', 'subjects',
    'curriculum_releases', 'curriculum_subjects',
    'curriculum_subject_rules', 'courses', 'chapters', 'topics',
    'lessons', 'lesson_versions', 'content_assets',
    'legacy_subject_mappings', 'legacy_path_mappings'
  ]
  loop
    execute format(
      'create trigger touch_updated_at before update on public.%I
       for each row execute function public.academic_touch_updated_at()',
      table_name
    );
  end loop;

  foreach table_name in array array[
    'curriculum_releases', 'curriculum_subjects', 'courses',
    'chapters', 'topics', 'lessons', 'lesson_versions', 'content_assets'
  ]
  loop
    execute format(
      'create trigger freeze_published before update on public.%I
       for each row execute function public.academic_freeze_published()',
      table_name
    );
  end loop;
end
$$;

create function public.academic_is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from averiq_private.academic_reviewers
    where user_id = auth.uid()
  );
$$;

create function public.academic_can_read_release(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.curriculum_releases r
    join public.academic_years y on y.id = r.academic_year_id
    join public.curriculum_tracks t on t.id = r.track_id
    join public.education_boards b on b.id = t.board_id
    join public.profiles p on p.id = auth.uid()
    where r.id = p_id
      and r.status = 'published'
      and r.data_kind = 'official'
      and r.verification_status = 'verified'
      and y.status = 'active'
      and t.status = 'active'
      and b.status = 'active'
      and t.learning_context = 'school'
      and p.onboarding_completed
      and y.code = p.academic_year
      and b.code = p.board
      and t.code = p.school_system
      and r.grade_level = p.class_level
  );
$$;

create function public.academic_can_read_subject(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.curriculum_subjects cs
    join public.subjects s on s.id = cs.subject_id
    join public.profiles p on p.id = auth.uid()
    join public.curriculum_subject_rules rule
      on rule.curriculum_subject_id = cs.id
    left join public.legacy_path_mappings pm
      on pm.catalog_version = p.catalog_version
     and pm.legacy_key = p.subject_combination
     and pm.status = 'confirmed'
    left join public.subject_combinations combination
      on combination.id = pm.combination_id
    left join public.academic_streams stream
      on stream.id = combination.stream_id
    where cs.id = p_id
      and cs.status = 'published'
      and s.status = 'active'
      and public.academic_can_read_release(cs.release_id)
      and (
        (p.class_level <= 10 and rule.combination_id is null)
        or (
          p.class_level >= 11
          and pm.combination_id is not null
          and stream.code = p.stream
          and (
            rule.combination_id is null
            or rule.combination_id = pm.combination_id
          )
        )
      )
      and (
        rule.requirement_role = 'required'
        or exists (
          select 1
          from public.student_subjects selected
          join public.legacy_subject_mappings mapping
            on mapping.catalog_version = p.catalog_version
           and mapping.legacy_key = selected.subject_key
           and mapping.status = 'confirmed'
          where selected.user_id = p.id
            and mapping.subject_id = cs.subject_id
        )
      )
  );
$$;

create function public.academic_can_read_course(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.courses
    where id = p_id and status = 'published'
      and public.academic_can_read_subject(curriculum_subject_id)
  );
$$;

create function public.academic_can_read_chapter(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.chapters
    where id = p_id and status = 'published'
      and public.academic_can_read_subject(curriculum_subject_id)
      and (
        course_id is null
        or public.academic_can_read_course(course_id)
      )
  );
$$;

create function public.academic_can_read_topic(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.topics
    where id = p_id and status = 'published'
      and public.academic_can_read_chapter(chapter_id)
  );
$$;

create function public.academic_can_read_lesson(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lessons
    where id = p_id and status = 'published'
      and public.academic_can_read_topic(topic_id)
  );
$$;

create function public.academic_can_read_version(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_versions
    where id = p_id and status = 'published'
      and public.academic_can_read_lesson(lesson_id)
  );
$$;

create function public.academic_can_read_asset(p_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.content_assets asset
    join public.lesson_version_assets link on link.asset_id = asset.id
    where asset.id = p_id
      and asset.status = 'published'
      and asset.rights_status = 'approved'
      and public.academic_can_read_version(link.version_id)
  );
$$;

do $$
declare
  table_name text;
  condition text;
  function_name text;
begin
  foreach table_name in array array[
    'academic_years', 'education_boards', 'curriculum_tracks',
    'academic_streams', 'subject_combinations', 'subjects',
    'curriculum_releases', 'curriculum_subjects',
    'curriculum_subject_rules', 'courses', 'chapters', 'topics',
    'lessons', 'lesson_versions', 'content_assets',
    'lesson_version_assets', 'legacy_subject_mappings',
    'legacy_path_mappings', 'academic_imports'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'revoke all on public.%I from public, anon, authenticated',
      table_name
    );
    execute format('grant select on public.%I to authenticated', table_name);
    execute format('grant all on public.%I to service_role', table_name);

    condition := case table_name
      when 'academic_years' then 'true'
      when 'education_boards' then 'true'
      when 'curriculum_tracks' then 'true'
      when 'academic_streams' then 'true'
      when 'subject_combinations' then 'true'
      when 'subjects' then 'true'
      when 'curriculum_releases' then 'public.academic_can_read_release(id)'
      when 'curriculum_subjects' then 'public.academic_can_read_subject(id)'
      when 'curriculum_subject_rules'
        then 'public.academic_can_read_subject(curriculum_subject_id)'
      when 'courses' then 'public.academic_can_read_course(id)'
      when 'chapters' then 'public.academic_can_read_chapter(id)'
      when 'topics' then 'public.academic_can_read_topic(id)'
      when 'lessons' then 'public.academic_can_read_lesson(id)'
      when 'lesson_versions' then 'public.academic_can_read_version(id)'
      when 'content_assets' then 'public.academic_can_read_asset(id)'
      when 'lesson_version_assets' then 'public.academic_can_read_version(version_id)'
      when 'legacy_subject_mappings' then 'status = ''confirmed'''
      when 'legacy_path_mappings' then 'status = ''confirmed'''
      else 'false'
    end;

    execute format(
      'create policy academic_read on public.%I
       for select to authenticated
       using (public.academic_is_reviewer() or (%s))',
      table_name,
      condition
    );
  end loop;

  foreach function_name in array array[
    'academic_can_read_release', 'academic_can_read_subject',
    'academic_can_read_course', 'academic_can_read_chapter',
    'academic_can_read_topic', 'academic_can_read_lesson',
    'academic_can_read_version', 'academic_can_read_asset'
  ]
  loop
    execute format(
      'revoke all on function public.%I(uuid) from public, anon',
      function_name
    );
    execute format(
      'grant execute on function public.%I(uuid) to authenticated, service_role',
      function_name
    );
  end loop;
end
$$;

revoke all on function public.academic_is_reviewer() from public, anon;
grant execute on function public.academic_is_reviewer()
to authenticated, service_role;

create function public.resolve_my_curriculum()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  p public.profiles%rowtype;
  release_id uuid;
  candidates integer;
  unmapped text[] := '{}';
  unavailable text[] := '{}';
  needs_path boolean := false;
  subject_rows jsonb := '[]';
begin
  select * into p
  from public.profiles
  where id = auth.uid();

  if not found or not p.onboarding_completed then
    return jsonb_build_object(
      'status', 'profile_required',
      'release_id', null,
      'unmapped_subject_keys', '[]'::jsonb,
      'unavailable_subject_keys', '[]'::jsonb,
      'needs_path_mapping', false,
      'subjects', '[]'::jsonb
    );
  end if;

  select count(*), (array_agg(r.id order by r.revision desc))[1]
  into candidates, release_id
  from public.curriculum_releases r
  where public.academic_can_read_release(r.id);

  if candidates = 0 or candidates > 1 then
    return jsonb_build_object(
      'status', case when candidates = 0 then 'unavailable' else 'ambiguous' end,
      'release_id', null,
      'unmapped_subject_keys', '[]'::jsonb,
      'unavailable_subject_keys', '[]'::jsonb,
      'needs_path_mapping', false,
      'subjects', '[]'::jsonb
    );
  end if;

  select coalesce(array_agg(ss.subject_key), '{}'::text[])
  into unmapped
  from public.student_subjects ss
  left join public.legacy_subject_mappings m
    on m.catalog_version = p.catalog_version
   and m.legacy_key = ss.subject_key
   and m.status = 'confirmed'
  where ss.user_id = p.id and m.subject_id is null;

  if p.class_level >= 11 then
    needs_path := not exists (
      select 1
      from public.legacy_path_mappings m
      join public.subject_combinations c on c.id = m.combination_id
      join public.academic_streams s on s.id = c.stream_id
      where m.catalog_version = p.catalog_version
        and m.legacy_key = p.subject_combination
        and m.status = 'confirmed'
        and s.code = p.stream
    );
  end if;

  if cardinality(unmapped) > 0 or needs_path then
    return jsonb_build_object(
      'status', 'mapping_required',
      'release_id', release_id,
      'unmapped_subject_keys', to_jsonb(unmapped),
      'unavailable_subject_keys', '[]'::jsonb,
      'needs_path_mapping', needs_path,
      'subjects', '[]'::jsonb
    );
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(cs) order by cs.position, cs.id),
    '[]'::jsonb
  )
  into subject_rows
  from public.curriculum_subjects cs
  where cs.release_id = release_id
    and public.academic_can_read_subject(cs.id);

  select coalesce(array_agg(ss.subject_key), '{}'::text[])
  into unavailable
  from public.student_subjects ss
  join public.legacy_subject_mappings m
    on m.catalog_version = p.catalog_version
   and m.legacy_key = ss.subject_key
   and m.status = 'confirmed'
  where ss.user_id = p.id
    and not exists (
      select 1 from public.curriculum_subjects cs
      where cs.release_id = release_id
        and cs.subject_id = m.subject_id
        and public.academic_can_read_subject(cs.id)
    );

  return jsonb_build_object(
    'status', case
      when cardinality(unavailable) > 0 then 'partial'
      else 'ready'
    end,
    'release_id', release_id,
    'unmapped_subject_keys', to_jsonb(unmapped),
    'unavailable_subject_keys', to_jsonb(unavailable),
    'needs_path_mapping', false,
    'subjects', subject_rows
  );
end
$$;

revoke all on function public.resolve_my_curriculum() from public, anon;
grant execute on function public.resolve_my_curriculum() to authenticated;

-- Atomic, append-only import of a server-validated normalized bundle.
create function public.import_academic_bundle(
  p_import_key text,
  p_digest text,
  p_bundle jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.academic_imports%rowtype;
  table_name text;
  rows_json jsonb;
  defaults jsonb;
  forced jsonb;
  release_id uuid;
  canonical boolean;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_import_key, 0)
  );

  select * into existing
  from public.academic_imports
  where import_key = p_import_key;

  if found then
    if existing.digest <> p_digest then
      raise exception 'Import key already exists with different content. Use a new key and revision.';
    end if;

    return existing.release_id;
  end if;

  if char_length(p_digest) <> 64
     or jsonb_typeof(p_bundle) <> 'object'
     or jsonb_array_length(p_bundle->'curriculum_releases') <> 1
  then
    raise exception 'Invalid normalized import bundle';
  end if;

  release_id := (p_bundle->'curriculum_releases'->0->>'id')::uuid;

  if p_bundle->'curriculum_releases'->0->>'import_key' <> p_import_key then
    raise exception 'Import key mismatch';
  end if;

  foreach table_name in array array[
    'academic_years', 'education_boards', 'curriculum_tracks',
    'academic_streams', 'subject_combinations', 'subjects',
    'curriculum_releases', 'curriculum_subjects',
    'curriculum_subject_rules', 'courses', 'chapters',
    'topics', 'lessons', 'content_assets', 'lesson_versions',
    'lesson_version_assets', 'legacy_subject_mappings',
    'legacy_path_mappings'
  ]
  loop
    rows_json := coalesce(p_bundle->table_name, '[]'::jsonb);

    if jsonb_typeof(rows_json) <> 'array'
       or jsonb_array_length(rows_json) > 10000
    then
      raise exception 'Invalid row array for %', table_name;
    end if;

    if jsonb_array_length(rows_json) = 0 then
      continue;
    end if;

    canonical := table_name = any(array[
      'academic_years', 'education_boards', 'curriculum_tracks',
      'academic_streams', 'subject_combinations', 'subjects',
      'legacy_subject_mappings', 'legacy_path_mappings',
      'content_assets'
    ]);

    defaults := jsonb_build_object(
      'created_at', now(),
      'updated_at', now(),
      'status', 'draft',
      'description', '',
      'review_status', 'pending',
      'accuracy_status', 'unverified',
      'alignment_status', 'unverified',
      'rights_status', 'pending',
      'verification_status', 'unverified'
    );

    forced := jsonb_build_object(
      'reviewed_by', null,
      'reviewed_at', null,
      'published_at', null,
      'last_verified_at', null,
      'verification_status', 'unverified',
      'review_status', 'pending',
      'accuracy_status', 'unverified',
      'alignment_status', 'unverified',
      'rights_status', 'pending'
    );

    if table_name = any(array[
      'academic_years', 'education_boards', 'curriculum_tracks', 'subjects'
    ]) then
      forced := forced || '{"status":"active"}'::jsonb;
    elsif table_name = any(array[
      'legacy_subject_mappings', 'legacy_path_mappings'
    ]) then
      forced := forced || '{"status":"pending"}'::jsonb;
    else
      forced := forced || '{"status":"draft"}'::jsonb;
    end if;

    select jsonb_agg(defaults || value || forced)
    into rows_json
    from jsonb_array_elements(rows_json) as item(value);

    execute format(
      'insert into public.%I
       select * from jsonb_populate_recordset(null::public.%I, $1)
       %s',
      table_name,
      table_name,
      case
        when canonical or table_name = 'lesson_version_assets'
          then 'on conflict do nothing'
        else ''
      end
    ) using rows_json;
  end loop;

  insert into public.academic_imports(import_key, digest, release_id)
  values (p_import_key, p_digest, release_id);

  return release_id;
end
$$;

revoke all on function public.import_academic_bundle(text, text, jsonb)
from public, anon, authenticated;

grant execute on function public.import_academic_bundle(text, text, jsonb)
to service_role;

-- Publishing is separate from importing and cannot publish sample curricula.
create function public.publish_academic_release(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.curriculum_releases%rowtype;
begin
  select * into r
  from public.curriculum_releases
  where id = p_id
  for update;

  if not found
     or r.status <> 'review'
     or r.data_kind <> 'official'
     or r.verification_status <> 'verified'
     or r.source_url is null
     or r.last_verified_at is null
     or r.reviewed_by is null
     or not exists (
       select 1 from averiq_private.academic_reviewers
       where user_id = r.reviewed_by
     )
  then
    raise exception 'Official source verification and authorized human review are required.';
  end if;

  update public.curriculum_releases
  set status = 'archived'
  where academic_year_id = r.academic_year_id
    and track_id = r.track_id
    and grade_level is not distinct from r.grade_level
    and status = 'published';

  update public.curriculum_releases
  set status = 'published'
  where id = p_id;
end
$$;

create function public.publish_lesson_version(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.lesson_versions%rowtype;
begin
  select * into v
  from public.lesson_versions
  where id = p_id
  for update;

  if not found
     or v.status <> 'review'
     or v.review_status <> 'approved'
     or v.accuracy_status <> 'verified'
     or v.alignment_status <> 'verified'
     or v.rights_status <> 'approved'
     or v.reviewed_at is null
     or not exists (
       select 1 from averiq_private.academic_reviewers
       where user_id = v.reviewed_by
     )
  then
    raise exception 'Academic, alignment and rights review must be completed first.';
  end if;

  if exists (
    select 1
    from public.lesson_version_assets link
    join public.content_assets asset on asset.id = link.asset_id
    where link.version_id = p_id
      and (
        asset.status <> 'published'
        or asset.rights_status <> 'approved'
      )
  ) then
    raise exception 'All referenced assets must be approved and published.';
  end if;

  update public.lesson_versions
  set status = 'archived'
  where lesson_id = v.lesson_id and status = 'published';

  update public.lesson_versions
  set status = 'published', published_at = now()
  where id = p_id;
end
$$;

revoke all on function public.publish_academic_release(uuid)
from public, anon, authenticated;

revoke all on function public.publish_lesson_version(uuid)
from public, anon, authenticated;

grant execute on function public.publish_academic_release(uuid) to service_role;
grant execute on function public.publish_lesson_version(uuid) to service_role;

-- Private asset storage. No browser upload/update/delete policy is granted.
insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'academic-content',
  'academic-content',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
);

create policy academic_asset_download
on storage.objects
for select to authenticated
using (
  bucket_id = 'academic-content'
  and exists (
    select 1 from public.content_assets asset
    where asset.bucket = bucket_id
      and asset.object_path = name
      and (
        public.academic_is_reviewer()
        or public.academic_can_read_asset(asset.id)
      )
  )
);

commit;
