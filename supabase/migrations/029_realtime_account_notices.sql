-- Blynk: deliver account-safety notices to the open browser in real time.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'account_notices'
  ) then
    alter publication supabase_realtime add table public.account_notices;
  end if;
end $$;
