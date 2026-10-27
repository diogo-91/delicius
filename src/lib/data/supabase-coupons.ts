"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Coupon, CouponType } from "@/types/domain";

type CouponRow = {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number | string;
  active: boolean;
  usage_limit: number | null;
  used_count: number | null;
  minimum_order_value: number | string | null;
  expires_at: string | null;
  created_at: string;
};

const couponColumns =
  "id, restaurant_id, code, description, type, value, active, usage_limit, used_count, minimum_order_value, expires_at, created_at";

function mapCoupon(row: CouponRow): Coupon {
  const minimum = Number(row.minimum_order_value) || 0;
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    code: row.code,
    description: row.description ?? "",
    type: row.type,
    value: Number(row.value) || 0,
    active: row.active,
    usageLimit: row.usage_limit ?? undefined,
    usedCount: row.used_count ?? 0,
    minimumOrderValue: minimum > 0 ? minimum : undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at
  };
}

export function isCouponUsable(coupon: Coupon, now = new Date()) {
  if (!coupon.active) return false;
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return false;
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return false;
  return true;
}

function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Cupons do cardápio público: o RLS já devolve só os ativos e não expirados
// para qualquer visitante, então funciona igual para todas as contas.
export async function getRemoteCoupons(restaurantId: string): Promise<Coupon[] | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("coupons")
    .select(couponColumns)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error || !data) return null;
  return (data as CouponRow[]).map(mapCoupon);
}

export async function getRestaurantIdBySlug(slug: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export type NewCouponInput = Pick<Coupon, "code" | "description" | "type" | "value" | "usageLimit" | "minimumOrderValue" | "expiresAt">;

export async function createRemoteCoupon(restaurantId: string, input: NewCouponInput): Promise<Coupon> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      restaurant_id: restaurantId,
      code: input.code.trim().toUpperCase(),
      description: input.description,
      type: input.type,
      value: input.value,
      active: true,
      usage_limit: input.usageLimit ?? null,
      minimum_order_value: input.minimumOrderValue ?? 0,
      expires_at: input.expiresAt ?? null
    })
    .select(couponColumns)
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Já existe um cupom com esse código.");
    throw error;
  }
  return mapCoupon(data as CouponRow);
}

export async function setRemoteCouponActive(couponId: string, active: boolean) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("coupons")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", couponId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cupom não encontrado ou sem permissão para alteração.");
}
