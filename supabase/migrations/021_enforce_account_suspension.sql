-- Blynk: enforce account suspension at the database layer.
-- Run once in Supabase SQL Editor after 020_moderation_reasons_and_notices.sql.

begin;

create or replace function public.blynk_profile_is_active(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = profile_id and suspended_at is null
  );
$$;

revoke all on function public.blynk_profile_is_active(uuid) from public;
grant execute on function public.blynk_profile_is_active(uuid) to authenticated;

-- A trigger closes policy gaps and also protects future UI entry points.
create or replace function public.enforce_blynk_active_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.blynk_profile_is_active(auth.uid()) then
    raise exception 'This account is suspended and cannot perform this action';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_active_account_posts on public.posts;
create trigger enforce_active_account_posts before insert or update on public.posts
for each row execute function public.enforce_blynk_active_account();

drop trigger if exists enforce_active_account_comments on public.comments;
create trigger enforce_active_account_comments before insert or update on public.comments
for each row execute function public.enforce_blynk_active_account();

drop trigger if exists enforce_active_account_likes on public.likes;
create trigger enforce_active_account_likes before insert on public.likes
for each row execute function public.enforce_blynk_active_account();

drop trigger if exists enforce_active_account_profile_likes on public.profile_likes;
create trigger enforce_active_account_profile_likes before insert on public.profile_likes
for each row execute function public.enforce_blynk_active_account();

drop trigger if exists enforce_active_account_match_requests on public.match_requests;
create trigger enforce_active_account_match_requests before insert or update on public.match_requests
for each row execute function public.enforce_blynk_active_account();

drop trigger if exists enforce_active_account_messages on public.messages;
create trigger enforce_active_account_messages before insert on public.messages
for each row execute function public.enforce_blynk_active_account();

-- Community: a suspended account can read, but cannot create content or reactions.
drop policy if exists "Blynk users create their own posts" on public.posts;
create policy "Blynk active users create their own posts"
  on public.posts for insert to authenticated
  with check (auth.uid() = user_id and public.blynk_profile_is_active(auth.uid()));

drop policy if exists "Blynk users write comments" on public.comments;
create policy "Blynk active users write comments"
  on public.comments for insert to authenticated
  with check (auth.uid() = user_id and public.blynk_profile_is_active(auth.uid()));

drop policy if exists "Blynk users like posts" on public.likes;
create policy "Blynk active users like posts"
  on public.likes for insert to authenticated
  with check (auth.uid() = user_id and public.blynk_profile_is_active(auth.uid()));

drop policy if exists "Users like profiles" on public.profile_likes;
create policy "Active users like profiles"
  on public.profile_likes for insert to authenticated
  with check (auth.uid() = user_id and public.blynk_profile_is_active(auth.uid()));

-- Matches: suspended accounts cannot start or accept a match.
drop policy if exists "Blynk users send match requests" on public.match_requests;
create policy "Blynk active users send match requests"
  on public.match_requests for insert to authenticated
  with check (auth.uid() = sender_id and status = 'pending' and public.blynk_profile_is_active(auth.uid()) and public.blynk_profile_is_active(recipient_id));

drop policy if exists "Blynk recipients respond to requests" on public.match_requests;
create policy "Blynk active recipients respond to requests"
  on public.match_requests for update to authenticated
  using (auth.uid() = recipient_id and public.blynk_profile_is_active(auth.uid()))
  with check (auth.uid() = recipient_id and status in ('accepted', 'rejected') and public.blynk_profile_is_active(auth.uid()));

-- Messages: both participants must be active and have an accepted match.
drop policy if exists "Blynk participants send messages" on public.messages;
create policy "Blynk active participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.blynk_profile_is_active(sender_id)
    and public.blynk_profile_is_active(receiver_id)
    and public.blynk_has_accepted_match(receiver_id)
  );

commit;
