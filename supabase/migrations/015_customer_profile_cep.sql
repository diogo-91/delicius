-- CEP, cidade e UF no perfil/endereco do cliente (preenchimento automatico por CEP).
alter table public.customer_profiles
  add column if not exists cep text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '';
