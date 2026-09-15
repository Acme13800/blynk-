-- Blynk: un video de presentación público por perfil.
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.profiles
  add column if not exists presentation_video_url text;
