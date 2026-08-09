insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'restaurant-assets',
  'restaurant-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read restaurant assets" on storage.objects;
drop policy if exists "Authenticated users can upload restaurant assets" on storage.objects;
drop policy if exists "Authenticated users can update restaurant assets" on storage.objects;
drop policy if exists "Authenticated users can delete restaurant assets" on storage.objects;

create policy "Public can read restaurant assets"
on storage.objects
for select
using (bucket_id = 'restaurant-assets');

create policy "Authenticated users can upload restaurant assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'restaurant-assets'
  and (storage.foldername(name))[1] = 'restaurants'
);

create policy "Authenticated users can update restaurant assets"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'restaurant-assets'
  and (storage.foldername(name))[1] = 'restaurants'
)
with check (
  bucket_id = 'restaurant-assets'
  and (storage.foldername(name))[1] = 'restaurants'
);

create policy "Authenticated users can delete restaurant assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'restaurant-assets'
  and (storage.foldername(name))[1] = 'restaurants'
);
