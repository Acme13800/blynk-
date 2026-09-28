-- Blynk: private administrative response for each account-review request.
begin;

alter table public.account_appeals
  add column if not exists admin_response text,
  add column if not exists responded_at timestamptz,
  add column if not exists responded_by uuid references public.profiles(id);

alter table public.account_appeals
  drop constraint if exists account_appeals_admin_response_length;

alter table public.account_appeals
  add constraint account_appeals_admin_response_length
  check (admin_response is null or char_length(admin_response) between 1 and 1000);

commit;
