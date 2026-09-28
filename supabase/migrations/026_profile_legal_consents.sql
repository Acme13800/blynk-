-- Blynk: record explicit legal consent when a member completes onboarding.
begin;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz;

create index if not exists profiles_legal_consent_idx
  on public.profiles (terms_accepted_at, privacy_accepted_at)
  where terms_accepted_at is not null and privacy_accepted_at is not null;

commit;
