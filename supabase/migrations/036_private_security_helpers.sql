begin;

-- Apply after 035. Preserve existing helper definitions and policy dependencies.
create schema if not exists blynk_private;
revoke all on schema blynk_private from public, anon;
grant usage on schema blynk_private to authenticated, service_role;

do $$
declare
  item record;
  original_oid oid;
  private_oid oid;
  exposed_schemas text := current_setting('pgrst.db_schemas', true);
begin
  if 'blynk_private' = any(regexp_split_to_array(coalesce(exposed_schemas, ''), '\s*,\s*')) then
    raise exception 'Remove blynk_private from the Data API exposed schemas before applying this migration';
  end if;
  for item in select * from (values
    ('blynk_can_contact', 'uuid'),
    ('blynk_has_accepted_match', 'uuid'),
    ('blynk_profile_can_participate', 'uuid'),
    ('blynk_profile_is_active', 'uuid'),
    ('is_blynk_admin', '')
  ) as helpers(function_name, arguments)
  loop
    original_oid := to_regprocedure(format('public.%I(%s)', item.function_name, item.arguments));
    private_oid := to_regprocedure(format('blynk_private.%I(%s)', item.function_name, item.arguments));
    if private_oid is null then
      if original_oid is null or not (select prosecdef from pg_proc where oid = original_oid) then
        raise exception 'Expected original SECURITY DEFINER function is missing: %', item.function_name;
      end if;
      execute format('alter function public.%I(%s) set schema blynk_private', item.function_name, item.arguments);
    elsif original_oid is not null and (select prosecdef from pg_proc where oid = original_oid) then
      raise exception 'Conflicting public and private definitions: %', item.function_name;
    end if;
    execute format('revoke all on function blynk_private.%I(%s) from public, anon', item.function_name, item.arguments);
    execute format('grant execute on function blynk_private.%I(%s) to authenticated, service_role', item.function_name, item.arguments);
  end loop;
end;
$$;

-- Stored RLS expressions retain the original function OIDs after SET SCHEMA.
-- PL/pgSQL source references, however, must be redirected explicitly.
do $$
declare
  fn record;
  helper_name text;
  original_definition text;
  updated_definition text;
begin
  for fn in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    original_definition := pg_get_functiondef(fn.oid);
    updated_definition := original_definition;
    foreach helper_name in array array['blynk_has_accepted_match',
      'blynk_profile_can_participate', 'blynk_profile_is_active', 'is_blynk_admin']
    loop
      updated_definition := replace(updated_definition,
        'public.' || helper_name || '(', 'blynk_private.' || helper_name || '(');
    end loop;
    if updated_definition <> original_definition then
      execute updated_definition;
    end if;
  end loop;
end;
$$;

-- The app calls only this helper via RPC. Keep its API name/argument unchanged.
-- This wrapper has no elevated privileges of its own; checks remain caller-relative.
create or replace function public.blynk_can_contact(target_profile_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select blynk_private.blynk_can_contact(target_profile_id);
$$;
revoke all on function public.blynk_can_contact(uuid) from public, anon;
grant execute on function public.blynk_can_contact(uuid) to authenticated, service_role;

-- Abort rather than commit an unexpected permission state.
do $$
declare
  helper_count integer;
begin
  select count(*) into helper_count
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'blynk_private' and p.prosecdef
    and p.proname in ('blynk_can_contact', 'blynk_has_accepted_match',
      'blynk_profile_can_participate', 'blynk_profile_is_active', 'is_blynk_admin');
  if helper_count <> 5 then raise exception 'Expected five private security helpers'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and p.proname in ('blynk_can_contact', 'blynk_has_accepted_match',
        'blynk_profile_can_participate', 'blynk_profile_is_active', 'is_blynk_admin')
  ) then raise exception 'Privileged helper still exposed in public'; end if;
end;
$$;

notify pgrst, 'reload schema';
commit;

select n.nspname as schema_name, p.proname as function_name,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as signed_in_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'blynk_private')
  and p.proname in ('blynk_can_contact', 'blynk_has_accepted_match',
    'blynk_profile_can_participate', 'blynk_profile_is_active', 'is_blynk_admin')
order by n.nspname, p.proname;
