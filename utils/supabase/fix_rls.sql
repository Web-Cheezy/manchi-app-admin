-- Fix missing SELECT policies for Admin/Authenticated users
-- Run this in your Supabase SQL Editor

-- PROFILES
-- Allow admins to view customer profiles
create policy "Admins can view all profiles" on profiles for select using (auth.role() = 'authenticated');

-- FOODS
-- Allow admins to view foods (needed for order details)
create policy "Admins can view all foods" on foods for select using (auth.role() = 'authenticated');

-- SIDES
-- Allow admins to view sides
create policy "Admins can view all sides" on sides for select using (auth.role() = 'authenticated');

-- FOOD_SIDES
-- Allow admins to view food_sides
create policy "Admins can view all food_sides" on food_sides for select using (auth.role() = 'authenticated');

-- CATEGORIES
-- Allow admins to view categories
create policy "Admins can view all categories" on categories for select using (auth.role() = 'authenticated');
