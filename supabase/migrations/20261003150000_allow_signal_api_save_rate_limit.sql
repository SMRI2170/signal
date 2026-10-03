alter table public.signal_api_rate_limits
  drop constraint signal_api_rate_limits_scope;

alter table public.signal_api_rate_limits
  add constraint signal_api_rate_limits_scope
  check (scope in ('validate', 'preview', 'save'));

create or replace function public.consume_signal_api_rate_limit(
  p_client_hash text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_request_count integer;
begin
  if char_length(p_client_hash) <> 64
    or p_scope not in ('validate', 'preview', 'save')
    or p_limit < 1
    or p_window_seconds < 1
  then
    raise exception 'invalid rate-limit parameters' using errcode = '22023';
  end if;

  insert into public.signal_api_rate_limits (
    client_hash,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_client_hash, p_scope, v_now, 1, v_now)
  on conflict (client_hash, scope) do update
  set
    request_count = case
      when signal_api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else signal_api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when signal_api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else signal_api_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_request_count;

  return v_request_count <= p_limit;
end;
$$;
