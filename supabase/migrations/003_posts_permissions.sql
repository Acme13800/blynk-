-- Allows authenticated Blynk users to publish and read community posts.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.posts to authenticated;
grant select on table public.posts to anon;

alter table public.posts enable row level security;

drop policy if exists "public can view" on public.posts;
drop policy if exists "users can insert posts" on public.posts;
drop policy if exists "Blynk reads community posts" on public.posts;
drop policy if exists "Blynk users create their own posts" on public.posts;

create policy "Blynk reads community posts"
on public.posts for select
using (true);

create policy "Blynk users create their own posts"
on public.posts for insert to authenticated
with check (auth.uid() = user_id);
