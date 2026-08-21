-- Restrict staff roles and prevent cashiers from promoting their own profile.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('owner', 'cashier'));

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

grant execute on function public.current_profile_role() to authenticated;

drop policy if exists "Tenant members can manage profiles" on public.profiles;
drop policy if exists "Tenant members can view profiles" on public.profiles;
drop policy if exists "Owners can insert profiles" on public.profiles;
drop policy if exists "Owners can update profiles" on public.profiles;
drop policy if exists "Owners can delete profiles" on public.profiles;

create policy "Tenant members can view profiles" on public.profiles
for select
using (restaurant_id = public.current_restaurant_id());

create policy "Owners can insert profiles" on public.profiles
for insert
with check (
  public.current_profile_role() = 'owner'
  and restaurant_id = public.current_restaurant_id()
);

create policy "Owners can update profiles" on public.profiles
for update
using (
  public.current_profile_role() = 'owner'
  and restaurant_id = public.current_restaurant_id()
)
with check (
  public.current_profile_role() = 'owner'
  and restaurant_id = public.current_restaurant_id()
);

create policy "Owners can delete profiles" on public.profiles
for delete
using (
  public.current_profile_role() = 'owner'
  and restaurant_id = public.current_restaurant_id()
);
