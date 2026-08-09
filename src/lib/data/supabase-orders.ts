"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Order } from "@/types/domain";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function createRemoteOrder(restaurantSlug: string, order: Order): Promise<Order | null> {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_customer_order", {
    target_slug: restaurantSlug,
    order_payload: order
  });

  if (error || !data) throw error ?? new Error("Nao foi possivel enviar o pedido.");

  return { ...order, ...(data.order_data as Order), id: data.id as string, code: data.code as string };
}

export async function getRemoteOrders(restaurantSlug: string): Promise<Order[] | null> {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_customer_orders", { target_slug: restaurantSlug });

  if (error || !Array.isArray(data)) return null;

  return data.map((row) => ({
    ...(row.order_data as Order),
    id: row.id as string,
    code: row.code as string,
    status: row.status as Order["status"]
  }));
}

export async function getMyRemoteOrders(restaurantSlug: string): Promise<Order[] | null> {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_my_customer_orders", { target_slug: restaurantSlug });

  if (error || !Array.isArray(data)) return null;

  return data.map((row) => ({
    ...(row.order_data as Order),
    id: row.id as string,
    code: row.code as string,
    status: row.status as Order["status"]
  }));
}

export async function updateRemoteOrderStatus(orderId: string, status: string) {
  if (!supabaseConfigured) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("update_customer_order_status", {
    target_order_id: orderId,
    new_status: status
  });

  if (error) throw error;
  return data;
}
