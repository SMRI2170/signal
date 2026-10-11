-- #72 SIGNAL LEVEL semantics: introduce `signal_level` and
-- `score_schema_version` columns on `analysis_snapshots` so the composite
-- strength score is stored independently of `romantic_interest`.
--
-- Migration policy (decided in #72):
--   - Existing rows are backfilled with `signal_level` derived from the
--     pinned v1 rubric (0.4 * romantic_interest + 0.3 * desire_to_meet +
--     0.3 * initiative).
--   - Existing rows are marked `score_schema_version = 'legacy-v1'` to
--     indicate the SIGNAL LEVEL was computed by the backfill and not by the
--     runtime rubric.
--   - New writes MUST include `signal_level` and `score_schema_version`.
--     The RPC functions accept them in `p_analysis` and reject when the
--     `signal_level` is absent.

alter table public.analysis_snapshots
  add column if not exists signal_level smallint
    check (signal_level is null or signal_level between 0 and 100),
  add column if not exists score_schema_version text
    check (score_schema_version is null or char_length(btrim(score_schema_version)) between 1 and 80);

comment on column public.analysis_snapshots.signal_level is
  'Composite strength score (0-100) using the rubric pinned at score_schema_version. Distinct from romantic_interest.';
comment on column public.analysis_snapshots.score_schema_version is
  'Identifier of the score schema (e.g. signal-score-schema-v2). Rows from different versions must not be compared directly.';

-- Backfill existing snapshots with the v1 rubric so historical data is
-- always readable. The score_schema_version is tagged legacy-v1 to indicate
-- the value was not produced by the runtime computeSignalLevel().
update public.analysis_snapshots
set
  signal_level = clamp(
    round(
      0.4 * romantic_interest
      + 0.3 * desire_to_meet
      + 0.3 * initiative
    )::int,
    0, 100
  ),
  score_schema_version = coalesce(score_schema_version, 'legacy-v1')
where signal_level is null;

-- Replace the initial-relationship RPC to require signal_level and
-- score_schema_version. Older clients that omit them get a clear error.
drop function if exists public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid);

create function public.create_initial_relationship_analysis(
  p_user_id uuid,
  p_display_name text,
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
  v_relationship_id uuid;
begin
  if p_user_id is null or p_idempotency_key is null then
    raise exception 'user id and idempotency key are required' using errcode = '22023';
  end if;

  if jsonb_typeof(p_facts) <> 'array' or jsonb_array_length(p_facts) not between 3 and 10 then
    raise exception 'initial analysis requires three to ten facts' using errcode = '22023';
  end if;

  if p_analysis ? 'signalLevel' is distinct from true
    or p_analysis ? 'scoreSchemaVersion' is distinct from true
  then
    raise exception 'analysis must include signalLevel and scoreSchemaVersion' using errcode = '22023';
  end if;

  insert into public.relationships (user_id, display_name, initial_analysis_idempotency_key)
  values (p_user_id, p_display_name, p_idempotency_key)
  on conflict (initial_analysis_idempotency_key) do nothing
  returning id into v_relationship_id;

  if v_relationship_id is null then
    select id
    into v_relationship_id
    from public.relationships
    where initial_analysis_idempotency_key = p_idempotency_key
      and user_id = p_user_id;

    if v_relationship_id is null then
      raise exception 'idempotency key is already associated with another user' using errcode = '23505';
    end if;

    return v_relationship_id;
  end if;

  insert into public.facts (
    relationship_id,
    text_original,
    text_english,
    translation_version,
    translation_skipped,
    fact_validation
  )
  select
    v_relationship_id,
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
    romantic_interest,
    desire_to_meet,
    initiative,
    evidence_sufficiency,
    signal_level,
    impact_category,
    model_version,
    rubric_version,
    score_schema_version
  )
  values (
    v_relationship_id,
    (p_analysis ->> 'romanticInterest')::smallint,
    (p_analysis ->> 'desireToMeet')::smallint,
    (p_analysis ->> 'initiative')::smallint,
    (p_analysis ->> 'evidenceSufficiency')::smallint,
    (p_analysis ->> 'signalLevel')::smallint,
    null,
    p_analysis ->> 'modelVersion',
    p_analysis ->> 'rubricVersion',
    p_analysis ->> 'scoreSchemaVersion'
  );

  return v_relationship_id;
end;
$$;

revoke all on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  to service_role;

-- Replace the reanalysis RPC likewise.
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

  if p_analysis ? 'signalLevel' is distinct from true
    or p_analysis ? 'scoreSchemaVersion' is distinct from true
  then
    raise exception 'analysis must include signalLevel and scoreSchemaVersion' using errcode = '22023';
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
    signal_level,
    model_version,
    rubric_version,
    score_schema_version
  )
  values (
    p_relationship_id,
    v_previous_snapshot_id,
    p_idempotency_key,
    (p_analysis ->> 'romanticInterest')::smallint,
    (p_analysis ->> 'desireToMeet')::smallint,
    (p_analysis ->> 'initiative')::smallint,
    (p_analysis ->> 'evidenceSufficiency')::smallint,
    (p_analysis ->> 'signalLevel')::smallint,
    p_analysis ->> 'modelVersion',
    p_analysis ->> 'rubricVersion',
    p_analysis ->> 'scoreSchemaVersion'
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