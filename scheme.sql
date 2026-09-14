-- BLYNK - SCHEMA COMPLETO

-- 1. Perfiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  age int,
  gender text,
  created_at timestamp with time zone default now()
);

-- 2. Videos / Posts
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  video_url text,
  caption text,
  created_at timestamp with time zone default now()
);

-- 3. Likes
create table if not exists likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

-- 4. Matches / Swipes
create table if not exists swipes (
  id uuid primary key default gen_random_uuid(),
  swiper_id uuid references profiles(id) on delete cascade,
  swiped_id uuid references profiles(id) on delete cascade,
  is_like boolean,
  created_at timestamp with time zone default now()
);

-- 5. Mensajes
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  content text,
  created_at timestamp with time zone default now()
);

-- Activar seguridad
alter table profiles enable row level security;
alter table posts enable row level security;
alter table likes enable row level security;
alter table swipes enable row level security;
alter table messages enable row level security;

-- Políticas para que todos puedan ver
create policy "public can view" on profiles for select using (true);
create policy "public can view" on posts for select using (true);
create policy "users can insert own" on profiles for insert with check (auth.uid() = id);
create policy "users can update own" on profiles for update using (auth.uid() = id);
create policy "users can insert posts" on posts for insert with check (auth.uid() = user_id);
create policy "users can insert likes" on likes for all using (true) with check (true);
create policy "users can swipe" on swipes for all using (true) with check (true);
create policy "users can message" on messages for all using (true) with check (true);