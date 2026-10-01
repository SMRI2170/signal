-- The server-only Secret key assumes service_role. It needs table access for
-- the atomic save function, while browser roles remain restricted by RLS.
grant select, insert, update, delete on table public.relationships to service_role;
grant select, insert, update, delete on table public.facts to service_role;
grant select, insert, update, delete on table public.analysis_snapshots to service_role;
