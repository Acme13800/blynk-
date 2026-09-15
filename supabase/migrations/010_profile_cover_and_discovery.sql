-- Blynk: foto de fondo, ubicación privada y likes únicos de perfiles.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.profiles
  add column if not exists cover_url text,
  add column if not exists city text,
  add column if not exists discovery_radius_km integer not null default 50
    check (discovery_radius_km between 1 and 500);

create table if not exists public.profile_likes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id),
  check (profile_id <> user_id)
);

alter table public.profile_likes enable row level security;

drop policy if exists "Anyone reads profile likes" on public.profile_likes;
create policy "Anyone reads profile likes"
  on public.profile_likes for select using (true);

drop policy if exists "Users like profiles" on public.profile_likes;
create policy "Users like profiles"
  on public.profile_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users remove own profile likes" on public.profile_likes;
create policy "Users remove own profile likes"
  on public.profile_likes for delete using (auth.uid() = user_id);
