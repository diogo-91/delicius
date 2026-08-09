"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, Product } from "@/types/domain";

export type MenuSnapshot = {
  categories: Category[];
  products: Product[];
};

export async function getMenuSnapshot(restaurantSlug: string): Promise<MenuSnapshot | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("menu_snapshots")
    .select("categories, products")
    .eq("restaurant_slug", restaurantSlug)
    .maybeSingle();

  if (error || !data) return null;

  return {
    categories: Array.isArray(data.categories) ? (data.categories as Category[]) : [],
    products: Array.isArray(data.products) ? (data.products as Product[]) : []
  };
}

export async function saveMenuSnapshot(restaurantSlug: string, categories: Category[], products: Product[]) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("update_menu_snapshot", {
    target_slug: restaurantSlug,
    categories_payload: categories,
    products_payload: products
  });

  if (error) throw error;
  return data;
}
