-- Apply after 031 in Supabase SQL Editor. Retains messages and existing matches.
begin;

-- Only exposes whether the caller can contact the target, never who blocked whom.
create or replace function public.blynk_can_contact(target_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and target_profile_id is not null
    and target_profile_id <> auth.uid()
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = target_profile_id)
         or (b.blocked_id = auth.uid() and b.blocker_id = target_profile_id)
    );
$$;
revoke all on function public.blynk_can_contact(uuid) from public;
grant execute on function public.blynk_can_contact(uuid) to authenticated;

-- Enforce independently of older permissive RLS policies and already-open chats.
create or replace function public.enforce_blynk_contact_blocks()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  target_id uuid;
begin
  if tg_table_name = 'messages' then
    target_id := new.receiver_id;
  else
    if new.status not in ('pending', 'accepted') then return new; end if;
    target_id := new.recipient_id;
  end if;
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = target_id)
       or (b.blocked_id = new.sender_id and b.blocker_id = target_id)
  ) then
    raise exception using errcode = '42501', message = 'BLYNK_CONVERSATION_UNAVAILABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_blynk_contact_blocks() from public;

drop trigger if exists enforce_contact_blocks_messages on public.messages;
create trigger enforce_contact_blocks_messages before insert on public.messages
for each row execute function public.enforce_blynk_contact_blocks();

drop trigger if exists enforce_contact_blocks_requests on public.match_requests;
create trigger enforce_contact_blocks_requests before insert or update on public.match_requests
for each row execute function public.enforce_blynk_contact_blocks();

commit;
