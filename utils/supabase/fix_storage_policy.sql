-- Drop existing policies to start fresh
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Authenticated users can update images" on storage.objects;
drop policy if exists "Authenticated users can delete images" on storage.objects;

-- Ensure bucket exists and is public
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do update set public = true;

-- Create permissive policies for the 'food-images' bucket
-- 1. Public Read Access
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'food-images' );

-- 2. Authenticated Upload (Insert)
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- 3. Authenticated Update
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- 4. Authenticated Delete
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );
