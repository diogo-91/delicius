"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type RemoteCustomerProfile = {
  name: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  reference: string;
};

export async function getRemoteCustomerProfile(): Promise<RemoteCustomerProfile | null> {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from("customer_profiles")
    .select("name, phone, street, number, neighborhood, complement, reference")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as RemoteCustomerProfile;
}

export async function saveRemoteCustomerProfile(profile: RemoteCustomerProfile) {
  if (!supabaseConfigured) return;

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { error } = await supabase
    .from("customer_profiles")
    .upsert({ user_id: userData.user.id, ...profile, updated_at: new Date().toISOString() });

  if (error) throw error;
}
