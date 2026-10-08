-- #78 update: append_facts_and_analysis now records translation metadata
-- so reanalysis rows can also be audited for which translator produced the
-- English text passed to Jev.

create or replace function public.append_facts_and_analysis(
  p_user_id uuid,
  p_relationship_id uuid,
  p_facts jsonb,
  p_analysis jsonb,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_snapshot_id uuid;
  v_previous_snapshot_id uuid;
begin
  if p_user_id is null
    or p_relationship_id is null
    or p_idempotency_key is null
    or jsonb_typeof(p_facts) <> 'array'
    or jsonb_array_length(p_facts) <> 1
  then
    raise exception 'invalid reanalysis request' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.relationships
    where id = p_relationship_id
      and user_id = p_user_id
  ) then
    raise exception 'relationship not found' using errcode = 'P0002';
  end if;

  select id
  into v_snapshot_id
  from public.analysis_snapshots
  where reanalysis_idempotency_key = p_idempotency_key
    and relationship_id = p_relationship_id;

  if v_snapshot_id is not null then
    return v_snapshot_id;
  end if;

  select id
  into v_previous_snapshot_id
  from public.analysis_snapshots
  where relationship_id = p_relationship_id
  order by created_at desc
  limit 1;

  insert into public.facts (
    relationship_id,
    text_original,
    text_english,
    translation_version,
    translation_skipped,
    fact_validation
  )
  select
    p_relationship_id,
    item.text_original,
    item.text_english,
    item.translation_version,
    coalesce(item.translation_skipped, item.text_english is null),
    'observable'::public.fact_validation_status
  from jsonb_to_recordset(p_facts) as item(
    text_original text,
    text_english text,
    translation_version text,
    translation_skipped boolean
  );

  insert into public.analysis_snapshots (
    relationship_id,
    previous_snapshot_id,
    reanalysis_idempotency_key,
    romantic_interest,
    desire_to_meet,
    initiative,
    evidence_sufficiency,
    model_version,
    rubric_version
  )
  values (
    p_relationship_id,
    v_previous_snapshot_id,
    p_idempotency_key,
    (p_analysis ->> 'romanticInterest')::smallint,
    (p_analysis ->> 'desireToMeet')::smallint,
    (p_analysis ->> 'initiative')::smallint,
    (p_analysis ->> 'evidenceSufficiency')::smallint,
    p_analysis ->> 'modelVersion',
    p_analysis ->> 'rubricVersion'
  )
  returning id into v_snapshot_id;

  update public.relationships
  set updated_at = clock_timestamp()
  where id = p_relationship_id
    and user_id = p_user_id;

  return v_snapshot_id;
end;
$$;

revoke all on function public.append_facts_and_analysis(uuid, uuid, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.append_facts_and_analysis(uuid, uuid, jsonb, jsonb, uuid)
  to service_role;