-- Lets a customer poll the live status of their own orders (so the order timeline on the
-- public menu reflects status changes made by the restaurant in the admin panel).
alter table public.customer_orders add column if not exists customer_user_id uuid;

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

  insert into public.customer_orders (restaurant_slug, code, status, order_data, customer_user_id)
  values (target_slug, '#' || next_seq::text, 'new', order_payload, auth.uid())
  returning * into new_order;

  return new_order;
end;
$$;

grant execute on function public.create_customer_order(text, jsonb) to authenticated;

create or replace function public.get_my_customer_orders(target_slug text)
returns setof public.customer_orders
language sql
stable
security definer
set search_path = public
as $$
  select *
    from public.customer_orders
   where restaurant_slug = target_slug
     and customer_user_id = auth.uid()
   order by created_at desc;
$$;

grant execute on function public.get_my_customer_orders(text) to authenticated;
