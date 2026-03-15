-- Add role and location columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin')),
ADD COLUMN IF NOT EXISTS location text DEFAULT 'Chasemall' CHECK (location IN ('Chasemall', 'Aurora', 'All'));

-- Update existing profiles to be super_admin for now (so you don't get locked out)
-- You can manually change specific users to 'admin' and specific locations later
UPDATE profiles SET role = 'super_admin', location = 'All';

-- Add location column to orders table if it doesn't exist
-- The user mentioned "orders sent to the chasemall", so we need to store where the order was sent
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS location text DEFAULT 'Chasemall';

-- Policy updates will be handled in code logic mostly, but we can enforce RLS if needed.
-- For now, we will trust the application logic to filter based on the user's profile.
