-- Create a function that runs when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, location)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'admin', -- Default to 'admin' (restricted)
    'Chasemall' -- Default to 'Chasemall'
  );
  return new;
end;
$$;

-- Create the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
