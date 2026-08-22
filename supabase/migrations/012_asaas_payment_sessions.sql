create table if not exists public.asaas_payment_sessions (
  id uuid primary key default uuid_generate_v4(),
  restaurant_slug text not null,
  customer_user_id uuid references auth.users(id) on delete set null,
  order_data jsonb not null,
  payment_method text not null check (payment_method in ('pix', 'credit_card')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'failed', 'refunded', 'cancelled')),
  amount numeric(10,2) not null,
  asaas_customer_id text,
  asaas_payment_id text unique,
  pix_encoded_image text,
  pix_payload text,
  pix_expiration_date timestamptz,
  customer_order_id uuid references public.customer_orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_orders
  add column if not exists payment_session_id uuid unique references public.asaas_payment_sessions(id) on delete set null;

create table if not exists public.asaas_webhook_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.asaas_payment_sessions enable row level security;
alter table public.asaas_webhook_events enable row level security;

create index if not exists asaas_payment_sessions_user_idx
  on public.asaas_payment_sessions(customer_user_id, created_at desc);

-- Service role only. Public access is intentionally denied by RLS.
