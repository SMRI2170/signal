alter table public.analysis_snapshots
  add column fact_count integer;

update public.analysis_snapshots as snapshots
set fact_count = (
  select count(*)::integer
  from public.facts
  where facts.relationship_id = snapshots.relationship_id
    and facts.created_at <= snapshots.created_at
);

alter table public.analysis_snapshots
  alter column fact_count set not null,
  add constraint analysis_snapshots_fact_count_positive check (fact_count > 0);

create function public.set_analysis_snapshot_fact_count()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select count(*)::integer
  into new.fact_count
  from public.facts
  where facts.relationship_id = new.relationship_id;

  if new.fact_count < 1 then
    raise exception 'snapshot requires at least one fact' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger analysis_snapshots_set_fact_count
before insert on public.analysis_snapshots
for each row execute function public.set_analysis_snapshot_fact_count();

revoke all on function public.set_analysis_snapshot_fact_count() from public, anon, authenticated;
