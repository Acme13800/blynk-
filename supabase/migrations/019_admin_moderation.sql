-- Blynk: private administrator access and profile suspension.
-- Run once in Supabase SQL Editor, then add your admin account with the separate command below.

begin;

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_blynk_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

grant execute on function public.is_blynk_admin() to authenticated;

alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;
drop policy if exists "Blynk admins read own role" on public.admin_users;
create policy "Blynk admins read own role"
  on public.admin_users for select to authenticated
  using (user_id = auth.uid());

alter table public.profiles add column if not exists suspended_at timestamptz;

create or replace function public.protect_blynk_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_blynk_admin()
     and new.suspended_at is distinct from old.suspended_at then
    raise exception 'Only a Blynk administrator may change suspension status';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_blynk_moderation_fields on public.profiles;
create trigger protect_blynk_moderation_fields
before update on public.profiles
for each row execute function public.protect_blynk_moderation_fields();

drop policy if exists "Blynk admins moderate profiles" on public.profiles;
create policy "Blynk admins moderate profiles"
  on public.profiles for update to authenticated
  using (public.is_blynk_admin())
  with check (public.is_blynk_admin());

alter table public.reports enable row level security;
grant select on public.reports to authenticated;
drop policy if exists "Blynk admins read reports" on public.reports;
create policy "Blynk admins read reports"
  on public.reports for select to authenticated
  using (public.is_blynk_admin());

commit;

-- After this migration succeeds, run this separate command once.
-- Replace YOUR-EMAIL@example.com with the email of YOUR Blynk admin account:
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'YOUR-EMAIL@example.com'
-- on conflict (user_id) do nothing;
