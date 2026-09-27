-- Blynk: allows the recipient of a message to mark only its read receipt.
-- Execute once in Supabase SQL Editor.

grant update (read_at) on table public.messages to authenticated;

drop policy if exists "Blynk recipients mark messages read" on public.messages;
create policy "Blynk recipients mark messages read"
  on public.messages for update to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
