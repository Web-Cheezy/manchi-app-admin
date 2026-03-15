-- Enable RLS on orders table
alter table orders enable row level security;

-- Drop existing policies if any
drop policy if exists "Super Admins can view all orders" on orders;
drop policy if exists "Admins can view orders for their location" on orders;
drop policy if exists "Customers can view their own orders" on orders;

-- 1. Super Admins can view ALL orders
create policy "Super Admins can view all orders"
on orders for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- 2. Regular Admins can view orders matching their location
-- Note: This assumes the order's 'location' column matches the profile's 'location' column
create policy "Admins can view orders for their location"
on orders for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
    and profiles.location = orders.location
  )
);

-- 3. Customers can view their own orders
create policy "Customers can view their own orders"
on orders for select
using (
  auth.uid() = user_id
);

-- 4. Allow insert for authenticated users (Customers placing orders)
create policy "Users can insert orders"
on orders for insert
with check (
  auth.role() = 'authenticated'
);

-- 5. Allow Super Admins to update orders (e.g. status)
create policy "Super Admins can update orders"
on orders for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- 6. Allow Regular Admins to update orders matching their location
create policy "Admins can update orders for their location"
on orders for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
    and profiles.location = orders.location
  )
);
