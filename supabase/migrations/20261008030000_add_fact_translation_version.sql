-- #78 JP→EN translation pipeline support.
--
-- Adds `translation_version` so an audit log of which translator
-- implementation produced each `text_english` is preserved. Also records
-- the translation's `skipped` flag (e.g. when NoOpTranslator is in use)
-- so audits can detect production paths that bypassed translation.

alter table public.facts
  add column if not exists translation_version text
    check (translation_version is null or char_length(btrim(translation_version)) between 1 and 80),
  add column if not exists translation_skipped boolean not null default true;

-- The default of `true` on translation_skipped mirrors the historical
-- behaviour where translation was never performed (text_english was null).
-- New rows inserted from the translator pipeline must set it to false.

comment on column public.facts.translation_version is
  'Identifier of the translator implementation that produced text_english (e.g. signal-translator-jev-v1).';
comment on column public.facts.translation_skipped is
  'True when translation was bypassed (NoOp or static demo). Production must set this false.';

-- Existing rows have no translator; mark them as skipped for transparency.
update public.facts
  set translation_skipped = true
  where translation_skipped is null;

-- Allow server-side service_role to insert with translation metadata.
-- (RLS already gates authenticated reads; service_role writes via the
-- existing RPC functions. This migration only widens the data shape.)

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
    impact_category,
    model_version,
    rubric_version
  )
  values (
    v_relationship_id,
    (p_analysis ->> 'romanticInterest')::smallint,
    (p_analysis ->> 'desireToMeet')::smallint,
    (p_analysis ->> 'initiative')::smallint,
    (p_analysis ->> 'evidenceSufficiency')::smallint,
    null,
    p_analysis ->> 'modelVersion',
    p_analysis ->> 'rubricVersion'
  );

  return v_relationship_id;
end;
$$;

revoke all on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  to service_role;