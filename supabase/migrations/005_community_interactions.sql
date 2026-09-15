-- Persistent comments and likes for the Blynk community feed.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 1000),
  created_at timestamptz not null default now()
);

grant usage on schema public to anon, authenticated;
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
