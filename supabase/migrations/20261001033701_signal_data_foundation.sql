create type public.fact_validation_status as enum (
  'observable',
  'interpretation',
  'unclear'
);

create type public.impact_category as enum (
  'strong_positive',
  'positive',
  'neutral',
  'negative',
  'strong_negative'
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  initial_analysis_idempotency_key uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facts (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  text_original text not null check (char_length(btrim(text_original)) between 10 and 300),
  text_english text,
  fact_validation public.fact_validation_status not null default 'observable',
  created_at timestamptz not null default now(),
  constraint facts_observable_only check (fact_validation = 'observable')
);

create table public.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  romantic_interest smallint not null check (romantic_interest between 0 and 100),
  desire_to_meet smallint not null check (desire_to_meet between 0 and 100),
  initiative smallint not null check (initiative between 0 and 100),
  evidence_sufficiency smallint not null check (evidence_sufficiency between 0 and 100),
  impact_category public.impact_category,
  model_version text not null check (char_length(btrim(model_version)) between 1 and 100),
  rubric_version text not null check (char_length(btrim(rubric_version)) between 1 and 100),
  created_at timestamptz not null default now()
);

create index relationships_user_id_created_at_idx
  on public.relationships (user_id, created_at desc);
create index facts_relationship_id_created_at_idx
  on public.facts (relationship_id, created_at desc);
create index analysis_snapshots_relationship_id_created_at_idx
  on public.analysis_snapshots (relationship_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger relationships_set_updated_at
before update on public.relationships
for each row execute function public.set_updated_at();

alter table public.relationships enable row level security;
alter table public.facts enable row level security;
alter table public.analysis_snapshots enable row level security;

revoke all on table public.relationships from anon, authenticated;
revoke all on table public.facts from anon, authenticated;
revoke all on table public.analysis_snapshots from anon, authenticated;

grant select, update, delete on table public.relationships to authenticated;
grant select on table public.facts to authenticated;
grant select on table public.analysis_snapshots to authenticated;

create policy "Owners can read their relationships"
on public.relationships for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners can rename their relationships"
on public.relationships for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Owners can delete their relationships"
on public.relationships for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners can read facts in their relationships"
on public.facts for select
to authenticated
using (
  exists (
    select 1
    from public.relationships
    where relationships.id = facts.relationship_id
      and relationships.user_id = (select auth.uid())
  )
);

create policy "Owners can read snapshots in their relationships"
on public.analysis_snapshots for select
to authenticated
using (
  exists (
    select 1
    from public.relationships
    where relationships.id = analysis_snapshots.relationship_id
      and relationships.user_id = (select auth.uid())
  )
);

-- Called only from a server Route Handler using the server-only secret key.
-- The function is security invoker and is deliberately unavailable to browser roles.
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

  insert into public.facts (relationship_id, text_original, text_english, fact_validation)
  select
    v_relationship_id,
    item.text_original,
    item.text_english,
    'observable'::public.fact_validation_status
  from jsonb_to_recordset(p_facts) as item(text_original text, text_english text);

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

revoke all on function public.set_updated_at() from public;
revoke all on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)
  to service_role;
