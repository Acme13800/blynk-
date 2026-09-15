-- Private match requests and messages for Blynk.
create table if not exists public.match_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (sender_id, recipient_id),
  check (sender_id <> recipient_id)
);

grant usage on schema public to authenticated;
grant select, insert, update on table public.match_requests to authenticated;
grant select, insert on table public.messages to authenticated;

alter table public.match_requests enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Blynk participants read match requests" on public.match_requests;
drop policy if exists "Blynk users send match requests" on public.match_requests;
drop policy if exists "Blynk recipients respond to requests" on public.match_requests;
drop policy if exists "users can message" on public.messages;
drop policy if exists "Blynk participants read messages" on public.messages;
drop policy if exists "Blynk participants send messages" on public.messages;

create policy "Blynk participants read match requests"
on public.match_requests for select to authenticated
using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Blynk users send match requests"
on public.match_requests for insert to authenticated
with check (auth.uid() = sender_id and status = 'pending');

create policy "Blynk recipients respond to requests"
on public.match_requests for update to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id and status in ('accepted', 'rejected'));

create policy "Blynk participants read messages"
on public.messages for select to authenticated
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Blynk participants send messages"
on public.messages for insert to authenticated
with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.match_requests request
    where request.status = 'accepted'
      and ((request.sender_id = sender_id and request.recipient_id = receiver_id)
        or (request.recipient_id = sender_id and request.sender_id = receiver_id))
  )
);
