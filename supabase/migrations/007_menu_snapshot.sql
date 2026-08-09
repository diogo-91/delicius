create table if not exists public.menu_snapshots (
  restaurant_slug text primary key,
  categories jsonb not null default '[]',
  products jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

alter table public.menu_snapshots enable row level security;

drop policy if exists "Public can read menu snapshots" on public.menu_snapshots;
create policy "Public can read menu snapshots" on public.menu_snapshots
for select using (true);

create or replace function public.update_menu_snapshot(
  target_slug text,
  categories_payload jsonb,
  products_payload jsonb
)
returns public.menu_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_snapshot public.menu_snapshots;
begin
  if current_user_id is null then
    raise exception 'Usuario nao autenticado';
  end if;

  perform public.claim_restaurant_by_slug(target_slug);

  insert into public.menu_snapshots (
    restaurant_slug,
    categories,
    products,
    updated_at
  )
  values (
    target_slug,
    categories_payload,
    products_payload,
    now()
  )
  on conflict (restaurant_slug) do update set
    categories = excluded.categories,
    products = excluded.products,
    updated_at = now()
  returning * into saved_snapshot;

  return saved_snapshot;
end;
$$;

grant execute on function public.update_menu_snapshot(text, jsonb, jsonb) to authenticated;
