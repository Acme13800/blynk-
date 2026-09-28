-- Blynk: user-managed block list and account-suspension appeals.
-- Run once in Supabase SQL Editor after 022_moderation_audit_log.sql.

begin;

create table if not exists public.account_appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 20 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists account_appeals_one_pending_idx
  on public.account_appeals (user_id) where status = 'pending';
create index if not exists account_appeals_status_created_idx
  on public.account_appeals (status, created_at asc);

alter table public.account_appeals enable row level security;
grant select, insert, update on public.account_appeals to authenticated;

drop policy if exists "Blynk users read own appeals" on public.account_appeals;
create policy "Blynk users read own appeals"
  on public.account_appeals for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Blynk users create own appeals" on public.account_appeals;
create policy "Blynk users create own appeals"
  on public.account_appeals for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists "Blynk admins review appeals" on public.account_appeals;
create policy "Blynk admins review appeals"
  on public.account_appeals for update to authenticated
  using (public.is_blynk_admin())
  with check (public.is_blynk_admin());

drop policy if exists "Blynk admins read appeals" on public.account_appeals;
create policy "Blynk admins read appeals"
  on public.account_appeals for select to authenticated
  using (public.is_blynk_admin());

commit;
