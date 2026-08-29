alter table public.restaurants
  add column if not exists banner_url text;

update public.restaurants
set banner_url = '/banner.png'
where slug = 'delicious-gourmet-bolos-e-salgados'
  and banner_url is null;
