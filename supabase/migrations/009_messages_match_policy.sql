-- Blynk: permite mensajes solo entre dos personas con un match aceptado.
-- Ejecutar una sola vez en Supabase SQL Editor.

create or replace function public.blynk_has_accepted_match(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.match_requests request
    where request.status = 'accepted'
      and (
        (request.sender_id = auth.uid() and request.recipient_id = target_profile_id)
        or (request.recipient_id = auth.uid() and request.sender_id = target_profile_id)
      )
  );
$$;

revoke all on function public.blynk_has_accepted_match(uuid) from public;
grant execute on function public.blynk_has_accepted_match(uuid) to authenticated;

drop policy if exists "Blynk participants send messages" on public.messages;

create policy "Blynk participants send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.blynk_has_accepted_match(receiver_id)
);
