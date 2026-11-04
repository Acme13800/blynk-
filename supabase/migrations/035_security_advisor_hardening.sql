-- Blynk: reviewed against the Security Advisor export of November 3, 2026.
-- Apply in Supabase SQL Editor after 034. Retains existing rows and files.
begin;

-- 1. Replace the original unrestricted ALL policy with owner-only access.
alter table public.swipes enable row level security;
drop policy if exists "users can swipe" on public.swipes;
create policy "users can swipe"
on public.swipes for all to authenticated
using (swiper_id = (select auth.uid()))
with check (
  swiper_id = (select auth.uid())
  and swiped_id is not null
  and swiped_id <> (select auth.uid())
);
revoke all on public.swipes from anon;
grant select, insert, update, delete on public.swipes to authenticated;

-- 2. Public object URLs do not require an unrestricted SELECT listing policy.
-- Keep SELECT for the owner's UUID folder for their own storage operations.
-- This does NOT make existing public URLs private.
drop policy if exists "Anyone reads public Blynk media" on storage.objects;
drop policy if exists "Blynk owners read own media objects" on storage.objects;
create policy "Blynk owners read own media objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'blynk-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 3. Trigger functions are called by their existing database triggers, not RPC.
-- Retain SECURITY DEFINER and the triggers themselves.
revoke execute on function public.enforce_blynk_active_account()
from public, anon, authenticated;
revoke execute on function public.enforce_blynk_verified_account()
from public, anon, authenticated;
revoke execute on function public.protect_blynk_moderation_fields()
from public, anon, authenticated;

-- 4. Admin checks require a signed-in caller; they remain usable in RLS.
revoke execute on function public.is_blynk_admin() from public, anon;
grant execute on function public.is_blynk_admin() to authenticated;

commit;

-- Verify narrow swipes/storage predicates.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'swipes')
   or (schemaname = 'storage' and policyname in (
     'Anyone reads public Blynk media', 'Blynk owners read own media objects'))
order by schemaname, tablename, policyname;

-- Trigger functions: both columns should be false.
-- is_blynk_admin: anon false, authenticated true (intentional).
select p.proname as function_name,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as signed_in_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.pronargs = 0
  and p.proname in ('enforce_blynk_active_account',
    'enforce_blynk_verified_account', 'protect_blynk_moderation_fields',
    'is_blynk_admin')
order by p.proname;
