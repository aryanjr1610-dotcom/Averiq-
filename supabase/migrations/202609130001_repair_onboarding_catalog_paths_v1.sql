-- Repair the active onboarding catalogue contract used by the React client.
--
-- A partially published 2026.1 catalogue omitted label/description/defaults
-- from every senior-secondary path and used the legacy stream value `arts`.
-- That caused CatalogSchema.parse() to fail immediately after authentication.

with repaired as (
  select
    c.version,
    jsonb_agg(
      p.path || jsonb_build_object(
        'stream', case
          when p.path->>'stream' = 'arts' then 'humanities'
          else p.path->>'stream'
        end,
        'label', case
          when p.path->>'id' like '%-pcmb' then 'PCMB'
          when p.path->>'id' like '%-pcm' then 'PCM'
          when p.path->>'id' like '%-pcb' then 'PCB'
          when p.path->>'id' like '%-commerce-maths' then 'Commerce with Mathematics'
          when p.path->>'id' like '%-commerce' then 'Commerce'
          when p.path->>'id' like '%-humanities' then 'Humanities'
          else initcap(replace(p.path->>'id', '-', ' '))
        end,
        'description', case
          when p.path->>'id' like '%-pcmb' then 'Physics · Chemistry · Mathematics · Biology'
          when p.path->>'id' like '%-pcm' then 'Physics · Chemistry · Mathematics'
          when p.path->>'id' like '%-pcb' then 'Physics · Chemistry · Biology'
          when p.path->>'id' like '%-commerce-maths' then 'Commerce pathway with Mathematics'
          when p.path->>'id' like '%-commerce' then 'Commerce pathway without Mathematics'
          when p.path->>'id' like '%-humanities' then 'Build a Humanities combination around your school subjects'
          else 'Academic pathway'
        end,
        'defaults', (
          select coalesce(jsonb_agg(r.value order by r.seq), '[]'::jsonb)
          from (
            select
              q.value,
              row_number() over (order by q.source_rank, q.ord) as seq
            from (
              select req.value, 0 as source_rank, req.ord
              from jsonb_array_elements_text(
                coalesce(p.path->'required', '[]'::jsonb)
              ) with ordinality as req(value, ord)

              union all

              select opt.value, 1 as source_rank, opt.ord
              from jsonb_array_elements_text(
                coalesce(p.path->'optional', '[]'::jsonb)
              ) with ordinality as opt(value, ord)
            ) q
          ) r
          where r.seq <= greatest(
            1,
            coalesce((p.path->>'minimum')::integer, 1)
          )
        )
      )
      order by p.ord
    ) as paths
  from public.averiq_onboarding_catalogs c
  cross join lateral jsonb_array_elements(c.config->'paths')
    with ordinality as p(path, ord)
  where c.active = true
  group by c.version
)
update public.averiq_onboarding_catalogs c
set config = jsonb_set(c.config, '{paths}', repaired.paths, true)
from repaired
where c.version = repaired.version
  and c.active = true;

-- Refuse to leave an active catalogue in a state that can lock users out of
-- onboarding again.
do $$
declare
  bad_count integer;
begin
  select count(*)
  into bad_count
  from public.averiq_onboarding_catalogs c
  cross join lateral jsonb_array_elements(c.config->'paths') p(path)
  where c.active = true
    and (
      not (p.path ? 'label')
      or nullif(p.path->>'label', '') is null
      or not (p.path ? 'description')
      or nullif(p.path->>'description', '') is null
      or jsonb_typeof(p.path->'defaults') is distinct from 'array'
      or p.path->>'stream' not in ('science', 'commerce', 'humanities')
    );

  if bad_count <> 0 then
    raise exception 'Active onboarding catalog still has % invalid path(s)', bad_count;
  end if;
end
$$;
