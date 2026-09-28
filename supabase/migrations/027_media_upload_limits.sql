-- Blynk: align Storage restrictions with client-side profile and message upload limits.
begin;

update storage.buckets
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ]
where id = 'blynk-media';

commit;
