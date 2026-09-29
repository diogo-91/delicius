-- Frete gratis a partir de um valor minimo de pedido. NULL/0 = recurso
-- desativado. Fica fora do RPC update_restaurant_settings (igual ao padrao
-- ja usado para banner_link_product_id) para que salvar as demais
-- configuracoes continue funcionando mesmo antes desta migracao rodar.
alter table public.restaurants
  add column if not exists free_shipping_threshold numeric check (free_shipping_threshold is null or free_shipping_threshold >= 0);
