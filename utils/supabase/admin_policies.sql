-- Enable full access for authenticated users (Admins) on all tables

-- CATEGORIES
create policy "Admins can insert categories" on categories for insert with check (auth.role() = 'authenticated');
create policy "Admins can update categories" on categories for update using (auth.role() = 'authenticated');
create policy "Admins can delete categories" on categories for delete using (auth.role() = 'authenticated');

-- FOODS
create policy "Admins can insert foods" on foods for insert with check (auth.role() = 'authenticated');
create policy "Admins can update foods" on foods for update using (auth.role() = 'authenticated');
create policy "Admins can delete foods" on foods for delete using (auth.role() = 'authenticated');

-- SIDES
create policy "Admins can insert sides" on sides for insert with check (auth.role() = 'authenticated');
create policy "Admins can update sides" on sides for update using (auth.role() = 'authenticated');
create policy "Admins can delete sides" on sides for delete using (auth.role() = 'authenticated');

-- FOOD_SIDES
create policy "Admins can insert food_sides" on food_sides for insert with check (auth.role() = 'authenticated');
create policy "Admins can update food_sides" on food_sides for update using (auth.role() = 'authenticated');
create policy "Admins can delete food_sides" on food_sides for delete using (auth.role() = 'authenticated');

-- ORDERS
-- Note: There were existing policies for users to view/insert their OWN orders.
-- We need to add policies for Admins to view/update ALL orders.
create policy "Admins can view all orders" on orders for select using (auth.role() = 'authenticated');
create policy "Admins can update orders" on orders for update using (auth.role() = 'authenticated');
-- (Insert usually comes from users app, but admins might need to create orders too manually?)
create policy "Admins can insert orders" on orders for insert with check (auth.role() = 'authenticated');


-- ORDER ITEMS
create policy "Admins can view all order items" on order_items for select using (auth.role() = 'authenticated');
create policy "Admins can insert order items" on order_items for insert with check (auth.role() = 'authenticated');
create policy "Admins can update order items" on order_items for update using (auth.role() = 'authenticated');
create policy "Admins can delete order items" on order_items for delete using (auth.role() = 'authenticated');

-- STORAGE POLICIES (Re-stating for clarity/completeness if not already run)
-- Ensure 'food-images' bucket exists and has policies
-- (Already provided in previous step, but good to keep in mind)
