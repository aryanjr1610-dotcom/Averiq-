begin;

do $$
declare
  constraint_row record;
begin
  if to_regclass('public.lesson_versions') is null then
    raise exception 'Apply the Phase 5/6 migration first.';
  end if;

  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.lesson_versions'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) like '%content_schema_version%'
        or pg_get_constraintdef(oid) like '%schemaVersion%'
      )
  loop
    execute format(
      'alter table public.lesson_versions drop constraint %I',
      constraint_row.conname
    );
  end loop;
end
$$;

alter table public.lesson_versions
  add constraint lesson_versions_supported_schema
  check (content_schema_version in (1, 2));

alter table public.lesson_versions
  add constraint lesson_versions_document_consistency
  check (
    jsonb_typeof(content) = 'object'
    and content ? 'schemaVersion'
    and content ? 'blocks'
    and jsonb_typeof(content->'schemaVersion') = 'number'
    and content->>'schemaVersion' = content_schema_version::text
    and jsonb_typeof(content->'blocks') = 'array'
    and octet_length(content::text) <= 2000000
  );

-- Close the published -> draft -> edited loophole.
create or replace function public.academic_freeze_published()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published'
     and new.status not in ('published', 'archived')
  then
    raise exception 'Published records may only remain published or be archived.';
  end if;

  if old.status = 'archived' and new.status <> 'archived' then
    raise exception 'Archived history cannot be reactivated in place.';
  end if;

  if old.status in ('published', 'archived')
     and (
       to_jsonb(new) - 'status' - 'updated_at'
       is distinct from
       to_jsonb(old) - 'status' - 'updated_at'
     )
  then
    raise exception 'Published history is immutable. Create a new revision.';
  end if;

  return new;
end
$$;

commit;
