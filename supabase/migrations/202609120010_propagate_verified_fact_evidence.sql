begin;

-- Exact normalized-claim identity can safely reuse already attached supporting evidence.
-- This does not infer similarity: only byte-normalized identical claims are propagated.
with canonical as (
  select distinct on (c.normalized_claim)
         c.normalized_claim,c.id as source_claim_id
  from averiq_private.lesson_fact_claims c
  where c.status='verified'
  order by c.normalized_claim,c.verified_at nulls last,c.created_at
), targets as (
  select t.id target_claim_id,c.source_claim_id
  from averiq_private.lesson_fact_claims t
  join canonical c on c.normalized_claim=t.normalized_claim
  where t.status='pending'
), copied as (
  insert into averiq_private.lesson_fact_evidence(
    claim_id,source_name,source_url,source_document,source_locator,evidence_excerpt,
    authority_level,relation,retrieved_at,metadata
  )
  select t.target_claim_id,e.source_name,e.source_url,e.source_document,e.source_locator,
         e.evidence_excerpt,e.authority_level,e.relation,e.retrieved_at,
         coalesce(e.metadata,'{}'::jsonb)||jsonb_build_object(
           'propagated_from_claim',t.source_claim_id::text,
           'propagation','exact_normalized_claim_v1'
         )
  from targets t
  join averiq_private.lesson_fact_evidence e on e.claim_id=t.source_claim_id
  where e.relation='supports'
  returning claim_id
)
update averiq_private.lesson_fact_claims t
set status='verified',
    verification_method='exact_claim_evidence_propagation_v1',
    reviewer_note='Verified by exact normalized-claim identity with an already evidence-backed claim.',
    verified_at=now(),
    updated_at=now()
where t.id in (select claim_id from copied);

commit;
