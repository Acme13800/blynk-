-- Blynk MVP: execute this file in Supabase SQL Editor once per project.
create type public.content_visibility as enum ('public', 'private', 'hidden');
create type public.match_state as enum ('pending', 'accepted', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  bio text default '' check (char_length(bio) <= 500),
  avatar_path text,
  locale text not null default 'es' check (locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  position smallint not null default 0 check (position between 0 and 5),
  visibility public.content_visibility not null default 'public',
  created_at timestamptz not null default now(),
  unique (user_id, position)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text check (char_length(body) <= 3000),
  media_path text,
  media_type text check (media_type in ('image', 'video')),
  visibility public.content_visibility not null default 'public',
  comments_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (body is not null or media_path is not null)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid references public.profiles(id) on delete cascade,
  blocked_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  created_at timestamptz not null default now(),
  check (target_user_id is not null or comment_id is not null)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  state public.match_state not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, recipient_id),
  check (requester_id <> recipient_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.profile_media enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;

create policy "public profiles are readable" on public.profiles for select using (true);
create policy "users create their profile" on public.profiles for insert with check (id = auth.uid());
create policy "users update their profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "public profile media is readable" on public.profile_media for select using (visibility = 'public' or user_id = auth.uid());
create policy "owners manage profile media" on public.profile_media for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "public posts are readable" on public.posts for select using (visibility = 'public' or author_id = auth.uid());
create policy "owners manage posts" on public.posts for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "comments are readable when visible" on public.comments for select using (hidden = false or author_id = auth.uid());
create policy "authenticated users comment" on public.comments for insert with check (author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and p.comments_enabled));
create policy "authors manage comments" on public.comments for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors delete comments" on public.comments for delete using (author_id = auth.uid());
create policy "users manage their blocks" on public.blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy "users create reports" on public.reports for insert with check (reporter_id = auth.uid());
create policy "participants view matches" on public.matches for select using (requester_id = auth.uid() or recipient_id = auth.uid());
create policy "users request matches" on public.matches for insert with check (requester_id = auth.uid());
create policy "recipients respond to matches" on public.matches for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "accepted match participants read messages" on public.messages for select using (exists (select 1 from public.matches m where m.id = match_id and m.state = 'accepted' and auth.uid() in (m.requester_id, m.recipient_id)));
create policy "accepted match participants send messages" on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.matches m where m.id = match_id and m.state = 'accepted' and auth.uid() in (m.requester_id, m.recipient_id)));

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), null)
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.create_profile_for_new_user();
