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
  set accuracy_status=case when v_status='passed' then 'verified' else 'unverified' end,
      updated_at=now()
  where id=p_version_id;

  return jsonb_build_object(
    'version_id',p_version_id,
    'status',v_status,
    'claims_total',v_total,
    'pending',v_pending,
    'needs_correction',v_correction,
    'needs_source',v_missing,
    'ambiguous',v_ambiguous,
    'unsupported_verified',v_unsupported
  );
end;
$$;

revoke all on function averiq_private.refresh_factual_gate(uuid) from public, anon, authenticated;
grant execute on function averiq_private.refresh_factual_gate(uuid) to service_role;
