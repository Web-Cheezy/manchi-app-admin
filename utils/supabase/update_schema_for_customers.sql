-- 1. Add email column to profiles so we can search users by email
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- 2. Update Role Constraint to allow 'customer'
-- We drop the old constraint (assuming standard naming) and add a new one
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'admin', 'customer'));

-- 3. Update the trigger function to:
--    a) Default role to 'customer' (Security Best Practice)
--    b) Save the email address
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, location, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'customer', -- Default to 'customer' so random signups don't become admins
    'Chasemall',
    new.email   -- Save email for lookup
  );
  return new;
end;
$$;
