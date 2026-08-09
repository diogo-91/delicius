"use client";

import { restaurant as seedRestaurant } from "@/lib/data/seed";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Restaurant, WeekdaySchedule } from "@/types/domain";

type RestaurantRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url?: string | null;
  address: string;
  opening_hours: string;
  delivery_fee: number | string;
  average_prep_time: number;
  is_open: boolean;
  whatsapp: string | null;
};

type BusinessHourRow = {
  restaurant_id: string;
  weekday: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export const defaultWeeklySchedule: WeekdaySchedule[] = [
  { day: 0, label: "Domingo", enabled: true, open: "09:00", close: "11:30" },
  { day: 1, label: "Segunda-feira", enabled: false, open: "09:30", close: "17:30" },
  { day: 2, label: "Terça-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 3, label: "Quarta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 4, label: "Quinta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 5, label: "Sexta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 6, label: "Sábado", enabled: true, open: "09:00", close: "17:00" }
];

const weekdayLabels = new Map(defaultWeeklySchedule.map((day) => [day.day, day.label]));

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.slice(0, 5);
}

export function formatScheduleSummary(schedule: WeekdaySchedule[]) {
  const enabled = schedule.filter((day) => day.enabled);
  if (enabled.length === 0) return "Fechado todos os dias";

  const sunday = enabled.find((day) => day.day === 0);
  const monday = enabled.find((day) => day.day === 1);
  const saturday = enabled.find((day) => day.day === 6);
  const weekdays = enabled.filter((day) => day.day >= 2 && day.day <= 5);
  const parts: string[] = [];

  if (monday) parts.push(`Segunda-feira: ${monday.open} às ${monday.close}`);
  const weekdaySameTime = weekdays.length === 4 && weekdays.every((day) => day.open === weekdays[0].open && day.close === weekdays[0].close);
  if (weekdaySameTime) parts.push(`Terça a sexta: ${weekdays[0].open} às ${weekdays[0].close}`);
  else weekdays.forEach((day) => parts.push(`${day.label}: ${day.open} às ${day.close}`));

  if (saturday) parts.push(`Sábado: ${saturday.open} às ${saturday.close}`);
  if (sunday) parts.push(`Domingo: ${sunday.open} às ${sunday.close}`);

  return parts.join(" | ");
}

function mergeBusinessHours(rows: BusinessHourRow[] | null | undefined) {
  if (!rows || rows.length === 0) return defaultWeeklySchedule;

  return defaultWeeklySchedule.map((fallback) => {
    const row = rows.find((item) => item.weekday === fallback.day);
    if (!row) return fallback;

    return {
      day: row.weekday,
      label: weekdayLabels.get(row.weekday) ?? fallback.label,
      enabled: !row.is_closed,
      open: normalizeTime(row.opens_at, fallback.open),
      close: normalizeTime(row.closes_at, fallback.close)
    };
  });
}

function mapRestaurant(row: RestaurantRow, businessHours?: BusinessHourRow[] | null): Restaurant {
  const weeklySchedule = mergeBusinessHours(businessHours);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    coverUrl: row.cover_url ?? undefined,
    address: row.address,
    openingHours: row.opening_hours || formatScheduleSummary(weeklySchedule),
    weeklySchedule,
    deliveryFee: Number(row.delivery_fee) || 0,
    averagePrepTime: row.average_prep_time,
    isOpen: row.is_open,
    whatsapp: row.whatsapp ?? ""
  };
}

async function getBusinessHours(restaurantId: string) {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("business_hours")
    .select("restaurant_id, weekday, opens_at, closes_at, is_closed")
    .eq("restaurant_id", restaurantId)
    .order("weekday", { ascending: true });

  if (error) throw error;
  return data as BusinessHourRow[];
}

export async function getPublicRestaurantBySlug(slug: string) {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseBrowserClient();
  const query = "id, name, slug, logo_url, cover_url, address, opening_hours, delivery_fee, average_prep_time, is_open, whatsapp";
  const { data, error } = await supabase
    .from("restaurants")
    .select(query)
    .eq("slug", slug)
    .maybeSingle();

  if (error) return null;
  const restaurantRow = data;

  if (!restaurantRow) {
    const { data: fallback } = await supabase
      .from("restaurants")
      .select(query)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!fallback) return null;
    const businessHours = await getBusinessHours(fallback.id);
    return mapRestaurant(fallback as RestaurantRow, businessHours);
  }

  const businessHours = await getBusinessHours(restaurantRow.id);
  return mapRestaurant(restaurantRow as RestaurantRow, businessHours);
}

export async function getAdminRestaurant() {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const claimedRestaurant = await supabase.rpc("claim_restaurant_by_slug", {
    target_slug: seedRestaurant.slug
  });

  const { data: ensuredRestaurantId } = await supabase.rpc("ensure_owner_profile", {
    restaurant_name: user.user_metadata?.restaurant_name ?? user.user_metadata?.restaurantName ?? seedRestaurant.name,
    owner_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Administrador"
  });
  const restaurantId = claimedRestaurant.data ?? ensuredRestaurantId;

  if (!restaurantId) return null;

  const { data: restaurantRow, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url, cover_url, address, opening_hours, delivery_fee, average_prep_time, is_open, whatsapp")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !restaurantRow) return null;
  const businessHours = await getBusinessHours(restaurantId);
  return mapRestaurant(restaurantRow as RestaurantRow, businessHours);
}

export async function saveRestaurantToSupabase(restaurant: Restaurant) {
  if (!isSupabaseConfigured()) throw new Error("Supabase nao configurado.");

  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Usuario nao autenticado.");

  const weeklySchedule = restaurant.weeklySchedule ?? defaultWeeklySchedule;
  const openingHours = formatScheduleSummary(weeklySchedule);

  const { data: savedRestaurantRow, error: restaurantError } = await supabase.rpc("update_restaurant_settings", {
    target_slug: seedRestaurant.slug,
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    restaurant_whatsapp: restaurant.whatsapp,
    restaurant_logo_url: restaurant.logoUrl ?? null,
    restaurant_cover_url: restaurant.coverUrl ?? null,
    restaurant_delivery_fee: restaurant.deliveryFee,
    restaurant_average_prep_time: restaurant.averagePrepTime,
    restaurant_is_open: restaurant.isOpen,
    restaurant_opening_hours: openingHours,
    weekly_schedule: weeklySchedule
  });

  if (restaurantError) throw restaurantError;
  if (!savedRestaurantRow) throw new Error("Nenhum restaurante foi atualizado no Supabase.");
  const businessHours = await getBusinessHours((savedRestaurantRow as RestaurantRow).id);
  return mapRestaurant(savedRestaurantRow as RestaurantRow, businessHours);
}
