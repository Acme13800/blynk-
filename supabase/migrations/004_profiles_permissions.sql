-- Lets each signed-in user create and update only their own Blynk profile.
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant select on table public.profiles to anon;

alter table public.profiles enable row level security;

drop policy if exists "public can view" on public.profiles;
drop policy if exists "users can insert own" on public.profiles;
drop policy if exists "users can update own" on public.profiles;
drop policy if exists "Blynk reads profiles" on public.profiles;
drop policy if exists "Blynk users create their own profile" on public.profiles;
drop policy if exists "Blynk users update their own profile" on public.profiles;

create policy "Blynk reads profiles"
on public.profiles for select
using (true);

create policy "Blynk users create their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Blynk users update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
