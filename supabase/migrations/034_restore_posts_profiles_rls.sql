-- Security diagnostic on November 3, 2026 found RLS disabled on these two
-- tables, with three and four existing policies respectively.
-- Restore enforcement without deleting data, changing grants or replacing policies.
begin;
alter table public.posts enable row level security;
alter table public.profiles enable row level security;
commit;

-- Verify enforcement. Both values must be true.
select tablename, rowsecurity as rls_activado
from pg_tables
where schemaname = 'public' and tablename in ('posts', 'profiles')
order by tablename;

-- Review separately: enabling RLS does not prove existing policies are correct.
-- select tablename, policyname, permissive, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename in ('posts', 'profiles')
-- order by tablename, policyname;
