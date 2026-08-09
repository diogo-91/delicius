-- Extensoes do painel administrativo Komanda.ia
-- Rode depois da migration 001_initial_schema.sql.

do $$
begin
  create type public.coupon_type as enum ('percent', 'fixed', 'delivery');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'approved', 'failed', 'refunded', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.integration_provider as enum ('asaas', 'evolution_api', 'openai');
exception
  when duplicate_object then null;
end $$;

alter table public.restaurants
  add column if not exists cover_url text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists description text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.products
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.customers
  add column if not exists email text,
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.orders
  add column if not exists discount numeric(10,2) not null default 0,
  add column if not exists coupon_code text,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists delivery_address text,
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists asaas_payment_id text,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.order_items
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.customer_addresses (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text not null default 'Principal',
  street text not null,
  number text,
  neighborhood text,
  complement text,
  reference text,
  city text,
  state text,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupons (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code text not null,
  description text not null default '',
  type public.coupon_type not null,
  value numeric(10,2) not null default 0,
  active boolean not null default true,
  usage_limit integer,
  used_count integer not null default 0,
  minimum_order_value numeric(10,2) not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, code)
);

create table if not exists public.order_payments (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  provider public.integration_provider not null default 'asaas',
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(10,2) not null,
  provider_payment_id text,
  pix_qr_code text,
  pix_copy_paste text,
  card_last_digits text,
  paid_at timestamptz,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, weekday)
);

create table if not exists public.integration_settings (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider public.integration_provider not null,
  enabled boolean not null default false,
  public_config jsonb not null default '{}',
  secret_config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);

create table if not exists public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  phone text,
  status text not null default 'open',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('customer', 'assistant', 'system')),
  content text not null,
  intent text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.customer_addresses enable row level security;
alter table public.coupons enable row level security;
alter table public.order_payments enable row level security;
alter table public.business_hours enable row level security;
alter table public.integration_settings enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "Tenant members can manage customer addresses" on public.customer_addresses;
create policy "Tenant members can manage customer addresses" on public.customer_addresses
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Public can create customer addresses" on public.customer_addresses;
create policy "Public can create customer addresses" on public.customer_addresses
for insert with check (true);

drop policy if exists "Tenant members can manage coupons" on public.coupons;
create policy "Tenant members can manage coupons" on public.coupons
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Public can read active coupons" on public.coupons;
create policy "Public can read active coupons" on public.coupons
for select using (
  active = true
  and (expires_at is null or expires_at > now())
);

drop policy if exists "Tenant members can manage order payments" on public.order_payments;
create policy "Tenant members can manage order payments" on public.order_payments
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Public can create order payments" on public.order_payments;
create policy "Public can create order payments" on public.order_payments
for insert with check (true);

drop policy if exists "Tenant members can manage business hours" on public.business_hours;
create policy "Tenant members can manage business hours" on public.business_hours
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Public can read business hours" on public.business_hours;
create policy "Public can read business hours" on public.business_hours
for select using (true);

drop policy if exists "Tenant members can manage integrations" on public.integration_settings;
create policy "Tenant members can manage integrations" on public.integration_settings
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Tenant members can manage ai conversations" on public.ai_conversations;
create policy "Tenant members can manage ai conversations" on public.ai_conversations
for all using (restaurant_id = public.current_restaurant_id())
with check (restaurant_id = public.current_restaurant_id());

drop policy if exists "Tenant members can manage ai messages" on public.ai_messages;
create policy "Tenant members can manage ai messages" on public.ai_messages
for all using (
  exists (
    select 1
    from public.ai_conversations
    where ai_conversations.id = ai_messages.conversation_id
    and ai_conversations.restaurant_id = public.current_restaurant_id()
  )
);

create index if not exists customer_addresses_customer_id_idx on public.customer_addresses(customer_id);
create index if not exists coupons_restaurant_active_idx on public.coupons(restaurant_id, active);
create index if not exists orders_restaurant_created_idx on public.orders(restaurant_id, created_at desc);
create index if not exists order_payments_order_id_idx on public.order_payments(order_id);
create index if not exists business_hours_restaurant_weekday_idx on public.business_hours(restaurant_id, weekday);
create index if not exists ai_conversations_restaurant_status_idx on public.ai_conversations(restaurant_id, status);
create index if not exists ai_messages_conversation_id_idx on public.ai_messages(conversation_id);

create or replace view public.admin_order_details
with (security_invoker = true) as
select
  o.id,
  o.restaurant_id,
  o.code,
  o.status,
  o.type,
  o.payment_method,
  o.payment_status,
  o.subtotal,
  o.discount,
  o.coupon_code,
  o.delivery_fee,
  o.total,
  o.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  c.address as customer_address,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'unit_price', oi.unit_price,
        'quantity', oi.quantity,
        'variation', oi.variation,
        'addons', oi.addons,
        'note', oi.note,
        'total', oi.total
      )
      order by oi.created_at nulls last
    ) filter (where oi.id is not null),
    '[]'::jsonb
  ) as items
from public.orders o
join public.customers c on c.id = o.customer_id
left join public.order_items oi on oi.order_id = o.id
group by o.id, c.id;
