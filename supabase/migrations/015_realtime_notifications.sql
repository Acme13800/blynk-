-- Blynk: publish message and match-request changes to Supabase Realtime.
-- Execute once in Supabase SQL Editor.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_requests'
  ) then
    alter publication supabase_realtime add table public.match_requests;
  end if;
end;
$$;
