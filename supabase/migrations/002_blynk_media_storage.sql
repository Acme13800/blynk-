-- Compatible with the existing Blynk tables in scheme.sql.
-- Public community videos use this bucket. Uploads remain limited to each user's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blynk-media', 'blynk-media', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "Blynk users upload own media" on storage.objects;
drop policy if exists "Blynk users update own media" on storage.objects;
drop policy if exists "Blynk users delete own media" on storage.objects;
drop policy if exists "Anyone reads public Blynk media" on storage.objects;

create policy "Blynk users upload own media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'blynk-media'
  and ((storage.foldername(name))[1])::text = (auth.uid())::text
);

create policy "Anyone reads public Blynk media"
on storage.objects for select
using (bucket_id = 'blynk-media');
