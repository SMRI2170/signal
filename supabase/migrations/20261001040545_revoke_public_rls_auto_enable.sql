-- This event-trigger helper is installed by the project bootstrap to enable RLS
-- on newly created public tables. It must not be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
