-- Row-level security for transactions (run in Supabase SQL Editor).
alter table public.transactions enable row level security;

drop policy if exists "Super Admins can view all transactions" on transactions;
drop policy if exists "Admins can view transactions for their location" on transactions;
drop policy if exists "Admins with All location can view all transactions" on transactions;

-- Super admins see every transaction (including null location)
create policy "Super Admins can view all transactions"
on transactions for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'super_admin'
  )
);

-- Staff assigned location "All" (if used) also see everything
create policy "Admins with All location can view all transactions"
on transactions for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
    and profiles.location = 'All'
  )
);

-- Branch admins only see their location (null location rows are super-admin only)
create policy "Admins can view transactions for their location"
on transactions for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
    and profiles.location is not null
    and profiles.location <> 'All'
    and profiles.location = transactions.location
  )
);
