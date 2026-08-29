"use client";

import { useEffect, useState } from "react";
import { Clock, ImagePlus, Pencil, Save, Trash2 } from "lucide-react";
import { getRestaurant, saveRestaurant } from "@/lib/data/mock-store";
import { defaultWeeklySchedule, formatScheduleSummary, getAdminRestaurant, isSupabaseConfigured, saveRestaurantBannerUrl, saveRestaurantToSupabase } from "@/lib/data/supabase-restaurant";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import type { Restaurant, WeekdaySchedule } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";

const assetsBucket = "restaurant-assets";
const maxHeroImageSizeInBytes = 5 * 1024 * 1024;
const allowedHeroImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function CompanyPage() {
  const [form, setForm] = useState<Restaurant>(() => {
    const restaurant = getRestaurant();
    return {
      ...restaurant,
      weeklySchedule: restaurant.weeklySchedule ?? defaultWeeklySchedule
    };
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [heroPreviewUrl, setHeroPreviewUrl] = useState<string | null>(null);
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMessage, setHeroMessage] = useState("");

  const schedule = form.weeklySchedule ?? defaultWeeklySchedule;

  useEffect(() => {
    let ignore = false;

    async function loadRestaurant() {
      setLoading(true);
      const remoteRestaurant = await getAdminRestaurant();
      if (!ignore && remoteRestaurant) {
        saveRestaurant(remoteRestaurant);
        setForm(remoteRestaurant);
      }
      if (!ignore) setLoading(false);
    }

    loadRestaurant().catch(() => {
      if (!ignore) {
        setMessage("Não foi possível carregar do Supabase. Usando dados locais temporariamente.");
        setLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (heroPreviewUrl) URL.revokeObjectURL(heroPreviewUrl);
    };
  }, [heroPreviewUrl]);

  function updateSchedule(day: number, patch: Partial<WeekdaySchedule>) {
    setForm((current) => ({
      ...current,
      weeklySchedule: (current.weeklySchedule ?? defaultWeeklySchedule).map((item) => (item.day === day ? { ...item, ...patch } : item))
    }));
    setMessage("");
  }

  async function handleHeroImage(file?: File) {
    if (!file) return;
    if (!allowedHeroImageTypes.includes(file.type)) {
      setHeroMessage("Use uma imagem JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > maxHeroImageSizeInBytes) {
      setHeroMessage("A imagem do hero deve ter no máximo 5 MB.");
      return;
    }

    setHeroPreviewUrl(URL.createObjectURL(file));
    setHeroSaving(true);
    setHeroMessage("Enviando e publicando a nova imagem...");

    try {
      const bannerUrl = await uploadHeroImage(file);
      await saveRestaurantBannerUrl(form.id, bannerUrl);
      const nextRestaurant = { ...form, bannerUrl };
      saveRestaurant(nextRestaurant);
      setForm(nextRestaurant);
      setHeroMessage("Imagem publicada. O cardápio digital já está usando este banner.");
    } catch (error) {
      setHeroMessage(error instanceof Error ? `Falha ao publicar a imagem: ${error.message}` : "Falha ao publicar a imagem.");
    } finally {
      setHeroSaving(false);
      setHeroPreviewUrl(null);
    }
  }

  async function removeHeroImage() {
    setHeroSaving(true);
    setHeroMessage("Removendo imagem do cardápio...");
    try {
      await saveRestaurantBannerUrl(form.id, undefined);
      const nextRestaurant = { ...form, bannerUrl: undefined };
      saveRestaurant(nextRestaurant);
      setForm(nextRestaurant);
      setHeroPreviewUrl(null);
      setHeroMessage("Imagem removida do hero do cardápio digital.");
    } catch (error) {
      setHeroMessage(error instanceof Error ? `Falha ao remover a imagem: ${error.message}` : "Falha ao remover a imagem.");
    } finally {
      setHeroSaving(false);
    }
  }

  async function uploadHeroImage(file: File) {
    async function uploadLocalFallback() {
      const body = new FormData();
      body.append("file", file);
      body.append("restaurantId", form.id);
      const response = await fetch("/api/uploads/restaurant-asset", { method: "POST", body });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível salvar a imagem do hero.");
      }
      return ((await response.json()) as { url: string }).url;
    }

    if (!isSupabaseConfigured()) return uploadLocalFallback();

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `restaurants/${form.id}/hero/hero-${Date.now()}.${extension}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from(assetsBucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });

    if (error) return uploadLocalFallback();
    const { data } = supabase.storage.from(assetsBucket).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  async function handleSave() {
    setSaving(true);

    try {
      const nextRestaurant = {
        ...form,
        deliveryFee: Number(form.deliveryFee) || 0,
        averagePrepTime: Number(form.averagePrepTime) || 0,
        openingHours: formatScheduleSummary(schedule)
      };
      const saved = await saveRestaurantToSupabase(nextRestaurant);
      saveRestaurant(saved);
      setForm(saved);
      setHeroPreviewUrl(null);
      setMessage("Configurações salvas no Supabase. O cardápio público já usa estes horários.");
    } catch (error) {
      setMessage(error instanceof Error ? `Falha ao salvar no Supabase: ${error.message}` : "Falha ao salvar no Supabase.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 lg:text-[32px]">Empresa</h1>
        <p className="mt-1 text-sm text-slate-500">Configurações exibidas no cardápio público e usadas nos pedidos.</p>
      </div>

      <div className="scrollbar-clean lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Dados da empresa</h2>
            <AdminBadge tone={form.isOpen ? "success" : "error"}>{loading ? "Carregando Supabase" : form.isOpen ? "Aceitando pedidos" : "Pausado manualmente"}</AdminBadge>
          </div>

          <form className="mt-6 grid gap-4 md:grid-cols-2">
            <AdminInput value={form.name} placeholder="Nome do restaurante" onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <AdminInput value={form.slug} placeholder="URL única" onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            <AdminInput className="md:col-span-2" value={form.address} placeholder="Endereço" onChange={(event) => setForm({ ...form, address: event.target.value })} />
            <AdminInput value={form.whatsapp} placeholder="WhatsApp" onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
            <AdminInput value={form.deliveryFee} type="number" placeholder="Taxa de entrega" onChange={(event) => setForm({ ...form, deliveryFee: Number(event.target.value) })} />
            <AdminInput value={form.averagePrepTime} type="number" placeholder="Tempo médio de preparo" onChange={(event) => setForm({ ...form, averagePrepTime: Number(event.target.value) })} />

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ImagePlus className="h-4 w-4 text-brand-600" />
                  Imagem do hero
                </h3>
                <p className="mt-1 text-xs text-slate-500">Banner exibido no topo do cardápio público. A alteração é publicada automaticamente. Recomendado: proporção 5:1, até 5 MB.</p>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                {heroPreviewUrl || form.bannerUrl ? (
                  <img
                    src={heroPreviewUrl ?? form.bannerUrl}
                    alt="Pré-visualização do hero"
                    className="aspect-[5/1] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[5/1] min-h-28 items-center justify-center gap-2 text-sm text-slate-400">
                    <ImagePlus className="h-5 w-5" />
                    Nenhuma imagem no hero
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <label className={`inline-flex h-9 items-center justify-center gap-2 rounded-control border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 shadow-sm transition ${heroSaving ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-slate-50"}`}>
                  {heroPreviewUrl || form.bannerUrl ? <Pencil className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
                  {heroPreviewUrl || form.bannerUrl ? "Editar imagem" : "Adicionar imagem"}
                  <input
                    className="sr-only"
                    type="file"
                    disabled={heroSaving}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(event) => {
                      handleHeroImage(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {(heroPreviewUrl || form.bannerUrl) && (
                  <AdminButton disabled={heroSaving} variant="danger" onClick={removeHeroImage} type="button">
                    <Trash2 className="h-4 w-4" />
                    Remover imagem
                  </AdminButton>
                )}
              </div>
              {heroMessage && <p className="mt-3 text-xs font-medium text-brand-700">{heroMessage}</p>}
            </div>

            <div className="rounded-xl bg-slate-50 p-5 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Clock className="h-4 w-4 text-brand-600" />
                    Horário de funcionamento
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Fora desses horários, os botões do cardápio ficam bloqueados automaticamente.</p>
                </div>
                <button
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${form.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  onClick={() => setForm({ ...form, isOpen: !form.isOpen })}
                  type="button"
                >
                  {form.isOpen ? "Loja online" : "Loja pausada"}
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {schedule.map((day) => (
                  <div key={day.day} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[160px_1fr_1fr] sm:items-center">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <input
                        checked={day.enabled}
                        className="h-4 w-4 accent-brand-600"
                        onChange={(event) => updateSchedule(day.day, { enabled: event.target.checked })}
                        type="checkbox"
                      />
                      {day.label}
                    </label>
                    <AdminInput disabled={!day.enabled} type="time" value={day.open} onChange={(event) => updateSchedule(day.day, { open: event.target.value })} />
                    <AdminInput disabled={!day.enabled} type="time" value={day.close} onChange={(event) => updateSchedule(day.day, { close: event.target.value })} />
                  </div>
                ))}
              </div>
            </div>

            <AdminButton className="md:col-span-2" disabled={loading || saving} onClick={handleSave} type="button">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar configurações"}
            </AdminButton>
            {message && <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 md:col-span-2">{message}</p>}
          </form>
        </div>

        <aside className="h-fit rounded-card border border-slate-200 bg-white p-6 shadow-card">
          <div className="rounded-xl bg-slate-900 p-4">
            <img src={form.logoUrl ?? "/komanda-logo.png"} alt={form.name} className="h-24 w-24 rounded-lg bg-white object-contain p-2" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-slate-900">{form.name}</h3>
          <p className="mt-2 text-sm text-slate-500">{form.address}</p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <p>Taxa: <strong className="text-slate-900">{formatCurrency(Number(form.deliveryFee) || 0)}</strong></p>
            <p>Preparo: <strong className="text-slate-900">{form.averagePrepTime} min</strong></p>
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{formatScheduleSummary(schedule)}</p>
            <AdminBadge tone={form.isOpen ? "success" : "error"}>{form.isOpen ? "Aberto manualmente" : "Fechado manualmente"}</AdminBadge>
          </div>
        </aside>
      </section>
      </div>
    </div>
  );
}
