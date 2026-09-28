-- Blynk: professional safety reasons and private account notices.
-- Run once in Supabase SQL Editor after 019_admin_moderation.sql.

begin;

alter table public.blocks add column if not exists reason text;
update public.blocks set reason = 'No reason selected' where reason is null;
alter table public.blocks alter column reason set default 'No reason selected';
alter table public.blocks alter column reason set not null;

create table if not exists public.account_notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notice_type text not null check (notice_type in ('profile_suspended', 'profile_restored')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.account_notices enable row level security;
grant select, update, insert on public.account_notices to authenticated;

drop policy if exists "Blynk users read own account notices" on public.account_notices;
create policy "Blynk users read own account notices"
  on public.account_notices for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Blynk users mark own account notices read" on public.account_notices;
create policy "Blynk users mark own account notices read"
  on public.account_notices for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Blynk admins create account notices" on public.account_notices;
create policy "Blynk admins create account notices"
  on public.account_notices for insert to authenticated
  with check (public.is_blynk_admin());

create index if not exists account_notices_user_created_idx
  on public.account_notices (user_id, created_at desc);

commit;
