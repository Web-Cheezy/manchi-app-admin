-- Transport/LGA fare configuration
-- Create table + RLS policies so:
-- - Mobile app can read prices (SELECT)
-- - Admins + Super Admins can insert/update prices

-- 1) Table
create table if not exists public.transport_prices (
  lga text primary key,
  state text not null,
  price integer not null default 2500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.transport_prices_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transport_prices_set_updated_at on public.transport_prices;
create trigger transport_prices_set_updated_at
before update on public.transport_prices
for each row
execute function public.transport_prices_set_updated_at();

-- 2) Enable RLS
alter table public.transport_prices enable row level security;

-- 3) Policies
drop policy if exists "Allow public read transport prices" on public.transport_prices;
create policy "Allow public read transport prices"
on public.transport_prices
for select
using (true);

drop policy if exists "Admins can insert transport prices" on public.transport_prices;
create policy "Admins can insert transport prices"
on public.transport_prices
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Admins can update transport prices" on public.transport_prices;
create policy "Admins can update transport prices"
on public.transport_prices
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

drop policy if exists "Admins can delete transport prices" on public.transport_prices;
create policy "Admins can delete transport prices"
on public.transport_prices
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'super_admin')
  )
);

-- 4) Seed defaults (do not overwrite if rows already exist)
insert into public.transport_prices (lga, state, price)
values
  ('Abua/Odual', 'Rivers', 2500),
  ('Ahoada East', 'Rivers', 2500),
  ('Ahoada West', 'Rivers', 2500),
  ('Andoni', 'Rivers', 2500),
  ('Akuku-Toru', 'Rivers', 2500),
  ('Asari-Toru', 'Rivers', 2500),
  ('Bonny', 'Rivers', 2500),
  ('Degema', 'Rivers', 2500),
  ('Emuoha', 'Rivers', 2500),
  ('Eleme', 'Rivers', 2500),
  ('Ikwerre', 'Rivers', 2500),
  ('Etche', 'Rivers', 2500),
  ('Gokana', 'Rivers', 2500),
  ('Khana', 'Rivers', 2500),
  ('Obio/Akpor', 'Rivers', 2500),
  ('Ogba/Egbema/Ndoni', 'Rivers', 2500),
  ('Ogu/Bolo', 'Rivers', 2500),
  ('Okrika', 'Rivers', 2500),
  ('Omuma', 'Rivers', 2500),
  ('Opobo/Nkoro', 'Rivers', 2500),
  ('Oyigbo', 'Rivers', 2500),
  ('Port Harcourt', 'Rivers', 2500),
  ('Tai', 'Rivers', 2500),
  ('Awgu', 'Enugu', 2500),
  ('Aninri', 'Enugu', 2500),
  ('Enugu East', 'Enugu', 2500),
  ('Enugu North', 'Enugu', 2500),
  ('Ezeagu', 'Enugu', 2500),
  ('Enugu South', 'Enugu', 2500),
  ('Igbo Etiti', 'Enugu', 2500),
  ('Igbo Eze North', 'Enugu', 2500),
  ('Igbo Eze South', 'Enugu', 2500),
  ('Isi Uzo', 'Enugu', 2500),
  ('Nkanu East', 'Enugu', 2500),
  ('Nkanu West', 'Enugu', 2500),
  ('Nsukka', 'Enugu', 2500),
  ('Udenu', 'Enugu', 2500),
  ('Oji River', 'Enugu', 2500),
  ('Uzo Uwani', 'Enugu', 2500),
  ('Udi', 'Enugu', 2500)
on conflict (lga) do nothing;

