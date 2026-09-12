-- Phase 18: personal notes / highlights / bookmarks + published search index.

do $guard$
begin
  if to_regclass('public.lessons') is null then
    raise exception 'Run the earlier Averiq migrations first';
  end if;
  if to_regclass('public.user_notes') is not null then
    raise exception 'public.user_notes already exists - review before re-running';
  end if;
end
$guard$;

create or replace function public.notes_touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

create table public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  note_type text not null default 'personal',
  subject_id uuid,
  chapter_id uuid,
  lesson_id uuid,
  block_id text,
  formula_id text,
  question_id text,
  visualization_id text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint note_type_allowed check (note_type in ('personal','lesson','formula','question','visual')),
  constraint note_title_length check (title is null or char_length(title) <= 200),
  constraint note_content_length check (char_length(content) <= 20000),
  constraint note_block_length check (block_id is null or char_length(block_id) <= 120)
);

create table public.user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null,
  block_id text not null,
  content_version_id uuid,
  selected_text text not null,
  text_snapshot text not null,
  prefix text,
  suffix text,
  color text not null default 'default',
  note_id uuid references public.user_notes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint highlight_color check (color in ('default','important','question')),
  constraint highlight_text_length check (char_length(selected_text) between 1 and 2000),
  constraint highlight_snapshot_length check (char_length(text_snapshot) <= 4000)
);

create table public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  title text,
  route text,
  created_at timestamptz not null default now(),
  constraint bookmark_entity_type check (
    entity_type in ('lesson','chapter','formula','derivation','question','revision','visualization','anatomy')
  ),
  constraint bookmark_entity_length check (char_length(entity_id) between 1 and 200),
  unique (user_id, entity_type, entity_id)
);

create table public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tag_name_length check (char_length(name) between 1 and 40),
  unique (user_id, name)
);

create table public.note_tags (
  note_id uuid not null references public.user_notes(id) on delete cascade,
  tag_id uuid not null references public.user_tags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (note_id, tag_id)
);

create index user_notes_recent on public.user_notes (user_id, updated_at desc);
create index user_notes_lesson on public.user_notes (user_id, lesson_id);
create index user_highlights_lesson on public.user_highlights (user_id, lesson_id, block_id);
create index user_bookmarks_recent on public.user_bookmarks (user_id, created_at desc);

do $rls$
declare
  t text;
begin
  foreach t in array array['user_notes','user_highlights','user_bookmarks','user_tags','note_tags'] loop
    if t in ('user_notes','user_highlights') then
      execute format(
        'create trigger touch_%1$s before update on public.%1$I
         for each row execute function public.notes_touch_updated_at()', t);
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

-- ---------------------------------------------------------------------------
-- Published search index. Postgres FTS, no client-side scanning of bodies.
-- ---------------------------------------------------------------------------

create table public.search_documents (
  entity_type text not null,
  entity_id text not null,
  title text not null,
  subtitle text,
  subject text,
  chapter text,
  route text not null,
  status text not null default 'published',
  search_text text not null default '',
  updated_at timestamptz not null default now(),
  tsv tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(search_text, '')), 'C')
  ) stored,
  primary key (entity_type, entity_id)
);

create index search_documents_tsv on public.search_documents using gin (tsv);
create index search_documents_type on public.search_documents (entity_type);

alter table public.search_documents enable row level security;
revoke all on public.search_documents from anon, authenticated;
grant select on public.search_documents to authenticated;
grant all on public.search_documents to service_role;
create policy search_documents_read on public.search_documents
  for select to authenticated using (status = 'published');

-- Picks the first column that actually exists, so the index builder does not
-- assume column names from earlier migrations.
create or replace function public.search_pick_column(p_table text, p_candidates text[])
returns text language sql stable as $fn$
  select c from unnest(p_candidates) as c
  where exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = c
  )
  limit 1
$fn$;

create or replace function public.rebuild_search_documents()
returns integer
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_title text;
  v_status text;
  v_where text;
  v_count integer := 0;
begin
  if auth.uid() is not null and not public.academic_is_reviewer() then
    raise exception 'Only reviewers can rebuild the search index' using errcode = '42501';
  end if;

  delete from public.search_documents where entity_type in ('subject','chapter','topic','lesson');

  -- subjects
  v_title := public.search_pick_column('subjects', array['name','title','display_name']);
  v_status := public.search_pick_column('subjects', array['status']);
  if v_title is not null then
    v_where := case when v_status is null then '' else format('where s.%I = ''published''', v_status) end;
    execute format(
      'insert into public.search_documents(entity_type, entity_id, title, subtitle, subject, route, search_text)
       select ''subject'', s.id::text, s.%1$I, ''Subject'', s.%1$I, ''/app/learn?subject='' || s.id::text, s.%1$I
       from public.subjects s %2$s
       on conflict (entity_type, entity_id) do update
         set title = excluded.title, route = excluded.route, search_text = excluded.search_text, updated_at = now()',
      v_title, v_where);
  end if;

  -- chapters
  v_title := public.search_pick_column('chapters', array['title','name']);
  v_status := public.search_pick_column('chapters', array['status']);
  if v_title is not null then
    v_where := case when v_status is null then '' else format('where c.%I = ''published''', v_status) end;
    execute format(
      'insert into public.search_documents(entity_type, entity_id, title, subtitle, chapter, route, search_text)
       select ''chapter'', c.id::text, c.%1$I, ''Chapter'', c.%1$I, ''/app/learn/chapters/'' || c.id::text, c.%1$I
       from public.chapters c %2$s
       on conflict (entity_type, entity_id) do update
         set title = excluded.title, route = excluded.route, search_text = excluded.search_text, updated_at = now()',
      v_title, v_where);
  end if;

  -- topics (route to the parent chapter so links never dead-end)
  v_title := public.search_pick_column('topics', array['title','name']);
  if v_title is not null and public.search_pick_column('topics', array['chapter_id']) is not null then
    execute format(
      'insert into public.search_documents(entity_type, entity_id, title, subtitle, route, search_text)
       select ''topic'', t.id::text, t.%1$I, ''Topic'', ''/app/learn/chapters/'' || t.chapter_id::text, t.%1$I
       from public.topics t
       on conflict (entity_type, entity_id) do update
         set title = excluded.title, route = excluded.route, search_text = excluded.search_text, updated_at = now()',
      v_title);
  end if;

  -- lessons: only those with a published version
  v_title := public.search_pick_column('lessons', array['title','name']);
  v_status := public.search_pick_column('lesson_versions', array['status']);
  if v_title is not null then
    v_where := case
      when v_status is null then ''
      else format('where exists (select 1 from public.lesson_versions v where v.lesson_id = l.id and v.%I = ''published'')', v_status)
    end;
    execute format(
      'insert into public.search_documents(entity_type, entity_id, title, subtitle, route, search_text)
       select ''lesson'', l.id::text, l.%1$I, ''Lesson'', ''/app/learn/lessons/'' || l.id::text, l.%1$I
       from public.lessons l %2$s
       on conflict (entity_type, entity_id) do update
         set title = excluded.title, route = excluded.route, search_text = excluded.search_text, updated_at = now()',
      v_title, v_where);
  end if;

  select count(*) into v_count from public.search_documents;
  return v_count;
end
$fn$;

revoke all on function public.rebuild_search_documents() from public;
grant execute on function public.rebuild_search_documents() to authenticated, service_role;

create or replace function public.search_published(p_query text, p_limit integer default 20)
returns table (
  entity_type text,
  entity_id text,
  title text,
  subtitle text,
  subject text,
  chapter text,
  route text,
  rank real
)
language sql
stable
as $fn$
  select d.entity_type, d.entity_id, d.title, d.subtitle, d.subject, d.chapter, d.route,
         ts_rank(d.tsv, websearch_to_tsquery('english', p_query)) as rank
  from public.search_documents d
  where d.status = 'published'
    and (
      d.tsv @@ websearch_to_tsquery('english', p_query)
      or d.title ilike '%' || p_query || '%'
    )
  order by rank desc, d.title asc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$fn$;

grant execute on function public.search_published(text, integer) to authenticated, service_role;
