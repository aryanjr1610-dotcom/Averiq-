begin;

do $$
begin
  if to_regclass('public.profiles') is not null
     or to_regclass('public.user_profiles') is not null
     or to_regclass('public.student_profiles') is not null
     or to_regclass('public.student_subjects') is not null
     or to_regclass('public.student_competitive_goals') is not null
     or to_regclass('public.averiq_onboarding_catalogs') is not null
  then
    raise exception
      'Existing profile/catalog schema detected. Review and adapt this migration; do not overwrite existing tables.';
  end if;
end
$$;

create table public.averiq_onboarding_catalogs (
  version text primary key,
  academic_year text not null,
  active boolean not null default false,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now()
);

create unique index averiq_one_active_onboarding_catalog
  on public.averiq_onboarding_catalogs (active)
  where active;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  avatar_url text null check (
    avatar_url is null
    or (
      avatar_url like 'https://%'
      and char_length(avatar_url) <= 2048
    )
  ),

  catalog_version text not null
    references public.averiq_onboarding_catalogs(version),

  academic_year text not null,
  class_level smallint not null check (class_level between 6 and 12),
  board text not null check (board in ('cbse', 'cisce')),
  school_system text not null,

  stream text null check (
    stream is null or stream in ('science', 'commerce', 'humanities')
  ),

  subject_combination text null,
  study_goals text[] not null,
  learning_preference text not null,

  daily_study_target integer null check (
    daily_study_target is null
    or daily_study_target between 5 and 240
  ),

  onboarding_completed boolean not null default false,
  onboarding_completed_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (class_level <= 10 and stream is null and subject_combination is null)
    or
    (class_level >= 11 and stream is not null and subject_combination is not null)
  ),

  check (
    school_system = case
      when board = 'cbse' and class_level >= 11 then 'cbse-senior-secondary'
      when board = 'cbse' then 'cbse-school'
      when board = 'cisce' and class_level >= 11 then 'isc'
      when board = 'cisce' and class_level >= 9 then 'icse'
      else 'cisce-school'
    end
  ),

  check (
    not onboarding_completed
    or onboarding_completed_at is not null
  )
);

create table public.student_subjects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_key text not null,
  primary key (user_id, subject_key)
);

create table public.student_competitive_goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal_key text not null,
  target_year integer null check (
    target_year is null or target_year between 2026 and 2100
  ),
  primary key (user_id, goal_key)
);

alter table public.averiq_onboarding_catalogs enable row level security;
alter table public.profiles enable row level security;
alter table public.student_subjects enable row level security;
alter table public.student_competitive_goals enable row level security;

revoke all on public.averiq_onboarding_catalogs from public, anon, authenticated;
revoke all on public.profiles from public, anon, authenticated;
revoke all on public.student_subjects from public, anon, authenticated;
revoke all on public.student_competitive_goals from public, anon, authenticated;

grant select on public.averiq_onboarding_catalogs to authenticated;
grant select on public.profiles to authenticated;
grant select on public.student_subjects to authenticated;
grant select on public.student_competitive_goals to authenticated;

create policy "Authenticated users can read active setup catalog"
on public.averiq_onboarding_catalogs
for select to authenticated
using (active = true);

create policy "Students read their own profile"
on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

create policy "Students read their own subjects"
on public.student_subjects
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Students read their own competitive goals"
on public.student_competitive_goals
for select to authenticated
using ((select auth.uid()) = user_id);

insert into public.averiq_onboarding_catalogs (
  version,
  academic_year,
  active,
  config
)
values (
  'starter-2026-27-v1',
  '2026-27',
  true,
  $catalog$
  {
    "grades": [6, 7, 8, 9, 10, 11, 12],
    "competitiveGrades": [11],

    "boards": [
      {
        "id": "cbse",
        "label": "CBSE",
        "description": "Central Board of Secondary Education"
      },
      {
        "id": "cisce",
        "label": "CISCE",
        "description": "ICSE / ISC as appropriate to your level"
      }
    ],

    "subjects": [
      {"id": "english", "label": "English"},
      {"id": "mathematics", "label": "Mathematics"},
      {"id": "science", "label": "Science"},
      {"id": "social-studies", "label": "Social Studies"},
      {"id": "hindi", "label": "Hindi"},
      {"id": "physics", "label": "Physics"},
      {"id": "chemistry", "label": "Chemistry"},
      {"id": "biology", "label": "Biology"},
      {"id": "history", "label": "History"},
      {"id": "geography", "label": "Geography"},
      {"id": "computer-science", "label": "Computer Science"},
      {"id": "physical-education", "label": "Physical Education"},
      {"id": "accountancy", "label": "Business Studies"},
      {"id": "business-studies", "label": "Business Studies"},
      {"id": "economics", "label": "Economics"},
      {"id": "political-science", "label": "Political Science"},
      {"id": "psychology", "label": "Psychology"},
      {"id": "sociology", "label": "Sociology"}
    ],

    "exams": [
      {
        "id": "jee",
        "label": "JEE",
        "description": "A future engineering-preparation learning path"
      },
      {
        "id": "neet",
        "label": "NEET",
        "description": "A future medical-entrance preparation learning path"
      },
      {
        "id": "nda",
        "label": "NDA · PCM study support",
        "description": "Product availability, not a determination of service-specific eligibility"
      }
    ],

    "studyGoals": [
      {"id": "concepts", "label": "Master concepts"},
      {"id": "school-exams", "label": "Prepare for school exams"},
      {"id": "revision", "label": "Revise faster"},
      {"id": "weak-topics", "label": "Improve weak topics"},
      {"id": "consistency", "label": "Build consistency"},
      {"id": "competitive", "label": "Competitive preparation"}
    ],

    "learningPreferences": [
      {
        "id": "detailed",
        "label": "Detailed explanations",
        "description": "Take time to follow the reasoning"
      },
      {
        "id": "visual",
        "label": "Visual learning",
        "description": "Emphasize diagrams and visual connections"
      },
      {
        "id": "practice",
        "label": "Practice-heavy",
        "description": "Use questions to strengthen understanding"
      },
      {
        "id": "balanced",
        "label": "Balanced",
        "description": "A mix of explanation, visuals and practice"
      }
    ],

    "lowerRules": [
      {
        "boards": ["cbse"],
        "grades": [6, 7, 8, 9, 10],
        "required": [],
        "available": [
          "english", "mathematics", "science", "social-studies",
          "hindi", "computer-science"
        ],
        "defaults": ["english", "mathematics", "science", "social-studies"],
        "minimum": 3
      },
      {
        "boards": ["cisce"],
        "grades": [6, 7, 8],
        "required": [],
        "available": [
          "english", "mathematics", "science", "history",
          "geography", "hindi", "computer-science"
        ],
        "defaults": ["english", "mathematics", "science", "history"],
        "minimum": 3
      },
      {
        "boards": ["cisce"],
        "grades": [9, 10],
        "required": [],
        "available": [
          "english", "mathematics", "physics", "chemistry", "biology",
          "history", "geography", "hindi", "computer-science", "economics"
        ],
        "defaults": ["english", "mathematics", "physics", "chemistry"],
        "minimum": 3
      }
    ],

    "paths": [
      {
        "id": "pcm",
        "label": "PCM",
        "description": "Physics · Chemistry · Mathematics",
        "stream": "science",
        "boards": ["cbse", "cisce"],
        "required": ["physics", "chemistry", "mathematics"],
        "optional": ["english", "computer-science", "physical-education"],
        "defaults": ["physics", "chemistry", "mathematics", "english"],
        "minimum": 3,
        "goals": ["jee", "nda"]
      },
      {
        "id": "pcb",
        "label": "PCB",
        "description": "Physics · Chemistry · Biology",
        "stream": "science",
        "boards": ["cbse", "cisce"],
        "required": ["physics", "chemistry", "biology"],
        "optional": ["english", "computer-science", "physical-education"],
        "defaults": ["physics", "chemistry", "biology", "english"],
        "minimum": 3,
        "goals": ["neet"]
      },
      {
        "id": "pcmb",
        "label": "PCMB",
        "description": "Physics · Chemistry · Mathematics · Biology",
        "stream": "science",
        "boards": ["cbse", "cisce"],
        "required": ["physics", "chemistry", "mathematics", "biology"],
        "optional": ["english", "computer-science", "physical-education"],
        "defaults": ["physics", "chemistry", "mathematics", "biology", "english"],
        "minimum": 4,
        "goals": ["jee", "neet", "nda"]
      },
      {
        "id": "commerce-maths",
        "label": "Commerce with Mathematics",
        "description": "An analytical starter combination",
        "stream": "commerce",
        "boards": ["cbse", "cisce"],
        "required": ["mathematics"],
        "optional": [
          "english", "accountancy", "business-studies", "economics",
          "computer-science", "physical-education"
        ],
        "defaults": ["mathematics", "english", "accountancy", "economics"],
        "minimum": 3,
        "goals": []
      },
      {
        "id": "commerce-standard",
        "label": "Commerce without Mathematics",
        "description": "Choose the commerce subjects that fit your school",
        "stream": "commerce",
        "boards": ["cbse", "cisce"],
        "required": [],
        "optional": [
          "english", "accountancy", "business-studies", "economics",
          "computer-science", "physical-education"
        ],
        "defaults": ["english", "accountancy", "business-studies", "economics"],
        "minimum": 3,
        "goals": []
      },
      {
        "id": "humanities-flex",
        "label": "Humanities subject selection",
        "description": "Build a combination around your actual subjects",
        "stream": "humanities",
        "boards": ["cbse", "cisce"],
        "required": [],
        "optional": [
          "english", "history", "geography", "political-science",
          "economics", "psychology", "sociology", "hindi", "mathematics"
        ],
        "defaults": ["english", "history", "geography"],
        "minimum": 3,
        "goals": []
      }
    ]
  }
  $catalog$::jsonb
);

create function public.averiq_text_array(
  input jsonb,
  maximum integer
)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  result text[];
begin
  if jsonb_typeof(input) is distinct from 'array' then
    raise exception 'Expected an array' using errcode = '22023';
  end if;

  if jsonb_array_length(input) > maximum then
    raise exception 'Too many selections' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(input) as item(value)
    where jsonb_typeof(value) <> 'string'
       or char_length(value #>> '{}') > 80
  ) then
    raise exception 'Invalid selection value' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct value), '{}'::text[])
  into result
  from jsonb_array_elements_text(input) as item(value);

  return result;
end
$$;

revoke all on function public.averiq_text_array(jsonb, integer)
from public, anon, authenticated;

create function public.complete_onboarding(
  p_user_id uuid,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  catalog public.averiq_onboarding_catalogs%rowtype;
  cfg jsonb;
  path_config jsonb;
  rule_config jsonb;

  student_name text;
  avatar text;
  grade integer;
  board_code text;
  stream_code text;
  combination text;
  system_code text;
  preference text;
  daily_target integer;

  selected_subjects text[];
  selected_goals text[];
  selected_study_goals text[];

  required_subjects text[];
  available_subjects text[];
  allowed_goals text[] := '{}'::text[];
  known_study_goals text[];

  minimum_subjects integer;
begin
  if actor is null or p_user_id is distinct from actor then
    raise exception 'Authenticated owner required' using errcode = '42501';
  end if;

  -- Serialize completion for the same user.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(actor::text, 0)
  );

  -- Idempotent retry: never overwrite a completed profile with a stale draft.
  if exists (
    select 1 from public.profiles
    where id = actor and onboarding_completed
  ) then
    return actor;
  end if;

  if jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'Invalid payload' using errcode = '22023';
  end if;

  select *
  into catalog
  from public.averiq_onboarding_catalogs
  where active = true
    and version = p_payload->>'catalogVersion';

  if not found then
    raise exception 'Refresh setup catalogue' using errcode = '22023';
  end if;

  cfg := catalog.config;
  student_name := btrim(p_payload->>'displayName');
  avatar := nullif(p_payload->>'avatarUrl', '');
  board_code := p_payload->>'board';
  stream_code := nullif(p_payload->>'stream', '');
  combination := nullif(p_payload->>'subjectCombination', '');
  preference := p_payload->>'learningPreference';

  if coalesce(char_length(student_name), 0) not between 2 and 80 then
    raise exception 'Invalid display name' using errcode = '22023';
  end if;

  if avatar is not null and (
    avatar not like 'https://%' or char_length(avatar) > 2048
  ) then
    raise exception 'Invalid avatar URL' using errcode = '22023';
  end if;

  if not coalesce(
    (p_payload->>'classLevel') ~ '^(6|7|8|9|10|11|12)$',
    false
  ) then
    raise exception 'Invalid class' using errcode = '22023';
  end if;

  grade := (p_payload->>'classLevel')::integer;

  if board_code is null or board_code not in ('cbse', 'cisce') then
    raise exception 'Invalid board' using errcode = '22023';
  end if;

  selected_subjects :=
    public.averiq_text_array(p_payload->'selectedSubjects', 20);

  selected_goals :=
    public.averiq_text_array(p_payload->'competitiveGoals', 3);

  selected_study_goals :=
    public.averiq_text_array(p_payload->'studyGoals', 3);

  if grade <= 10 then
    if stream_code is not null or combination is not null then
      raise exception 'Streams do not apply to this class'
      using errcode = '22023';
    end if;

    select value
    into rule_config
    from jsonb_array_elements(cfg->'lowerRules') as item(value)
    where (value->'boards') ? board_code
      and (value->'grades') @> jsonb_build_array(grade)
    limit 1;

    if rule_config is null then
      raise exception 'No subject rule found' using errcode = '22023';
    end if;

    required_subjects :=
      public.averiq_text_array(rule_config->'required', 20);

    available_subjects :=
      public.averiq_text_array(rule_config->'available', 20);

    minimum_subjects := (rule_config->>'minimum')::integer;
  else
    select value
    into path_config
    from jsonb_array_elements(cfg->'paths') as item(value)
    where value->>'id' = combination
      and value->>'stream' = stream_code
      and (value->'boards') ? board_code
    limit 1;

    if path_config is null then
      raise exception 'Invalid senior-secondary path'
      using errcode = '22023';
    end if;

    required_subjects :=
      public.averiq_text_array(path_config->'required', 20);

    available_subjects := required_subjects ||
      public.averiq_text_array(path_config->'optional', 20);

    minimum_subjects := (path_config->>'minimum')::integer;

    if (cfg->'competitiveGrades') @> jsonb_build_array(grade) then
      allowed_goals :=
        public.averiq_text_array(path_config->'goals', 3);
    end if;
  end if;

  if cardinality(selected_subjects) < minimum_subjects
     or not required_subjects <@ selected_subjects
     or not selected_subjects <@ available_subjects
  then
    raise exception 'Invalid subject selection' using errcode = '22023';
  end if;

  if not selected_goals <@ allowed_goals then
    raise exception 'Competitive goal unavailable for this class/path'
    using errcode = '22023';
  end if;

  select coalesce(array_agg(value->>'id'), '{}'::text[])
  into known_study_goals
  from jsonb_array_elements(cfg->'studyGoals') as item(value);

  if cardinality(selected_study_goals) not between 1 and 3
     or not selected_study_goals <@ known_study_goals
  then
    raise exception 'Invalid study goals' using errcode = '22023';
  end if;

  if 'competitive' = any(selected_study_goals)
     and cardinality(selected_goals) = 0
  then
    raise exception 'Competitive study goal requires an exam goal'
    using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(cfg->'learningPreferences') as item(value)
    where value->>'id' = preference
  ) then
    raise exception 'Invalid learning preference' using errcode = '22023';
  end if;

  if p_payload->>'dailyStudyTarget' is not null then
    if not (p_payload->>'dailyStudyTarget') ~ '^[0-9]{1,3}$' then
      raise exception 'Invalid daily target' using errcode = '22023';
    end if;

    daily_target := (p_payload->>'dailyStudyTarget')::integer;

    if daily_target not between 5 and 240 then
      raise exception 'Daily target out of range' using errcode = '22023';
    end if;
  end if;

  system_code := case
    when board_code = 'cbse' and grade >= 11 then 'cbse-senior-secondary'
    when board_code = 'cbse' then 'cbse-school'
    when board_code = 'cisce' and grade >= 11 then 'isc'
    when board_code = 'cisce' and grade >= 9 then 'icse'
    else 'cisce-school'
  end;

  insert into public.profiles (
    id, display_name, avatar_url,
    catalog_version, academic_year,
    class_level, board, school_system,
    stream, subject_combination,
    study_goals, learning_preference, daily_study_target,
    onboarding_completed, onboarding_completed_at
  )
  values (
    actor, student_name, avatar,
    catalog.version, catalog.academic_year,
    grade, board_code, system_code,
    stream_code, combination,
    selected_study_goals, preference, daily_target,
    false, null
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    catalog_version = excluded.catalog_version,
    academic_year = excluded.academic_year,
    class_level = excluded.class_level,
    board = excluded.board,
    school_system = excluded.school_system,
    stream = excluded.stream,
    subject_combination = excluded.subject_combination,
    study_goals = excluded.study_goals,
    learning_preference = excluded.learning_preference,
    daily_study_target = excluded.daily_study_target,
    updated_at = now();

  delete from public.student_subjects where user_id = actor;

  insert into public.student_subjects (user_id, subject_key)
  select actor, value
  from unnest(selected_subjects) as item(value);

  delete from public.student_competitive_goals where user_id = actor;

  insert into public.student_competitive_goals (user_id, goal_key)
  select actor, value
  from unnest(selected_goals) as item(value);

  -- This is the final write in the same atomic transaction.
  update public.profiles
  set onboarding_completed = true,
      onboarding_completed_at = now(),
      updated_at = now()
  where id = actor;

  return actor;
end
$$;

revoke all on function public.complete_onboarding(uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.complete_onboarding(uuid, jsonb)
to authenticated;

commit;
