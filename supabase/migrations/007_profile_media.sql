-- Blynk: fotos de perfil y galería (ejecutar una sola vez en Supabase SQL Editor)

alter table public.profiles
  add column if not exists avatar_url text;

create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists profile_media_user_created_idx
  on public.profile_media (user_id, created_at);

grant select, insert, delete on table public.profile_media to authenticated;

alter table public.profile_media enable row level security;

drop policy if exists "Blynk reads profile media" on public.profile_media;
drop policy if exists "Blynk users add own profile media" on public.profile_media;
drop policy if exists "Blynk users delete own profile media" on public.profile_media;

create policy "Blynk reads profile media"
on public.profile_media for select
using (true);

create policy "Blynk users add own profile media"
on public.profile_media for insert to authenticated
with check (auth.uid() = user_id);

create policy "Blynk users delete own profile media"
on public.profile_media for delete to authenticated
using (auth.uid() = user_id);

-- Extiende el bucket existente para aceptar también fotos de perfil y galería.
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime'
]
where id = 'blynk-media';
