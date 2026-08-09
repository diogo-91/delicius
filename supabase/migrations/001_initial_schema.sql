create extension if not exists "uuid-ossp";

create type public.order_status as enum ('new', 'preparing', 'ready', 'out_for_delivery', 'finished', 'cancelled');
create type public.order_type as enum ('delivery', 'pickup', 'dine_in');
create type public.payment_method as enum ('pix', 'credit_card', 'debit_card');

create table public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  address text not null,
  opening_hours text not null,
  delivery_fee numeric(10,2) not null default 0,
  average_prep_time integer not null default 30,
  is_open boolean not null default true,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  role text not null default 'owner',
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null,
  description text not null default '',
  image_url text,
  price numeric(10,2) not null,
  active boolean not null default true,
  requires_note boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.product_variations (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null
);

create table public.product_addons (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null
);

create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  phone text not null,
  address text,
  total_spent numeric(10,2) not null default 0,
  order_count integer not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  code text not null,
  type public.order_type not null,
  payment_method public.payment_method not null,
  status public.order_status not null default 'new',
  subtotal numeric(10,2) not null,
  discount numeric(10,2) not null default 0,
  coupon_code text,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null,
  variation jsonb,
  addons jsonb not null default '[]',
  note text,
  total numeric(10,2) not null
);

create table public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.restaurants enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variations enable row level security;
alter table public.product_addons enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;

create policy "Tenant members can manage restaurant" on public.restaurants
for all using (id = public.current_restaurant_id());

create policy "Tenant members can manage profiles" on public.profiles
for all using (restaurant_id = public.current_restaurant_id());

create policy "Public can read open menus" on public.restaurants
for select using (true);

create policy "Tenant members can manage categories" on public.categories
for all using (restaurant_id = public.current_restaurant_id());

create policy "Public can read active categories" on public.categories
for select using (active = true);

create policy "Tenant members can manage products" on public.products
for all using (restaurant_id = public.current_restaurant_id());

create policy "Public can read active products" on public.products
for select using (active = true);

create policy "Tenant members can manage customers" on public.customers
for all using (restaurant_id = public.current_restaurant_id());

create policy "Public can create customers" on public.customers
for insert with check (true);

create policy "Tenant members can manage orders" on public.orders
for all using (restaurant_id = public.current_restaurant_id());

create policy "Public can create orders" on public.orders
for insert with check (true);

create policy "Tenant members can manage order items" on public.order_items
for all using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
    and orders.restaurant_id = public.current_restaurant_id()
  )
);

create policy "Public can create order items" on public.order_items
for insert with check (true);

create policy "Tenant members can manage history" on public.order_status_history
for all using (
  exists (
    select 1 from public.orders
    where orders.id = order_status_history.order_id
    and orders.restaurant_id = public.current_restaurant_id()
  )
);

create index categories_restaurant_id_idx on public.categories(restaurant_id);
create index products_restaurant_id_idx on public.products(restaurant_id);
create index customers_restaurant_id_idx on public.customers(restaurant_id);
create index orders_restaurant_status_idx on public.orders(restaurant_id, status);
