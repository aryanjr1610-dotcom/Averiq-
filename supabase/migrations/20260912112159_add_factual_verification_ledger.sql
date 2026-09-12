begin;

create table if not exists averiq_private.fact_verification_runs (
  id uuid primary key default gen_random_uuid(),
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope)='object'),
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  source_policy text not null default 'authoritative-first',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object')
);

create table if not exists averiq_private.lesson_fact_claims (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.lesson_versions(id) on delete cascade,
  claim_key text not null,
  claim_type text not null check (claim_type in ('definition','formula','content','example','exercise_answer')),
  source_table text not null,
  source_row_id uuid,
  claim_text text not null check (char_length(btrim(claim_text)) >= 3),
  normalized_claim text not null,
  criticality text not null default 'major' check (criticality in ('minor','major','critical')),
  status text not null default 'pending' check (status in ('pending','verified','needs_correction','needs_source','ambiguous','out_of_scope')),
  verification_method text,
  reviewer_note text,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(version_id, claim_key)
);

create table if not exists averiq_private.lesson_fact_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references averiq_private.lesson_fact_claims(id) on delete cascade,
  source_name text not null,
  source_url text not null,
  source_document text,
  source_locator text,
  evidence_excerpt text,
  authority_level text not null default 'official' check (authority_level in ('official','primary','authoritative_secondary','secondary')),
  relation text not null check (relation in ('supports','contradicts','context_only')),
  retrieved_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);

create index if not exists idx_fact_claims_version_status on averiq_private.lesson_fact_claims(version_id,status);
create index if not exists idx_fact_claims_type_status on averiq_private.lesson_fact_claims(claim_type,status);
create index if not exists idx_fact_evidence_claim on averiq_private.lesson_fact_evidence(claim_id);

revoke all on averiq_private.fact_verification_runs from public, anon, authenticated;
revoke all on averiq_private.lesson_fact_claims from public, anon, authenticated;
revoke all on averiq_private.lesson_fact_evidence from public, anon, authenticated;
grant usage on schema averiq_private to service_role;
grant select,insert,update,delete on averiq_private.fact_verification_runs to service_role;
grant select,insert,update,delete on averiq_private.lesson_fact_claims to service_role;
grant select,insert,update,delete on averiq_private.lesson_fact_evidence to service_role;

create or replace function averiq_private.refresh_factual_gate(p_version_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_total integer;
  v_verified integer;
  v_pending integer;
  v_correction integer;
  v_missing integer;
  v_ambiguous integer;
  v_unsupported integer;
  v_status text;
begin
  select count(*),
         count(*) filter (where c.status in ('verified','out_of_scope')),
         count(*) filter (where c.status='pending'),
         count(*) filter (where c.status='needs_correction'),
         count(*) filter (where c.status='needs_source'),
         count(*) filter (where c.status='ambiguous'),
         count(*) filter (
           where c.status='verified' and not exists (
             select 1 from averiq_private.lesson_fact_evidence e
             where e.claim_id=c.id and e.relation='supports'
               and e.authority_level in ('official','primary','authoritative_secondary')
           )
         )
  into v_total,v_verified,v_pending,v_correction,v_missing,v_ambiguous,v_unsupported
  from averiq_private.lesson_fact_claims c
  where c.version_id=p_version_id;

  v_status := case
    when v_total=0 then 'warning'
    when v_correction>0 then 'failed'
    when v_pending=0 and v_missing=0 and v_ambiguous=0 and v_unsupported=0 and v_verified=v_total then 'passed'
    else 'warning'
  end;

  update public.lesson_validation_checks
  set status=v_status,
      details=coalesce(details,'{}'::jsonb) || jsonb_build_object(
        'claim_ledger','averiq_private.lesson_fact_claims',
        'claims_total',v_total,
        'claims_verified_or_out_of_scope',v_verified,
        'claims_pending',v_pending,
        'claims_needs_correction',v_correction,
        'claims_needs_source',v_missing,
        'claims_ambiguous',v_ambiguous,
        'verified_without_authoritative_evidence',v_unsupported,
        'gate_rule','All required claims must be verified with authoritative supporting evidence before factual_accuracy can pass.'
      ),
      checked_at=now(), updated_at=now()
  where version_id=p_version_id and check_type='factual_accuracy';

  update public.lesson_versions
  set accuracy_status=case when v_status='passed' then 'verified' else 'pending' end,
      updated_at=now()
  where id=p_version_id;

  return jsonb_build_object('version_id',p_version_id,'status',v_status,'claims_total',v_total,'pending',v_pending,'needs_correction',v_correction,'needs_source',v_missing,'ambiguous',v_ambiguous,'unsupported_verified',v_unsupported);
end;
$$;

revoke all on function averiq_private.refresh_factual_gate(uuid) from public, anon, authenticated;
grant execute on function averiq_private.refresh_factual_gate(uuid) to service_role;

insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,metadata
)
select k.version_id,
       'term:'||k.id::text,
       'definition','lesson_key_terms',k.id,
       k.term||': '||k.definition,
       lower(regexp_replace(btrim(k.term||': '||k.definition),'\s+',' ','g')),
       'major',jsonb_build_object('grade',12,'generated_from','lesson_key_terms')
from public.lesson_key_terms k
join public.lesson_versions lv on lv.id=k.version_id
join public.lessons l on l.id=lv.lesson_id
join public.topics t on t.id=l.topic_id
join public.chapters ch on ch.id=t.chapter_id
join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
join public.curriculum_releases cr on cr.id=cs.release_id
where cr.grade_level=12 and btrim(k.term)<>'' and btrim(k.definition)<>''
on conflict(version_id,claim_key) do nothing;

insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,metadata
)
select f.version_id,
       'formula:'||f.id::text,
       'formula','lesson_formulas',f.id,
       concat_ws(E'\n','Formula: '||f.name,'Statement: '||f.statement,'Expression: '||coalesce(f.expression_latex,''),'Conditions: '||coalesce(f.conditions,''),'Derivation: '||coalesce(f.derivation,'')),
       lower(regexp_replace(btrim(f.name||' '||f.statement||' '||coalesce(f.expression_latex,'')),'\s+',' ','g')),
       'critical',jsonb_build_object('grade',12,'generated_from','lesson_formulas')
from public.lesson_formulas f
join public.lesson_versions lv on lv.id=f.version_id
join public.lessons l on l.id=lv.lesson_id
join public.topics t on t.id=l.topic_id
join public.chapters ch on ch.id=t.chapter_id
join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
join public.curriculum_releases cr on cr.id=cs.release_id
where cr.grade_level=12
on conflict(version_id,claim_key) do nothing;

insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,metadata
)
select distinct b.version_id,
       'block:'||b.id::text||':'||md5(lower(regexp_replace(btrim(s.sentence),'\s+',' ','g'))),
       'content','lesson_content_blocks',b.id,
       btrim(s.sentence),
       lower(regexp_replace(btrim(s.sentence),'\s+',' ','g')),
       case when b.block_type in ('law','theorem') then 'critical' else 'major' end,
       jsonb_build_object('grade',12,'block_type',b.block_type,'heading',b.heading)
from public.lesson_content_blocks b
join public.lesson_versions lv on lv.id=b.version_id
join public.lessons l on l.id=lv.lesson_id
join public.topics t on t.id=l.topic_id
join public.chapters ch on ch.id=t.chapter_id
join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
join public.curriculum_releases cr on cr.id=cs.release_id
cross join lateral regexp_split_to_table(regexp_replace(b.body,E'[\r\n]+',' ','g'),'(?<=[.!?])\s+') as s(sentence)
where cr.grade_level=12
  and b.block_type in ('explanation','concept','law','theorem','summary','application')
  and char_length(btrim(s.sentence)) between 30 and 1200
  and btrim(s.sentence) !~* '^(revision|quick revision|study|exam|practice|use the|ask yourself|can you|remember to|connect these)'
on conflict(version_id,claim_key) do nothing;

insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,metadata
)
select e.version_id,
       'example:'||e.id::text,
       'example','lesson_examples',e.id,
       concat_ws(E'\n','Problem: '||e.problem_statement,'Solution: '||e.solution,'Final answer: '||coalesce(e.final_answer,'')),
       lower(regexp_replace(btrim(e.problem_statement||' '||e.solution||' '||coalesce(e.final_answer,'')),'\s+',' ','g')),
       'major',jsonb_build_object('grade',12,'generated_from','lesson_examples')
from public.lesson_examples e
join public.lesson_versions lv on lv.id=e.version_id
join public.lessons l on l.id=lv.lesson_id
join public.topics t on t.id=l.topic_id
join public.chapters ch on ch.id=t.chapter_id
join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
join public.curriculum_releases cr on cr.id=cs.release_id
where cr.grade_level=12
on conflict(version_id,claim_key) do nothing;

insert into averiq_private.lesson_fact_claims(
  version_id,claim_key,claim_type,source_table,source_row_id,claim_text,normalized_claim,criticality,metadata
)
select e.version_id,
       'exercise:'||e.id::text,
       'exercise_answer','lesson_exercises',e.id,
       concat_ws(E'\n','Question: '||e.question_text,'Answer: '||coalesce(e.answer::text,''),'Solution: '||coalesce(e.solution,'')),
       lower(regexp_replace(btrim(e.question_text||' '||coalesce(e.answer::text,'')||' '||coalesce(e.solution,'')),'\s+',' ','g')),
       case when e.question_type in ('numerical','derivation','proof') then 'critical' else 'major' end,
       jsonb_build_object('grade',12,'question_type',e.question_type,'generated_from','lesson_exercises')
from public.lesson_exercises e
join public.lesson_versions lv on lv.id=e.version_id
join public.lessons l on l.id=lv.lesson_id
join public.topics t on t.id=l.topic_id
join public.chapters ch on ch.id=t.chapter_id
join public.curriculum_subjects cs on cs.id=ch.curriculum_subject_id
join public.curriculum_releases cr on cr.id=cs.release_id
where cr.grade_level=12 and (e.answer is not null or nullif(btrim(coalesce(e.solution,'')),'') is not null)
on conflict(version_id,claim_key) do nothing;

commit;
