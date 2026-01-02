-- Allow authenticated users to upload files to 'item-images' bucket
create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'item-images' and
  auth.uid() = owner
);

-- Allow public access to view files in 'item-images'
create policy "Allow public viewing"
on storage.objects
for select
to public
using ( bucket_id = 'item-images' );
