"use client";

import { decimalNumberKeyDown, integerNumberKeyDown } from "@/lib/masks";
import { useEffect, useMemo, useState } from "react";
import { Percent, Plus, ToggleLeft, ToggleRight, TicketPercent } from "lucide-react";
import { getCoupons, getRestaurant, saveCoupon, toggleCoupon } from "@/lib/data/mock-store";
import { createRemoteCoupon, getRemoteCoupons, getRestaurantIdBySlug, setRemoteCouponActive } from "@/lib/data/supabase-coupons";
import { formatCurrency } from "@/lib/utils";
import type { Coupon, CouponType } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/input";

const typeLabels: Record<CouponType, string> = {
  percent: "Percentual",
  fixed: "Valor fixo",
  delivery: "Frete grátis"
};

function describeCoupon(coupon: Coupon) {
  if (coupon.type === "percent") return `${coupon.value}% de desconto`;
  if (coupon.type === "fixed") return `${formatCurrency(coupon.value)} de desconto`;
  return "Remove a taxa de entrega";
}

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export function CouponManager() {
  const restaurant = getRestaurant();
  // Com Supabase os cupons ficam no banco e valem para todos os clientes; o localStorage só vale no modo local.
  const [coupons, setCoupons] = useState<Coupon[]>(() => (supabaseConfigured ? [] : getCoupons()));
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percent" as CouponType,
    value: "10",
    usageLimit: "100",
    minimumOrderValue: "0",
    expiresAt: ""
  });

  useEffect(() => {
    if (!supabaseConfigured) {
      setCoupons(getCoupons());
      return;
    }

    let ignore = false;
    async function loadRemoteCoupons() {
      const id = await getRestaurantIdBySlug(restaurant.slug);
      if (ignore) return;
      if (!id) {
        setMessage("Não foi possível localizar o restaurante no Supabase.");
        return;
      }
      setRestaurantId(id);
      const remote = await getRemoteCoupons(id);
      if (ignore) return;
      if (remote) setCoupons(remote);
      else setMessage("Não foi possível carregar os cupons do Supabase.");
    }

    loadRemoteCoupons().catch(() => {
      if (!ignore) setMessage("Não foi possível carregar os cupons do Supabase.");
    });
    return () => {
      ignore = true;
    };
  }, [restaurant.slug]);

  const activeCoupons = useMemo(() => coupons.filter((coupon) => coupon.active).length, [coupons]);

  function resetForm() {
    setForm({
      code: "",
      description: "",
      type: "percent",
      value: "10",
      usageLimit: "100",
      minimumOrderValue: "0",
      expiresAt: ""
    });
  }

  async function createCoupon() {
    if (!form.code.trim()) return;
    const type = form.type;

    if (supabaseConfigured) {
      if (!restaurantId) {
        setMessage("Restaurante ainda não carregado. Tente novamente em instantes.");
        return;
      }
      setSaving(true);
      setMessage("");
      try {
        const created = await createRemoteCoupon(restaurantId, {
          code: form.code,
          description: form.description || describeCoupon({ type, value: Number(form.value || 0) } as Coupon),
          type,
          value: type === "delivery" ? 0 : Number(form.value || 0),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
          minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : undefined,
          // fim do dia no horário local, para o cupom valer durante todo o último dia
          expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : undefined
        });
        setCoupons((current) => [created, ...current]);
        resetForm();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível criar o cupom.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const next = saveCoupon({
      id: `coupon_${Date.now()}`,
      restaurantId: restaurant.id,
      code: form.code,
      description: form.description || describeCoupon({ type, value: Number(form.value || 0) } as Coupon),
      type,
      value: type === "delivery" ? 0 : Number(form.value || 0),
      active: true,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      usedCount: 0,
      minimumOrderValue: form.minimumOrderValue ? Number(form.minimumOrderValue) : undefined,
      expiresAt: form.expiresAt || undefined,
      createdAt: new Date().toISOString()
    });
    setCoupons(next);
    resetForm();
  }

  async function switchStatus(couponId: string) {
    if (!supabaseConfigured) {
      setCoupons(toggleCoupon(couponId));
      return;
    }

    const coupon = coupons.find((item) => item.id === couponId);
    if (!coupon) return;
    setMessage("");
    try {
      await setRemoteCouponActive(couponId, !coupon.active);
      setCoupons((current) => current.map((item) => (item.id === couponId ? { ...item, active: !item.active } : item)));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível alterar o cupom.");
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] lg:text-[32px]">Cupons</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Crie ofertas para o checkout do cardápio.</p>
      </div>

      <div className="scrollbar-clean lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <section className="h-fit rounded-card border border-[#E5E7EB] bg-white p-5 shadow-card xl:sticky xl:top-0">
          <div className="flex items-center gap-2.5 border-b border-[#E5E7EB]/50 pb-4">
            <TicketPercent className="h-4 w-4 text-[#6B7280]" />
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Novo cupom</h2>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <AdminInput placeholder="Código do cupom. Ex: DEL10" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
            <AdminTextarea placeholder="Descrição comercial" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <AdminSelect value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as CouponType })}>
              <option value="percent">Percentual</option>
              <option value="fixed">Valor fixo</option>
              <option value="delivery">Frete grátis</option>
            </AdminSelect>
            {form.type !== "delivery" && (
              <AdminInput placeholder={form.type === "percent" ? "Percentual. Ex: 10" : "Valor em R$. Ex: 5"} type="number" min="0" step="0.01" inputMode="decimal" onKeyDown={decimalNumberKeyDown} value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
            )}
            <AdminInput placeholder="Pedido mínimo" type="number" min="0" step="0.01" inputMode="decimal" onKeyDown={decimalNumberKeyDown} value={form.minimumOrderValue} onChange={(event) => setForm({ ...form, minimumOrderValue: event.target.value })} />
            <AdminInput placeholder="Limite de uso" type="number" min="0" step="1" inputMode="numeric" onKeyDown={integerNumberKeyDown} value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} />
            <AdminInput placeholder="Validade" type="date" value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
            <AdminButton className="w-full" disabled={saving} onClick={createCoupon} type="button">
              <Plus className="h-4 w-4" />
              {saving ? "Salvando..." : "Criar cupom"}
            </AdminButton>
            {message && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{message}</p>}
          </div>
        </section>

        <section className="rounded-card border border-[#E5E7EB] bg-white p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB]/50 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111827]">Cupons cadastrados</h2>
              <p className="text-xs text-[#6B7280]">{coupons.length} cupons, {activeCoupons} ativos no checkout.</p>
            </div>
            <AdminBadge tone="neutral" icon={<Percent className="h-3 w-3" />}>Promoções</AdminBadge>
          </div>

          <div className="mt-5 grid gap-4">
            {coupons.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50/50 p-8 text-center text-sm text-[#6B7280]">Nenhum cupom criado ainda.</div>
            )}
            {coupons.map((coupon) => (
              <article key={coupon.id} className="rounded-xl border border-[#E5E7EB]/60 bg-white p-5 transition-shadow hover:shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm font-semibold text-[#111827]">{coupon.code}</strong>
                      <AdminBadge tone={coupon.active ? "success" : "neutral"}>{coupon.active ? "Ativo" : "Inativo"}</AdminBadge>
                    </div>
                    <p className="mt-1 text-xs text-[#6B7280]">{coupon.description}</p>
                    <p className="mt-2 text-[11px] text-[#6B7280]">
                      {typeLabels[coupon.type]} · {describeCoupon(coupon)}
                      {coupon.minimumOrderValue ? ` · mínimo ${formatCurrency(coupon.minimumOrderValue)}` : ""}
                    </p>
                  </div>
                  <AdminButton variant="secondary" className="h-8 px-2 text-xs" onClick={() => switchStatus(coupon.id)} type="button">
                    {coupon.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    Status
                  </AdminButton>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-[#6B7280] sm:grid-cols-3">
                  <span className="rounded-lg bg-slate-50/60 p-2 border border-[#E5E7EB]/40">Usos: {coupon.usedCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ""}</span>
                  <span className="rounded-lg bg-slate-50/60 p-2 border border-[#E5E7EB]/40">Validade: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString("pt-BR") : "Sem data"}</span>
                  <span className="rounded-lg bg-slate-50/60 p-2 border border-[#E5E7EB]/40">Criado: {new Date(coupon.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
