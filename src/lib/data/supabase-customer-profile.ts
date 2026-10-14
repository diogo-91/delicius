"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type RemoteCustomerProfile = {
  name: string;
  phone: string;
  cep?: string;
  street: string;
  number: string;
  neighborhood: string;
  city?: string;
  state?: string;
  complement: string;
  reference: string;
};

const baseColumns = "name, phone, street, number, neighborhood, complement, reference";
const extendedColumns = `${baseColumns}, cep, city, state`;

export async function getRemoteCustomerProfile(): Promise<RemoteCustomerProfile | null> {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  // Tenta com cep/cidade/UF (migracao 015); se a coluna ainda nao existe, cai para o basico.
  const extended = await supabase.from("customer_profiles").select(extendedColumns).eq("user_id", userData.user.id).maybeSingle();
  if (!extended.error) return (extended.data as unknown as RemoteCustomerProfile | null) ?? null;

  const base = await supabase.from("customer_profiles").select(baseColumns).eq("user_id", userData.user.id).maybeSingle();
  if (base.error || !base.data) return null;
  return base.data as unknown as RemoteCustomerProfile;
}

export async function saveRemoteCustomerProfile(profile: RemoteCustomerProfile) {
  if (!supabaseConfigured) return;

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("customer_profiles")
    .upsert({ user_id: userData.user.id, ...profile, updated_at: new Date().toISOString() });
  if (!error) return;

  // Coluna inexistente (42703 / PGRST204): salva sem os campos novos.
  const missingColumn = error.code === "42703" || error.code === "PGRST204";
  if (!missingColumn) throw error;

  const legacy = {
    name: profile.name,
    phone: profile.phone,
    street: profile.street,
    number: profile.number,
    neighborhood: profile.neighborhood,
    complement: profile.complement,
    reference: profile.reference
  };
  const retry = await supabase
    .from("customer_profiles")
    .upsert({ user_id: userData.user.id, ...legacy, updated_at: new Date().toISOString() });
  if (retry.error) throw retry.error;
}
