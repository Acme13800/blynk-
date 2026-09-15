-- ONE-TIME SETUP FOR BLYNK PROJECTS THAT ALREADY RAN scheme.sql.
-- Safe to re-run: it updates grants and replaces only Blynk's named policies.

-- 1. Video storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blynk-media', 'blynk-media', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Blynk users upload own media" on storage.objects;
drop policy if exists "Blynk users update own media" on storage.objects;
drop policy if exists "Blynk users delete own media" on storage.objects;
drop policy if exists "Anyone reads public Blynk media" on storage.objects;

create policy "Blynk users upload own media" on storage.objects for insert to authenticated
with check (bucket_id = 'blynk-media' and ((storage.foldername(name))[1])::text = (auth.uid())::text);
create policy "Anyone reads public Blynk media" on storage.objects for select using (bucket_id = 'blynk-media');

-- 2. Posts and profiles
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.posts to authenticated;
grant select on table public.posts to anon;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

alter table public.posts enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "public can view" on public.posts;
drop policy if exists "users can insert posts" on public.posts;
drop policy if exists "Blynk reads community posts" on public.posts;
drop policy if exists "Blynk users create their own posts" on public.posts;
create policy "Blynk reads community posts" on public.posts for select using (true);
create policy "Blynk users create their own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "public can view" on public.profiles;
drop policy if exists "users can insert own" on public.profiles;
drop policy if exists "users can update own" on public.profiles;
drop policy if exists "Blynk reads profiles" on public.profiles;
drop policy if exists "Blynk users create their own profile" on public.profiles;
drop policy if exists "Blynk users update their own profile" on public.profiles;
create policy "Blynk reads profiles" on public.profiles for select using (true);
create policy "Blynk users create their own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Blynk users update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 3. Community likes and comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

grant select on table public.comments, public.likes to anon;
grant select, insert, delete on table public.comments, public.likes to authenticated;
alter table public.comments enable row level security;
alter table public.likes enable row level security;

drop policy if exists "Blynk reads comments" on public.comments;
drop policy if exists "Blynk users write comments" on public.comments;
drop policy if exists "Blynk users delete own comments" on public.comments;
drop policy if exists "users can insert likes" on public.likes;
drop policy if exists "Blynk reads likes" on public.likes;
drop policy if exists "Blynk users like posts" on public.likes;
drop policy if exists "Blynk users remove own likes" on public.likes;

create policy "Blynk reads comments" on public.comments for select using (true);
create policy "Blynk users write comments" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Blynk users delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);
create policy "Blynk reads likes" on public.likes for select using (true);
create policy "Blynk users like posts" on public.likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Blynk users remove own likes" on public.likes for delete to authenticated using (auth.uid() = user_id);
