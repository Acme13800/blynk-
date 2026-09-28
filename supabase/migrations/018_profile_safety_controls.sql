-- Blynk: bloqueo y reportes reales desde Descubrir.
-- Ejecutar una sola vez en Supabase SQL Editor.

begin;

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now()
);

alter table public.blocks enable row level security;
grant select, insert, delete on table public.blocks to authenticated;

drop policy if exists "users manage their blocks" on public.blocks;
drop policy if exists "Blynk users read own blocks" on public.blocks;
create policy "Blynk users read own blocks"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

drop policy if exists "Blynk users create own blocks" on public.blocks;
create policy "Blynk users create own blocks"
  on public.blocks for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists "Blynk users remove own blocks" on public.blocks;
create policy "Blynk users remove own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

alter table public.reports enable row level security;
grant insert on table public.reports to authenticated;

drop policy if exists "users create reports" on public.reports;
drop policy if exists "Blynk users create profile reports" on public.reports;
create policy "Blynk users create profile reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());

create index if not exists reports_target_user_created_idx
  on public.reports (target_user_id, created_at desc);

commit;
