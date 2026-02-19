-- 1. Reset Policies (Drop existing ones to avoid conflicts)
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Authenticated users can update images" on storage.objects;
drop policy if exists "Authenticated users can delete images" on storage.objects;
drop policy if exists "Give me access" on storage.objects;

-- 2. Ensure Bucket Exists and is Public
-- We use ON CONFLICT to make this script idempotent (safe to run multiple times)
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do update set public = true;

-- 3. Create Policies (The "Rules" for who can do what)

-- Rule 1: Everyone (public) can VIEW images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'food-images' );

-- Rule 2: Authenticated users can UPLOAD (Insert) images
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- Rule 3: Authenticated users can UPDATE their images
create policy "Authenticated users can update images"
  on storage.objects for update
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

-- Rule 4: Authenticated users can DELETE images
create policy "Authenticated users can delete images"
  on storage.objects for delete
  using ( bucket_id = 'food-images' and auth.role() = 'authenticated' );
