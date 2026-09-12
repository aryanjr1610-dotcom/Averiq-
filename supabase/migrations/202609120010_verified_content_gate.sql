begin;

-- Factual QA must distinguish real factual assertions from generic study/answer-writing prompts.
-- These rows are not "verified facts"; they are excluded from factual verification because they
-- contain no external factual proposition that could be supported or contradicted by a source.
update averiq_private.lesson_fact_claims
set status='out_of_scope',
    verification_method='deterministic_nonfactual_classifier_v2',
    reviewer_note='Instructional, revision, transfer, or answer-writing guidance; no external factual assertion requires verification.',
    metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('classification','nonfactual_instruction','classifier_version','2026-09-12-v2'),
    updated_at=now()
where status='pending'
  and (
    normalized_claim ~ '^(check your understanding|revision method:|read each concept|study each idea|as you read, ask|where a process is involved|where two ideas look similar|use this definition as the anchor|use this section after studying|use this lesson by moving|use this map to revise|then test yourself:|identify the evidence and explain why|identify the most relevant concept|support the answer with|use only the relevant chapter-specific|check the exact definition|at each step, explain why|a strong answer should|a complete understanding means|this chapter is best understood|decide whether the same concept applies|explain one similarity and one important difference|choose two related concepts|make outside connections only|correct this by linking|avoid copying source wording|connect it to another .* only when|5\) can you apply|6\) can you explain|2\) can you define|3\) can you give|4\) can you compare|state the feature that applies|describe evidence that matches|explain the most important difference|create or analyse a new situation)'
    or normalized_claim like '%a complete response should connect that method%'
    or normalized_claim like '%the original example demonstrates the skill without copying%'
    or normalized_claim like '%two appropriate ideas, a precise distinction, and a valid original example%'
    or normalized_claim like '%define each idea briefly, identify the decisive distinguishing feature%'
  );

update averiq_private.lesson_fact_claims
set status='out_of_scope',
    verification_method='deterministic_nonfactual_classifier_v3',
    reviewer_note='Generic answer-writing or practice instruction; no external factual assertion.',
    metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object('classification','nonfactual_instruction','classifier_version','2026-09-12-v3'),
    updated_at=now()
where status='pending'
  and normalized_claim in (
    'use the relevant chapter concept, connect it to the given evidence, and show the reasoning in a logical sequence before stating the conclusion.',
    '• short answer: choose two related concepts from this unit.'
  );

update averiq_private.fact_verification_runs
set metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'nonfactual_classifier','2026-09-12-v3',
      'policy','instructional/meta prompts are excluded from external factual verification'
    )
where status='running'
  and coalesce(metadata->>'phase','')='all-grade factual verification';

-- A public export contains ONLY rows whose extracted factual claims contain no unresolved state.
-- The raw claim/evidence ledgers remain private and are never exposed to students.
create table if not exists public.lesson_verified_content_exports (
  version_id uuid primary key references public.lesson_versions(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks)='array'),
  key_terms jsonb not null default '[]'::jsonb check (jsonb_typeof(key_terms)='array'),
  formulas jsonb not null default '[]'::jsonb check (jsonb_typeof(formulas)='array'),
  examples jsonb not null default '[]'::jsonb check (jsonb_typeof(examples)='array'),
  exercises jsonb not null default '[]'::jsonb check (jsonb_typeof(exercises)='array'),
  verification_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(verification_summary)='object'),
  is_fully_verified boolean not null default false,
  generated_at timestamptz not null default now()
);

alter table public.lesson_verified_content_exports enable row level security;
revoke all on table public.lesson_verified_content_exports from anon;
revoke insert, update, delete on table public.lesson_verified_content_exports from authenticated;
grant select on table public.lesson_verified_content_exports to authenticated;
grant select, insert, update, delete on table public.lesson_verified_content_exports to service_role;

drop policy if exists verified_content_exports_authenticated_read on public.lesson_verified_content_exports;
create policy verified_content_exports_authenticated_read
on public.lesson_verified_content_exports
for select
to authenticated
using (true);

create index if not exists idx_verified_content_exports_lesson_id
on public.lesson_verified_content_exports(lesson_id);

create or replace function averiq_private.refresh_verified_lesson_content_exports(p_version_id uuid default null)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer;
begin
  delete from public.lesson_verified_content_exports e
  where p_version_id is null or e.version_id=p_version_id;

  insert into public.lesson_verified_content_exports(
    version_id,lesson_id,blocks,key_terms,formulas,examples,exercises,
    verification_summary,is_fully_verified,generated_at
  )
  with claim_summary as (
    select c.version_id,
      count(*) filter(where c.status='verified')::int as verified,
      count(*) filter(where c.status='out_of_scope')::int as out_of_scope,
      count(*) filter(where c.status='pending')::int as pending,
      count(*) filter(where c.status='needs_correction')::int as needs_correction,
      count(*) filter(where c.status='needs_source')::int as needs_source,
      count(*) filter(where c.status='ambiguous')::int as ambiguous
    from averiq_private.lesson_fact_claims c
    where p_version_id is null or c.version_id=p_version_id
    group by c.version_id
  ), safe_rows as (
    select c.version_id,c.source_table,c.source_row_id
    from averiq_private.lesson_fact_claims c
    where c.source_row_id is not null
      and (p_version_id is null or c.version_id=p_version_id)
    group by c.version_id,c.source_table,c.source_row_id
    having count(*) filter(where c.status in ('pending','needs_correction','needs_source','ambiguous'))=0
  )
  select lv.id,lv.lesson_id,
    coalesce((select jsonb_agg(to_jsonb(b) order by b.position,b.id)
      from public.lesson_content_blocks b
      join safe_rows s on s.version_id=lv.id and s.source_table='lesson_content_blocks' and s.source_row_id=b.id
      where b.version_id=lv.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(k) order by k.position,k.id)
      from public.lesson_key_terms k
      join safe_rows s on s.version_id=lv.id and s.source_table='lesson_key_terms' and s.source_row_id=k.id
      where k.version_id=lv.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(f) order by f.position,f.id)
      from public.lesson_formulas f
      join safe_rows s on s.version_id=lv.id and s.source_table='lesson_formulas' and s.source_row_id=f.id
      where f.version_id=lv.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(x) order by x.position,x.id)
      from public.lesson_examples x
      join safe_rows s on s.version_id=lv.id and s.source_table='lesson_examples' and s.source_row_id=x.id
      where x.version_id=lv.id),'[]'::jsonb),
    coalesce((select jsonb_agg(to_jsonb(e) order by e.position,e.id)
      from public.lesson_exercises e
      join safe_rows s on s.version_id=lv.id and s.source_table='lesson_exercises' and s.source_row_id=e.id
      where e.version_id=lv.id),'[]'::jsonb),
    jsonb_build_object(
      'verified',coalesce(cs.verified,0),
      'out_of_scope',coalesce(cs.out_of_scope,0),
      'pending',coalesce(cs.pending,0),
      'needs_correction',coalesce(cs.needs_correction,0),
      'needs_source',coalesce(cs.needs_source,0),
      'ambiguous',coalesce(cs.ambiguous,0)
    ),
    (coalesce(cs.pending,0)=0 and coalesce(cs.needs_correction,0)=0
      and coalesce(cs.needs_source,0)=0 and coalesce(cs.ambiguous,0)=0
      and coalesce(cs.verified,0)>0),
    now()
  from public.lesson_versions lv
  left join claim_summary cs on cs.version_id=lv.id
  where p_version_id is null or lv.id=p_version_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function averiq_private.refresh_verified_lesson_content_exports(uuid) from public,anon,authenticated;
grant execute on function averiq_private.refresh_verified_lesson_content_exports(uuid) to service_role;

-- Exact claim reuse is allowed only when the proposition is byte-normalized-identical AND the
-- source claim has authoritative supporting evidence. Evidence is copied, never inferred.
with source_claim as (
  select distinct on (c.normalized_claim)
    c.normalized_claim,c.id as source_claim_id
  from averiq_private.lesson_fact_claims c
  where c.status='verified'
    and exists (
      select 1 from averiq_private.lesson_fact_evidence e
      where e.claim_id=c.id and e.relation='supports'
        and e.authority_level in ('official','primary','authoritative_secondary')
    )
  order by c.normalized_claim,c.verified_at nulls last,c.id
), targets as (
  select t.id target_claim_id,s.source_claim_id
  from averiq_private.lesson_fact_claims t
  join source_claim s using(normalized_claim)
  where t.status='pending'
)
insert into averiq_private.lesson_fact_evidence(
  claim_id,source_name,source_url,source_document,source_locator,evidence_excerpt,
  authority_level,relation,retrieved_at,metadata
)
select t.target_claim_id,e.source_name,e.source_url,e.source_document,e.source_locator,e.evidence_excerpt,
       e.authority_level,e.relation,e.retrieved_at,
       coalesce(e.metadata,'{}'::jsonb) || jsonb_build_object('propagated_from_claim_id',t.source_claim_id::text,'propagation','exact_normalized_claim')
from targets t
join averiq_private.lesson_fact_evidence e on e.claim_id=t.source_claim_id and e.relation='supports'
where not exists (
  select 1 from averiq_private.lesson_fact_evidence x
  where x.claim_id=t.target_claim_id
    and x.source_url=e.source_url
    and coalesce(x.source_locator,'')=coalesce(e.source_locator,'')
    and x.relation=e.relation
);

with verified_norm as (
  select distinct c.normalized_claim
  from averiq_private.lesson_fact_claims c
  where c.status='verified'
    and exists (
      select 1 from averiq_private.lesson_fact_evidence e
      where e.claim_id=c.id and e.relation='supports'
        and e.authority_level in ('official','primary','authoritative_secondary')
    )
)
update averiq_private.lesson_fact_claims t
set status='verified',
    verification_method='exact_evidence_propagation',
    reviewer_note='Exact normalized claim already verified by authoritative supporting evidence; evidence copied to this claim.',
    verified_at=now(),
    metadata=coalesce(t.metadata,'{}'::jsonb) || jsonb_build_object('verification_propagation','exact_normalized_claim','propagated_at',now()),
    updated_at=now()
from verified_norm v
where t.status='pending' and t.normalized_claim=v.normalized_claim
  and exists (
    select 1 from averiq_private.lesson_fact_evidence e
    where e.claim_id=t.id and e.relation='supports'
      and e.authority_level in ('official','primary','authoritative_secondary')
  );

select averiq_private.refresh_verified_lesson_content_exports(null);

commit;