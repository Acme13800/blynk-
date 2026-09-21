-- Blynk: soporte para bandeja profesional y mensajes no leídos.
alter table public.messages
  add column if not exists read_at timestamptz;

create index if not exists messages_receiver_created_at_idx
  on public.messages (receiver_id, created_at desc);

create index if not exists messages_pair_created_at_idx
  on public.messages (sender_id, receiver_id, created_at desc);

drop policy if exists "Blynk recipients mark messages read" on public.messages;
create policy "Blynk recipients mark messages read"
  on public.messages for update to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
