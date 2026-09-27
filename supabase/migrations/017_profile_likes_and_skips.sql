-- Blynk: permisos de likes y descartes persistentes en Descubrir.
-- Ejecutar una vez en Supabase SQL Editor.

begin;

grant select, insert, delete on table public.profile_likes to authenticated;

alter table public.profile_likes enable row level security;

drop policy if exists "Anyone reads profile likes" on public.profile_likes;
drop policy if exists "Authenticated users read profile likes" on public.profile_likes;
create policy "Authenticated users read profile likes"
  on public.profile_likes for select to authenticated
  using (true);

drop policy if exists "Users like profiles" on public.profile_likes;
create policy "Users like profiles"
  on public.profile_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users remove own profile likes" on public.profile_likes;
create policy "Users remove own profile likes"
  on public.profile_likes for delete to authenticated
  using (auth.uid() = user_id);

create table if not exists public.profile_skips (
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id),
  check (user_id <> profile_id)
);

alter table public.profile_skips enable row level security;
grant select, insert, update, delete on table public.profile_skips to authenticated;

drop policy if exists "Users read own profile skips" on public.profile_skips;
create policy "Users read own profile skips"
  on public.profile_skips for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users create own profile skips" on public.profile_skips;
create policy "Users create own profile skips"
  on public.profile_skips for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own profile skips" on public.profile_skips;
create policy "Users update own profile skips"
  on public.profile_skips for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users remove own profile skips" on public.profile_skips;
create policy "Users remove own profile skips"
  on public.profile_skips for delete to authenticated
  using (auth.uid() = user_id);

commit;
