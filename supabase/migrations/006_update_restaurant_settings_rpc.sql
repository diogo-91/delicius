create or replace function public.update_restaurant_settings(
  target_slug text,
  restaurant_name text,
  restaurant_address text,
  restaurant_whatsapp text,
  restaurant_logo_url text,
  restaurant_cover_url text,
  restaurant_delivery_fee numeric,
  restaurant_average_prep_time integer,
  restaurant_is_open boolean,
  restaurant_opening_hours text,
  weekly_schedule jsonb
)
returns public.restaurants
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  target_restaurant public.restaurants;
  schedule_item jsonb;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  perform public.claim_restaurant_by_slug(target_slug);

  update public.restaurants
     set name = restaurant_name,
         slug = target_slug,
         logo_url = restaurant_logo_url,
         cover_url = restaurant_cover_url,
         address = restaurant_address,
         opening_hours = restaurant_opening_hours,
         delivery_fee = coalesce(restaurant_delivery_fee, 0),
         average_prep_time = coalesce(restaurant_average_prep_time, 45),
         is_open = coalesce(restaurant_is_open, true),
         whatsapp = restaurant_whatsapp
   where slug = target_slug
   returning * into target_restaurant;

  if target_restaurant.id is null then
    raise exception 'Restaurante nao encontrado';
  end if;

  for schedule_item in select * from jsonb_array_elements(weekly_schedule)
  loop
    insert into public.business_hours (
      restaurant_id,
      weekday,
      opens_at,
      closes_at,
      is_closed,
      updated_at
    )
    values (
      target_restaurant.id,
      (schedule_item ->> 'day')::integer,
      nullif(schedule_item ->> 'open', '')::time,
      nullif(schedule_item ->> 'close', '')::time,
      not coalesce((schedule_item ->> 'enabled')::boolean, false),
      now()
    )
    on conflict (restaurant_id, weekday) do update set
      opens_at = excluded.opens_at,
      closes_at = excluded.closes_at,
      is_closed = excluded.is_closed,
      updated_at = now();
  end loop;

  return target_restaurant;
end;
$$;

grant execute on function public.update_restaurant_settings(
  text,
  text,
  text,
  text,
  text,
  text,
  numeric,
  integer,
  boolean,
  text,
  jsonb
) to authenticated;
