-- Permite vincular o banner do cardapio a um produto especifico.
-- O id do produto vive no snapshot JSON (menu_snapshots), por isso e um text
-- simples, sem foreign key.
alter table public.restaurants
  add column if not exists banner_link_product_id text;
