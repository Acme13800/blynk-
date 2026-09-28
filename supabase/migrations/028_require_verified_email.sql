-- Blynk: only verified accounts may appear in Discover or use social features.
begin;

alter table public.profiles
  add column if not exists email_verified_at timestamptz;

create index if not exists profiles_verified_discover_idx
  on public.profiles (email_verified_at)
  where email_verified_at is not null;

create or replace function public.blynk_profile_can_participate(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = profile_id
      and suspended_at is null
      and email_verified_at is not null
  );
$$;

revoke all on function public.blynk_profile_can_participate(uuid) from public;
grant execute on function public.blynk_profile_can_participate(uuid) to authenticated;

create or replace function public.enforce_blynk_verified_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.blynk_profile_can_participate(auth.uid()) then
    raise exception 'Confirm your email before using this Blynk feature';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_verified_account_posts on public.posts;
create trigger enforce_verified_account_posts before insert or update on public.posts for each row execute function public.enforce_blynk_verified_account();
drop trigger if exists enforce_verified_account_comments on public.comments;
create trigger enforce_verified_account_comments before insert or update on public.comments for each row execute function public.enforce_blynk_verified_account();
drop trigger if exists enforce_verified_account_likes on public.likes;
create trigger enforce_verified_account_likes before insert on public.likes for each row execute function public.enforce_blynk_verified_account();
drop trigger if exists enforce_verified_account_profile_likes on public.profile_likes;
create trigger enforce_verified_account_profile_likes before insert on public.profile_likes for each row execute function public.enforce_blynk_verified_account();
drop trigger if exists enforce_verified_account_match_requests on public.match_requests;
create trigger enforce_verified_account_match_requests before insert or update on public.match_requests for each row execute function public.enforce_blynk_verified_account();
drop trigger if exists enforce_verified_account_messages on public.messages;
create trigger enforce_verified_account_messages before insert on public.messages for each row execute function public.enforce_blynk_verified_account();

drop policy if exists "Blynk active users send match requests" on public.match_requests;
create policy "Blynk verified users send match requests"
  on public.match_requests for insert to authenticated
  with check (auth.uid() = sender_id and status = 'pending' and public.blynk_profile_can_participate(sender_id) and public.blynk_profile_can_participate(recipient_id));

drop policy if exists "Blynk active recipients respond to requests" on public.match_requests;
create policy "Blynk verified recipients respond to requests"
  on public.match_requests for update to authenticated
  using (auth.uid() = recipient_id and public.blynk_profile_can_participate(auth.uid()))
  with check (auth.uid() = recipient_id and status in ('accepted', 'rejected') and public.blynk_profile_can_participate(auth.uid()));

drop policy if exists "Blynk active participants send messages" on public.messages;
create policy "Blynk verified participants send messages"
  on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.blynk_profile_can_participate(sender_id) and public.blynk_profile_can_participate(receiver_id) and public.blynk_has_accepted_match(receiver_id));

commit;
