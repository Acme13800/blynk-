-- Blynk: tamper-resistant record of administrator moderation decisions.
-- Run once in Supabase SQL Editor after 021_enforce_account_suspension.sql.

begin;

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('suspended', 'restored')),
  created_at timestamptz not null default now()
);

alter table public.moderation_actions enable row level security;
grant select, insert on public.moderation_actions to authenticated;

drop policy if exists "Blynk admins read moderation actions" on public.moderation_actions;
create policy "Blynk admins read moderation actions"
  on public.moderation_actions for select to authenticated
  using (public.is_blynk_admin());

drop policy if exists "Blynk admins record moderation actions" on public.moderation_actions;
create policy "Blynk admins record moderation actions"
  on public.moderation_actions for insert to authenticated
  with check (public.is_blynk_admin() and admin_id = auth.uid());

create index if not exists moderation_actions_target_created_idx
  on public.moderation_actions (target_user_id, created_at desc);

commit;
