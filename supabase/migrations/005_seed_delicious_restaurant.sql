insert into public.restaurants (
  id,
  name,
  slug,
  logo_url,
  cover_url,
  address,
  opening_hours,
  delivery_fee,
  average_prep_time,
  is_open,
  whatsapp
)
values (
  '11111111-1111-1111-1111-111111111111',
  'DELICIOUS GOURMET BOLOS E SALGADOS',
  'delicious-gourmet-bolos-e-salgados',
  'https://staginganotaai.s3.us-west-2.amazonaws.com/produtos/67f91d0803bf3b0019f3ef8f1754600955397blob',
  'https://client-assets.anota.ai/menu-header/4d081712-4a2a-4d9c-b1a2-8ba8ab0c80a0',
  'R. Aparecida, 1341 - Santa Rosalia, Sorocaba - SP',
  'Terça a sexta: 09:30 às 17:30 | Sábado: 09:00 às 17:00 | Domingo: 09:00 às 11:30',
  7,
  45,
  true,
  '5544999990000'
)
on conflict (slug) do update set
  name = excluded.name,
  logo_url = excluded.logo_url,
  cover_url = excluded.cover_url,
  address = excluded.address,
  opening_hours = excluded.opening_hours,
  delivery_fee = excluded.delivery_fee,
  average_prep_time = excluded.average_prep_time,
  is_open = excluded.is_open,
  whatsapp = excluded.whatsapp;

insert into public.business_hours (
  restaurant_id,
  weekday,
  opens_at,
  closes_at,
  is_closed
)
values
  ('11111111-1111-1111-1111-111111111111', 0, '09:00', '11:30', false),
  ('11111111-1111-1111-1111-111111111111', 1, '09:30', '17:30', true),
  ('11111111-1111-1111-1111-111111111111', 2, '09:30', '17:30', false),
  ('11111111-1111-1111-1111-111111111111', 3, '09:30', '17:30', false),
  ('11111111-1111-1111-1111-111111111111', 4, '09:30', '17:30', false),
  ('11111111-1111-1111-1111-111111111111', 5, '09:30', '17:30', false),
  ('11111111-1111-1111-1111-111111111111', 6, '09:00', '17:00', false)
on conflict (restaurant_id, weekday) do update set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  is_closed = excluded.is_closed,
  updated_at = now();

create or replace function public.claim_restaurant_by_slug(target_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_restaurant_id uuid;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select id
    into target_restaurant_id
  from public.restaurants
  where slug = target_slug
  limit 1;

  if target_restaurant_id is null then
    raise exception 'Restaurante nao encontrado';
  end if;

  insert into public.profiles (
    id,
    restaurant_id,
    name,
    role
  )
  values (
    current_user_id,
    target_restaurant_id,
    coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', auth.jwt() ->> 'email', 'Administrador'),
    'owner'
  )
  on conflict (id) do update set
    restaurant_id = excluded.restaurant_id,
    name = excluded.name;

  return target_restaurant_id;
end;
$$;

grant execute on function public.claim_restaurant_by_slug(text) to authenticated;
