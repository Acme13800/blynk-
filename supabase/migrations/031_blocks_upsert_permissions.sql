-- Run in the Supabase SQL Editor. Safe to repeat; existing blocks are retained.
-- Blocking uses upsert, which needs UPDATE as well as INSERT privileges.
begin;

grant usage on schema public to authenticated;
alter table public.blocks enable row level security;
grant select, insert, update, delete on table public.blocks to authenticated;

drop policy if exists "Blynk users read own blocks" on public.blocks;
create policy "Blynk users read own blocks"
on public.blocks for select to authenticated
using (blocker_id = (select auth.uid()));

drop policy if exists "Blynk users create own blocks" on public.blocks;
create policy "Blynk users create own blocks"
on public.blocks for insert to authenticated
with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

drop policy if exists "Blynk users update own blocks" on public.blocks;
create policy "Blynk users update own blocks"
on public.blocks for update to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()) and blocked_id <> (select auth.uid()));

drop policy if exists "Blynk users remove own blocks" on public.blocks;
create policy "Blynk users remove own blocks"
on public.blocks for delete to authenticated
using (blocker_id = (select auth.uid()));

commit;
