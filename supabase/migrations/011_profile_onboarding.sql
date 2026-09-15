-- Blynk onboarding fields. Run once in Supabase SQL Editor.
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists pronouns text,
  add column if not exists connection_intent text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists onboarding_completed boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_birth_date_adult;

alter table public.profiles
  add constraint profiles_birth_date_adult
  check (birth_date is null or birth_date <= current_date - interval '18 years');
