-- Add image_url column if it doesn't exist
alter table public.sides 
add column if not exists image_url text;

-- Add type column if it doesn't exist (useful for filtering: side, protein, drink, extra)
alter table public.sides 
add column if not exists type text default 'side';

-- Ensure the public bucket exists and is public
insert into storage.buckets (id, name, public)
values ('food-images', 'food-images', true)
on conflict (id) do update set public = true;

-- Ensure RLS policies exist for sides
alter table public.sides enable row level security;

create policy "Enable read access for all users"
on public.sides for select
using (true);

create policy "Enable insert for authenticated users only"
on public.sides for insert
with check (auth.role() = 'authenticated');

create policy "Enable update for authenticated users only"
on public.sides for update
using (auth.role() = 'authenticated');

create policy "Enable delete for authenticated users only"
on public.sides for delete
using (auth.role() = 'authenticated');

-- Ensure storage policies allow upload
create policy "Authenticated users can upload images"
on storage.objects for insert
with check ( bucket_id = 'food-images' and auth.role() = 'authenticated' );

create policy "Anyone can view images"
on storage.objects for select
using ( bucket_id = 'food-images' );
