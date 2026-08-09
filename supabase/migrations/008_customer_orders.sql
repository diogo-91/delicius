-- Fix infinite recursion: current_restaurant_id() queried public.profiles, which is itself
-- RLS-protected by a policy that calls current_restaurant_id(), causing "stack depth limit
-- exceeded" on every query against orders/customers/profiles/categories/products/restaurants.
-- Marking it security definer makes its internal lookup bypass RLS, breaking the recursion.
create or replace function public.current_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid()
$$;

-- Orders placed from the public cardapio, synced across devices (customer phone -> admin panel).
-- Stored as a single jsonb payload (mirrors the existing menu_snapshots pattern) instead of the
-- relational orders/order_items tables, since the product catalog itself is already jsonb-based
-- and not backed by rows in public.products.
create table if not exists public.customer_orders (
  id uuid primary key default uuid_generate_v4(),
  restaurant_slug text not null,
  code text not null,
  status text not null default 'new',
  order_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.customer_orders enable row level security;
-- No policies: all access goes through the security definer functions below.

create index if not exists customer_orders_restaurant_slug_idx on public.customer_orders(restaurant_slug, created_at desc);

create or replace function public.create_customer_order(target_slug text, order_payload jsonb)
returns public.customer_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.customer_orders;
  next_seq integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select coalesce(count(*), 0) + 1026 into next_seq
    from public.customer_orders
   where restaurant_slug = target_slug;

  insert into public.customer_orders (restaurant_slug, code, status, order_data)
  values (target_slug, '#' || next_seq::text, 'new', order_payload)
  returning * into new_order;

  return new_order;
end;
$$;

grant execute on function public.create_customer_order(text, jsonb) to authenticated;

create or replace function public.list_customer_orders(target_slug text)
returns setof public.customer_orders
language sql
stable
security definer
set search_path = public
as $$
  select co.*
    from public.customer_orders co
    join public.restaurants r on r.slug = co.restaurant_slug
   where co.restaurant_slug = target_slug
     and r.id = public.current_restaurant_id()
   order by co.created_at desc;
$$;

grant execute on function public.list_customer_orders(text) to authenticated;

create or replace function public.update_customer_order_status(target_order_id uuid, new_status text)
returns public.customer_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_order public.customer_orders;
begin
  if auth.uid() is null then
    raise exception 'Usuario nao autenticado';
  end if;

  update public.customer_orders co
     set status = new_status
    from public.restaurants r
   where co.id = target_order_id
     and r.slug = co.restaurant_slug
     and r.id = public.current_restaurant_id()
   returning co.* into updated_order;

  if updated_order.id is null then
    raise exception 'Pedido nao encontrado ou sem permissao';
  end if;

  return updated_order;
end;
$$;

grant execute on function public.update_customer_order_status(uuid, text) to authenticated;
