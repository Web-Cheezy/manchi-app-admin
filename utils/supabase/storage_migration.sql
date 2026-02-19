-- 1. Remove image_url from categories table
alter table public.categories drop column if exists image_url;

-- 2. Create Storage Bucket for Food Images
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do nothing;

-- 3. Set up Storage Policies (RLS)

-- Enable RLS on storage.objects if not already enabled (it usually is)
alter table storage.objects enable row level security;

-- Allow public read access to food-images bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'food-images' );

-- Allow authenticated users to upload to food-images bucket
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to update their uploaded images
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- Allow authenticated users to delete images
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );
