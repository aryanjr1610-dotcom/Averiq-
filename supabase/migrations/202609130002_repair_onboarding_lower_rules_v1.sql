-- Complete the onboarding catalogue repair for Classes 6-10.
-- Every active lowerRule must include defaults because the client validates the
-- whole catalogue before rendering any onboarding step.

with repaired as (
  select
    c.version,
    jsonb_agg(
      r.rule || jsonb_build_object(
        'defaults', (
          select coalesce(jsonb_agg(picked.value order by picked.seq), '[]'::jsonb)
          from (
            select
              dedup.value,
              row_number() over (order by dedup.first_pos) as seq
            from (
              select combined.value, min(combined.position) as first_pos
              from (
                select req.value, req.ord as position
                from jsonb_array_elements_text(
                  coalesce(r.rule->'required', '[]'::jsonb)
                ) with ordinality as req(value, ord)

                union all

                select available.value, 1000 + available.ord as position
                from jsonb_array_elements_text(
                  coalesce(r.rule->'available', '[]'::jsonb)
                ) with ordinality as available(value, ord)
              ) combined
              group by combined.value
            ) dedup
          ) picked
          where picked.seq <= greatest(
            1,
            coalesce((r.rule->>'minimum')::integer, 1)
          )
        )
      )
      order by r.ord
    ) as lower_rules
  from public.averiq_onboarding_catalogs c
  cross join lateral jsonb_array_elements(c.config->'lowerRules')
    with ordinality as r(rule, ord)
  where c.active = true
  group by c.version
)
update public.averiq_onboarding_catalogs c
set config = jsonb_set(c.config, '{lowerRules}', repaired.lower_rules, true)
from repaired
where c.version = repaired.version
  and c.active = true;

do $$
declare
  bad_count integer;
begin
  select count(*)
  into bad_count
  from public.averiq_onboarding_catalogs c
  cross join lateral jsonb_array_elements(c.config->'lowerRules') r(rule)
  where c.active = true
    and (
      jsonb_typeof(r.rule->'boards') is distinct from 'array'
      or jsonb_typeof(r.rule->'grades') is distinct from 'array'
      or jsonb_typeof(r.rule->'required') is distinct from 'array'
      or jsonb_typeof(r.rule->'available') is distinct from 'array'
      or jsonb_typeof(r.rule->'defaults') is distinct from 'array'
      or (r.rule->>'minimum') is null
    );

  if bad_count <> 0 then
    raise exception 'Active onboarding catalog still has % invalid lower rule(s)', bad_count;
  end if;
end
$$;
