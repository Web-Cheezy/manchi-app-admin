-- Enable RLS on profiles table
alter table profiles enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Admins can view all profiles" on profiles;
drop policy if exists "Super Admins can update profiles" on profiles;
drop policy if exists "Users can view own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

-- 1. Allow authenticated users (Admins) to view ALL profiles
-- This is necessary for the Team page to list everyone
create policy "Admins can view all profiles"
on profiles for select
using (
  auth.role() = 'authenticated'
);

-- 2. Allow Super Admins to update profiles (e.g., change roles/locations)
create policy "Super Admins can update profiles"
on profiles for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- 3. Allow users to update their own profile (e.g., name, phone)
create policy "Users can update own profile"
on profiles for update
using (
  auth.uid() = id
);
