-- Averiq Phase 12: competitive preparation layer (JEE / NEET / NDA)
begin;

do $guard$
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.student_subjects') is null
     or to_regclass('public.student_competitive_goals') is null
     or to_regclass('public.subjects') is null
     or to_regclass('public.chapters') is null
     or to_regclass('public.topics') is null
     or to_regclass('public.lessons') is null then
    raise exception 'Phase 12 requires the Phase 4/5 academic schema.';
  end if;

  if to_regclass('public.competitive_exams') is not null then
    raise exception 'public.competitive_exams already exists. Review before re-running.';
  end if;

  if to_regprocedure('public.academic_touch_updated_at()') is null
     or to_regprocedure('public.academic_freeze_published()') is null
     or to_regprocedure('public.academic_is_reviewer()') is null then
    raise exception 'Phase 12 requires academic_touch_updated_at(), academic_freeze_published() and academic_is_reviewer() from migration 002.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name in ('class_level', 'stream', 'onboarding_completed')
    group by table_name having count(distinct column_name) = 3
  ) then
    raise exception 'Expected profiles.class_level, profiles.stream and profiles.onboarding_completed.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_subjects' and column_name = 'subject_key'
  ) then
    raise exception 'Expected student_subjects.subject_key.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'student_competitive_goals' and column_name = 'goal_key'
  ) then
    raise exception 'Expected student_competitive_goals.goal_key.';
  end if;
end
$guard$;

-- ---------------------------------------------------------------- exams
create table public.competitive_exams (
  id uuid primary key,
  key text not null unique check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 160),
  short_name text not null check (char_length(short_name) between 2 and 24),
  authority text,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exam_eligibility_rules (
  id uuid primary key,
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  goal_key text not null check (char_length(goal_key) between 2 and 60),
  minimum_grade integer not null check (minimum_grade between 6 and 12),
  maximum_grade integer not null check (maximum_grade between 6 and 12),
  allowed_streams text[] not null default '{}',
  required_subject_keys text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, goal_key),
  constraint exam_rule_grade_order check (maximum_grade >= minimum_grade)
);

create table public.exam_cycles (
  id uuid primary key,
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  cycle_code text not null check (cycle_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label text not null,
  data_kind text not null default 'sample' check (data_kind in ('sample', 'official')),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  verification text not null default 'unverified'
    check (verification in ('unverified', 'verified', 'deprecated', 'archived')),
  source_name text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  source_document text,
  source_publication_date date,
  last_verified_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, cycle_code),
  constraint exam_cycle_publication_requirements check (
    status <> 'published' or (
      data_kind = 'official'
      and verification = 'verified'
      and source_url is not null
      and last_verified_at is not null
      and reviewed_by is not null
    )
  )
);

create unique index exam_one_published_cycle
  on public.exam_cycles (exam_id) where status = 'published';

-- ------------------------------------------------- competitive curriculum
create table public.exam_subjects (
  id uuid primary key,
  cycle_id uuid not null references public.exam_cycles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null check (position > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, subject_id),
  unique (cycle_id, slug),
  unique (cycle_id, position),
  unique (id, cycle_id)
);

create table public.exam_units (
  id uuid primary key,
  exam_subject_id uuid not null references public.exam_subjects(id) on delete cascade,
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null check (position > 0),
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_subject_id, slug),
  unique (exam_subject_id, position),
  unique (id, exam_subject_id)
);

create table public.exam_topics (
  id uuid primary key,
  unit_id uuid not null references public.exam_units(id) on delete cascade,
  title text not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null check (position > 0),
  depth_note text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, slug),
  unique (unit_id, position)
);

-- Maps a competitive topic onto canonical academic content. No theory is copied.
create table public.exam_concept_links (
  id uuid primary key,
  exam_topic_id uuid not null references public.exam_topics(id) on delete cascade,
  depth_layer text not null check (depth_layer in ('core', 'board', 'competitive', 'advanced')),
  link_kind text not null
    check (link_kind in ('chapter', 'topic', 'lesson', 'formula', 'visualization')),
  chapter_id uuid references public.chapters(id) on delete cascade,
  content_topic_id uuid references public.topics(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  formula_key text,
  visualization_id text,
  note text not null default '',
  position integer not null check (position > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_topic_id, position),
  constraint exam_concept_link_single_target check (
    (link_kind = 'chapter' and chapter_id is not null and content_topic_id is null
      and lesson_id is null and formula_key is null and visualization_id is null)
    or (link_kind = 'topic' and content_topic_id is not null and chapter_id is null
      and lesson_id is null and formula_key is null and visualization_id is null)
    or (link_kind = 'lesson' and lesson_id is not null and chapter_id is null
      and content_topic_id is null and formula_key is null and visualization_id is null)
    or (link_kind = 'formula' and formula_key is not null and chapter_id is null
      and content_topic_id is null and lesson_id is null and visualization_id is null)
    or (link_kind = 'visualization' and visualization_id is not null and chapter_id is null
      and content_topic_id is null and lesson_id is null and formula_key is null)
  )
);

create index exam_concept_links_topic on public.exam_concept_links (exam_topic_id, position);

-- --------------------------------------------------- exam question tagging
-- question_id references the Phase 11 question bank. The foreign key is added
-- conditionally so this migration works whether or not that table exists yet.
create table public.exam_question_tags (
  id uuid primary key,
  question_id uuid not null,
  exam_id uuid not null references public.competitive_exams(id) on delete cascade,
  exam_topic_id uuid references public.exam_topics(id) on delete set null,
  competitive_level text not null default 'standard'
    check (competitive_level in ('foundation', 'standard', 'advanced')),
  source_type text not null default 'original'
    check (source_type in ('original', 'sample', 'board-style', 'pyq')),
  source_year integer check (source_year is null or source_year between 1950 and 2100),
  paper_session text,
  source_reference text,
  source_url text check (source_url is null or source_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, exam_id),
  -- A row may only claim PYQ status with a real year and source reference.
  constraint exam_question_pyq_requirements check (
    source_type <> 'pyq' or (source_year is not null and source_reference is not null)
  )
);

create index exam_question_tags_lookup
  on public.exam_question_tags (exam_id, exam_topic_id, competitive_level, status);
create index exam_question_tags_pyq
  on public.exam_question_tags (exam_id, source_year) where source_type = 'pyq';

do $fk$
begin
  if to_regclass('public.questions') is not null then
    alter table public.exam_question_tags
      add constraint exam_question_tags_question_fk
      foreign key (question_id) references public.questions(id) on delete cascade;
  else
    raise notice 'public.questions not found. exam_question_tags.question_id has no foreign key yet; run the follow-up statement documented with this migration.';
  end if;
end
$fk$;

-- ------------------------------------------------------------ mock exams
create table public.mock_definitions (
  id uuid primary key,
  cycle_id uuid not null references public.exam_cycles(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  data_kind text not null default 'sample' check (data_kind in ('sample', 'official-style')),
  navigation jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, key)
);

create table public.mock_sections (
  id uuid primary key,
  mock_id uuid not null references public.mock_definitions(id) on delete cascade,
  exam_subject_id uuid references public.exam_subjects(id) on delete cascade,
  title text not null,
  position integer not null check (position > 0),
  question_count integer not null check (question_count between 1 and 200),
  question_types text[] not null default '{}',
  difficulty_levels text[] not null default '{}',
  competitive_levels text[] not null default '{}',
  correct_marks numeric(6, 2) not null default 4,
  incorrect_marks numeric(6, 2) not null default -1,
  unattempted_marks numeric(6, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mock_id, position)
);

-- ------------------------------------------------------------- triggers
do $trg$
declare
  v_table text;
begin
  foreach v_table in array array[
    'competitive_exams', 'exam_eligibility_rules', 'exam_cycles', 'exam_subjects',
    'exam_units', 'exam_topics', 'exam_concept_links', 'exam_question_tags',
    'mock_definitions', 'mock_sections'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.academic_touch_updated_at()',
      'touch_' || v_table, v_table
    );
  end loop;

  foreach v_table in array array[
    'exam_cycles', 'exam_subjects', 'exam_units', 'exam_topics',
    'exam_concept_links', 'exam_question_tags', 'mock_definitions'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.academic_freeze_published()',
      'freeze_' || v_table, v_table
    );
  end loop;
end
$trg$;

-- --------------------------------------------------- eligibility helpers
-- The owner column on the Phase 4 relationship tables is detected rather than
-- assumed, so this works with id / user_id / profile_id / student_id.
do $elig$
declare
  v_goal_owner text;
  v_subject_owner text;
begin
  select c.column_name into v_goal_owner
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'student_competitive_goals'
    and c.column_name in ('id', 'user_id', 'profile_id', 'student_id')
  order by array_position(array['id', 'user_id', 'profile_id', 'student_id'], c.column_name)
  limit 1;

  select c.column_name into v_subject_owner
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'student_subjects'
    and c.column_name in ('id', 'user_id', 'profile_id', 'student_id')
  order by array_position(array['id', 'user_id', 'profile_id', 'student_id'], c.column_name)
  limit 1;

  if v_goal_owner is null or v_subject_owner is null then
    raise exception 'Could not detect the owner column on student_competitive_goals / student_subjects.';
  end if;

  execute format($fmt$
    create or replace function public.exam_is_available_to_me(p_exam_id uuid)
    returns boolean
    language sql
    stable
    security definer
    set search_path = ''
    as $fn$
      select public.academic_is_reviewer()
        or exists (
          select 1
          from public.profiles p
          join public.student_competitive_goals g on g.%1$I = p.id
          join public.exam_eligibility_rules r
            on r.exam_id = p_exam_id
           and r.goal_key = g.goal_key
           and r.status = 'active'
          where p.id = auth.uid()
            and p.onboarding_completed
            and p.class_level between r.minimum_grade and r.maximum_grade
            and (
              cardinality(r.allowed_streams) = 0
              or p.stream = any (r.allowed_streams)
            )
            and not exists (
              select 1
              from unnest(r.required_subject_keys) as needed(subject_key)
              where not exists (
                select 1
                from public.student_subjects s
                where s.%2$I = p.id
                  and s.subject_key = needed.subject_key
              )
            )
        );
    $fn$;
  $fmt$, v_goal_owner, v_subject_owner);
end
$elig$;

create or replace function public.exam_can_read_cycle(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.exam_cycles c
    join public.competitive_exams e on e.id = c.exam_id
    where c.id = p_id
      and e.status = 'active'
      and (
        public.academic_is_reviewer()
        or (
          c.status = 'published'
          and c.verification = 'verified'
          and public.exam_is_available_to_me(e.id)
        )
      )
  );
$$;

create or replace function public.exam_can_read_subject(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exam_subjects s
    where s.id = p_id
      and (public.academic_is_reviewer() or s.status = 'published')
      and public.exam_can_read_cycle(s.cycle_id)
  );
$$;

create or replace function public.exam_can_read_unit(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exam_units u
    where u.id = p_id
      and (public.academic_is_reviewer() or u.status = 'published')
      and public.exam_can_read_subject(u.exam_subject_id)
  );
$$;

create or replace function public.exam_can_read_topic(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.exam_topics t
    where t.id = p_id
      and (public.academic_is_reviewer() or t.status = 'published')
      and public.exam_can_read_unit(t.unit_id)
  );
$$;

create or replace function public.resolve_my_exams()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(entry order by entry ->> 'key'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'examId', e.id,
      'key', e.key,
      'name', e.name,
      'shortName', e.short_name,
      'authority', e.authority,
      'cycleId', c.id,
      'cycleCode', c.cycle_code,
      'cycleLabel', c.label,
      'dataKind', c.data_kind,
      'sourceName', c.source_name,
      'sourceUrl', c.source_url,
      'lastVerifiedAt', c.last_verified_at,
      'reviewerPreview', c.status <> 'published'
    ) as entry
    from public.competitive_exams e
    join public.exam_cycles c on c.exam_id = e.id
    where e.status = 'active'
      and public.exam_is_available_to_me(e.id)
      and (
        c.status = 'published'
        or (public.academic_is_reviewer() and c.status in ('draft', 'review'))
      )
  ) rows;
$$;

-- --------------------------------------------------------------- RLS
do $rls$
declare
  v_table text;
begin
  foreach v_table in array array[
    'competitive_exams', 'exam_eligibility_rules', 'exam_cycles', 'exam_subjects',
    'exam_units', 'exam_topics', 'exam_concept_links', 'exam_question_tags',
    'mock_definitions', 'mock_sections'
  ]
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public', v_table);
    execute format('revoke all on table public.%I from anon', v_table);
    execute format('revoke all on table public.%I from authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant all on table public.%I to service_role', v_table);
  end loop;
end
$rls$;

create policy exam_read on public.competitive_exams for select to authenticated
  using (status = 'active' and public.exam_is_available_to_me(id));

create policy exam_read on public.exam_eligibility_rules for select to authenticated
  using (status = 'active');

create policy exam_read on public.exam_cycles for select to authenticated
  using (public.exam_can_read_cycle(id));

create policy exam_read on public.exam_subjects for select to authenticated
  using (public.exam_can_read_subject(id));

create policy exam_read on public.exam_units for select to authenticated
  using (public.exam_can_read_unit(id));

create policy exam_read on public.exam_topics for select to authenticated
  using (public.exam_can_read_topic(id));

create policy exam_read on public.exam_concept_links for select to authenticated
  using (
    (public.academic_is_reviewer() or status = 'published')
    and public.exam_can_read_topic(exam_topic_id)
  );

create policy exam_read on public.exam_question_tags for select to authenticated
  using (
    public.academic_is_reviewer()
    or (
      status = 'published'
      and exam_topic_id is not null
      and public.exam_can_read_topic(exam_topic_id)
    )
  );

create policy exam_read on public.mock_definitions for select to authenticated
  using (
    (public.academic_is_reviewer() or status = 'published')
    and public.exam_can_read_cycle(cycle_id)
  );

create policy exam_read on public.mock_sections for select to authenticated
  using (
    exists (
      select 1 from public.mock_definitions m
      where m.id = mock_id
        and (public.academic_is_reviewer() or m.status = 'published')
        and public.exam_can_read_cycle(m.cycle_id)
    )
  );

-- ------------------------------------------------------- publication RPC
create or replace function public.publish_exam_cycle(p_cycle_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_cycle public.exam_cycles;
begin
  select * into v_cycle from public.exam_cycles where id = p_cycle_id for update;

  if v_cycle.id is null then
    raise exception 'Exam cycle not found.';
  end if;

  if v_cycle.status <> 'review' then
    raise exception 'Only a cycle in review can be published.';
  end if;

  if v_cycle.data_kind <> 'official'
     or v_cycle.verification <> 'verified'
     or v_cycle.source_url is null
     or v_cycle.last_verified_at is null
     or v_cycle.reviewed_by is null then
    raise exception 'Publication requires official verified source metadata and a reviewer.';
  end if;

  if not exists (
    select 1 from averiq_private.academic_reviewers ar where ar.user_id = v_cycle.reviewed_by
  ) then
    raise exception 'reviewed_by must be a registered academic reviewer.';
  end if;

  update public.exam_cycles
     set status = 'archived', updated_at = now()
   where exam_id = v_cycle.exam_id and status = 'published' and id <> v_cycle.id;

  update public.exam_cycles
     set status = 'published', updated_at = now()
   where id = v_cycle.id;

  return v_cycle.id;
end
$$;

revoke all on function public.publish_exam_cycle(uuid) from public, anon, authenticated;
grant execute on function public.publish_exam_cycle(uuid) to service_role;

revoke all on function public.exam_is_available_to_me(uuid) from public, anon;
revoke all on function public.resolve_my_exams() from public, anon;
grant execute on function public.exam_is_available_to_me(uuid) to authenticated;
grant execute on function public.exam_can_read_cycle(uuid) to authenticated;
grant execute on function public.exam_can_read_subject(uuid) to authenticated;
grant execute on function public.exam_can_read_unit(uuid) to authenticated;
grant execute on function public.exam_can_read_topic(uuid) to authenticated;
grant execute on function public.resolve_my_exams() to authenticated;

commit;
