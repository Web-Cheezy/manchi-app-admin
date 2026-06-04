-- Run in Supabase SQL Editor if menu food delete fails with foreign key or RLS errors.
-- Safe to re-run: uses DROP POLICY IF EXISTS before CREATE.

-- 1. Let authenticated admins read order_items (required for pre-delete check in dashboard)
drop policy if exists "Admins can view all order items" on order_items;
create policy "Admins can view all order items"
  on order_items for select
  using (auth.role() = 'authenticated');

-- 2. Explicit delete on foods (dashboard uses browser client + anon key)
drop policy if exists "Admins can delete foods" on foods;
create policy "Admins can delete foods"
  on foods for delete
  using (auth.role() = 'authenticated');

-- 3. Explicit delete on food_availability (cascade + manual cleanup in dashboard)
drop policy if exists "Admins can delete food_availability" on food_availability;
create policy "Admins can delete food_availability"
  on food_availability for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and (role = 'super_admin' or role = 'admin')
    )
  );
