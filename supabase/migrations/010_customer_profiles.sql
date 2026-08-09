-- Saves each logged-in customer's delivery profile (name, phone, address) tied to their own
-- auth account, so it's available on any device/browser after Google or email login — not just
-- the browser that happened to fill it in (which is all localStorage could do).
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  street text not null default '',
  number text not null default '',
  neighborhood text not null default '',
  complement text not null default '',
  reference text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;

create policy "Users can view their own profile" on public.customer_profiles
for select using (user_id = auth.uid());

create policy "Users can insert their own profile" on public.customer_profiles
for insert with check (user_id = auth.uid());

create policy "Users can update their own profile" on public.customer_profiles
for update using (user_id = auth.uid()) with check (user_id = auth.uid());
