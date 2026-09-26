-- Blynk: allow an accepted match to share a text message, photo, or short video.
-- Execute once in Supabase SQL Editor.

alter table public.messages
  add column if not exists media_url text,
  add column if not exists media_type text check (media_type is null or media_type in ('image', 'video'));

alter table public.messages
  alter column content drop not null;

alter table public.messages
  drop constraint if exists messages_content_or_media;

alter table public.messages
  add constraint messages_content_or_media
  check (nullif(trim(coalesce(content, '')), '') is not null or media_url is not null);

create index if not exists messages_media_created_at_idx
  on public.messages (created_at desc)
  where media_url is not null;
