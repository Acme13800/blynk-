-- Blynk: comentarios profesionales, respuestas y moderación.
-- Ejecuta este archivo UNA vez en Supabase SQL Editor.

alter table public.posts
  add column if not exists comments_enabled boolean not null default true;

alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references public.profiles(id) on delete set null;

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'User report' check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

create index if not exists comments_post_created_idx on public.comments (post_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);
create index if not exists comment_reports_comment_idx on public.comment_reports (comment_id);

grant select, update on public.posts to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant insert on public.comment_reports to authenticated;

alter table public.comment_reports enable row level security;

drop policy if exists "Blynk users update own posts" on public.posts;
create policy "Blynk users update own posts"
on public.posts for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Blynk comment authors and post owners moderate comments" on public.comments;
create policy "Blynk comment authors and post owners moderate comments"
on public.comments for update to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.posts
    where posts.id = comments.post_id and posts.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  or exists (
    select 1 from public.posts
    where posts.id = comments.post_id and posts.user_id = auth.uid()
  )
);

drop policy if exists "Blynk users report comments" on public.comment_reports;
create policy "Blynk users report comments"
on public.comment_reports for insert to authenticated
with check (reporter_id = auth.uid());
