-- Blynk: notify a suspended member when an account-review request is denied.
begin;

alter table public.account_notices
  drop constraint if exists account_notices_notice_type_check;

alter table public.account_notices
  add constraint account_notices_notice_type_check
  check (notice_type in ('profile_suspended', 'profile_restored', 'appeal_denied'));

commit;
