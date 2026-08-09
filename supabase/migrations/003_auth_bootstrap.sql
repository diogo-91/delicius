create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value, 'restaurante')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.ensure_owner_profile(restaurant_name text default null, owner_name text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_restaurant_id uuid;
  created_restaurant_id uuid;
  base_name text := nullif(trim(coalesce(restaurant_name, '')), '');
  base_slug text;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  select profiles.restaurant_id
    into existing_restaurant_id
  from public.profiles
  where profiles.id = current_user_id
  limit 1;

  if existing_restaurant_id is not null then
    return existing_restaurant_id;
  end if;

  base_name := coalesce(base_name, 'Meu restaurante');
  base_slug := public.slugify(base_name) || '-' || substring(current_user_id::text from 1 for 8);

  insert into public.restaurants (
    name,
    slug,
    address,
    opening_hours,
    delivery_fee,
    average_prep_time,
    is_open,
    whatsapp
  )
  values (
    base_name,
    base_slug,
    'Endereco nao informado',
    'Configure os horarios de funcionamento',
    0,
    45,
    true,
    ''
  )
  returning id into created_restaurant_id;

  insert into public.profiles (
    id,
    restaurant_id,
    name,
    role
  )
  values (
    current_user_id,
    created_restaurant_id,
    coalesce(nullif(trim(owner_name), ''), 'Administrador'),
    'owner'
  );

  return created_restaurant_id;
end;
$$;

grant execute on function public.ensure_owner_profile(text, text) to authenticated;
