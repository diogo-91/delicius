"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock3, ClipboardList, ExternalLink, Package, Plus, ReceiptText, ShoppingBag, Sparkles, Store, TicketPercent, TrendingUp, Users, WalletCards } from "lucide-react";
import { getCoupons, getOrders, getProducts, getRestaurant } from "@/lib/data/mock-store";
import { getMenuSnapshot } from "@/lib/data/supabase-menu";
import { getRemoteOrders } from "@/lib/data/supabase-orders";
import { buildReportSummary } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import type { OrderStatus, Product } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminStatCard } from "@/components/admin/ui/stat-card";

const restaurantSlug = "delicious-gourmet-bolos-e-salgados";
const statusLabels: Record<OrderStatus, string> = { new: "Novo", preparing: "Em preparo", ready: "Pronto", out_for_delivery: "Em entrega", finished: "Finalizado", cancelled: "Cancelado" };

export default function DashboardPage() {
  const [orders, setOrders] = useState(getOrders());
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [coupons, setCoupons] = useState(getCoupons());

  useEffect(() => {
    let ignore = false;
    async function refresh() {
      const [remoteOrders, snapshot] = await Promise.all([getRemoteOrders(restaurantSlug).catch(() => null), getMenuSnapshot(restaurantSlug).catch(() => null)]);
      if (ignore) return;
      setOrders(remoteOrders ?? getOrders());
      setProducts(snapshot && snapshot.products.length > 0 ? snapshot.products : getProducts());
      setCoupons(getCoupons());
    }
    refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => { ignore = true; window.clearInterval(interval); };
  }, []);

  const report = buildReportSummary(orders);
  const restaurant = getRestaurant();
  const recent = orders.slice(0, 5);
  const newOrders = orders.filter((order) => order.status === "new").length;
  const activeProducts = products.filter((product) => product.active).length;
  const activeCoupons = coupons.filter((coupon) => coupon.active).length;

  return (
    <div className="flex min-h-full flex-col gap-5 pb-2">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#9A5A3C]"><span className="h-1.5 w-1.5 rounded-full bg-[#D4A72C]" />Central de gestão</div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[#2B1711] lg:text-[38px]">Visão geral</h1>
          <p className="mt-1.5 text-sm text-[#75645D]">Tudo o que você precisa para acompanhar sua operação hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/cardapio/${restaurant.slug}`} target="_blank" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#4F2618] shadow-[0_8px_24px_rgba(79,38,24,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(79,38,24,0.12)]">Ver cardápio <ExternalLink className="h-4 w-4" /></Link>
          <Link href="/dashboard/pedidos" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#B3261E] px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(179,38,30,0.2)] transition hover:-translate-y-0.5 hover:bg-[#8F1D2C]">Pedidos <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#4F2618] via-[#5C3020] to-[#35170F] p-5 text-white shadow-[0_22px_55px_rgba(79,38,24,0.18)] sm:p-6">
        <div className="pointer-events-none absolute -right-14 -top-24 h-64 w-64 rounded-full bg-[#D4A72C]/20 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-32 w-32 rounded-full bg-[#B3261E]/30 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F6D77C]"><Sparkles className="h-3.5 w-3.5" /> Operação em tempo real</span>
            <h2 className="mt-4 max-w-2xl font-display text-2xl font-bold leading-tight sm:text-[30px]">Sua doceria, organizada para vender mais e atender melhor.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Acompanhe pedidos, produtos e desempenho sem perder tempo com processos complicados.</p>
          </div>
          <div className="flex min-w-[260px] items-center gap-4 rounded-2xl bg-white/[0.09] p-4 backdrop-blur-sm">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#D4A72C] text-[#3A1F16] shadow-lg"><Store className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${restaurant.isOpen ? "bg-emerald-400" : "bg-red-400"}`} /><p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">Loja {restaurant.isOpen ? "aberta" : "fechada"}</p></div>
              <strong className="mt-1 block truncate text-sm font-semibold">{restaurant.name}</strong>
              <span className="mt-1 flex items-center gap-1.5 text-xs text-white/60"><Clock3 className="h-3.5 w-3.5" /> {restaurant.averagePrepTime} min de preparo</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard label="Vendas realizadas" value={report.totalSales} currency icon={WalletCards} tone="green" />
        <AdminStatCard label="Total de pedidos" value={report.orderCount} icon={ReceiptText} tone="blue" />
        <AdminStatCard label="Aguardando aceite" value={newOrders} icon={ClipboardList} tone="amber" />
        <AdminStatCard label="Ticket médio" value={report.averageTicket} currency icon={TrendingUp} tone="violet" />
        <AdminStatCard label="Produtos disponíveis" value={activeProducts} icon={Package} tone="brand" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_12px_40px_rgba(79,38,24,0.07)]">
          <div className="flex items-center justify-between px-5 py-4 sm:px-6">
            <div><h2 className="font-display text-lg font-bold text-[#2B1711]">Pedidos recentes</h2><p className="mt-0.5 text-xs text-[#8A756C]">Atualização automática a cada 15 segundos</p></div>
            <Link href="/dashboard/pedidos" className="inline-flex items-center gap-1 text-xs font-semibold text-[#7B3F2A] transition hover:text-[#B3261E]">Ver todos <ArrowUpRight className="h-3.5 w-3.5" /></Link>
          </div>
          {recent.length === 0 ? (
            <div className="mx-4 mb-4 flex min-h-[245px] flex-col items-center justify-center rounded-[18px] bg-[#FBF7F2] px-6 text-center sm:mx-5 sm:mb-5">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#9A5A3C] shadow-[0_10px_28px_rgba(79,38,24,0.09)]"><ShoppingBag className="h-6 w-6" /></span>
              <h3 className="mt-4 font-display text-lg font-bold text-[#3A1F16]">Pronta para o próximo pedido</h3>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#75645D]">Quando um cliente finalizar uma compra, o pedido aparecerá aqui automaticamente.</p>
              <Link href={`/cardapio/${restaurant.slug}`} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#7B3F2A] hover:text-[#B3261E]">Abrir cardápio digital <ExternalLink className="h-4 w-4" /></Link>
            </div>
          ) : (
            <div className="px-3 pb-3 sm:px-4 sm:pb-4">{recent.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition hover:bg-[#FBF7F2]">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FBF0EA] text-[#7B3F2A]"><ReceiptText className="h-4 w-4" /></span><div className="min-w-0"><strong className="block truncate text-sm font-semibold text-[#2B1711]">{order.code} · {order.customer.name}</strong><p className="mt-0.5 text-xs text-[#8A756C]">{order.items.length} item(ns) · {formatCurrency(order.total)}</p></div></div>
                <AdminBadge tone={order.status === "cancelled" ? "error" : order.status === "finished" ? "success" : "warning"}>{statusLabels[order.status]}</AdminBadge>
              </div>
            ))}</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] bg-white p-5 shadow-[0_12px_40px_rgba(79,38,24,0.07)]">
            <div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold text-[#2B1711]">Resumo da operação</h2><p className="mt-0.5 text-xs text-[#8A756C]">Configuração atual da loja</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FBF0EA] text-[#7B3F2A]"><Store className="h-4 w-4" /></span></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <OperationItem icon={Clock3} label="Preparo" value={`${restaurant.averagePrepTime} min`} tone="amber" />
              <OperationItem icon={Package} label="Produtos" value={`${products.length}`} tone="blue" />
              <OperationItem icon={TicketPercent} label="Cupons ativos" value={`${activeCoupons}`} tone="violet" />
              <OperationItem icon={Users} label="Clientes" value={`${report.recurringCustomers.length}`} tone="green" />
            </div>
          </div>
          <div className="rounded-[22px] bg-[#F4E8DC] p-5 shadow-[0_12px_40px_rgba(79,38,24,0.06)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9A5A3C]">Atalhos rápidos</p>
            <div className="mt-3 grid gap-2"><QuickAction href="/dashboard/produtos" icon={Plus} label="Adicionar novo produto" /><QuickAction href="/dashboard/cupons" icon={TicketPercent} label="Criar cupom promocional" /><QuickAction href="/dashboard/pedidos" icon={ClipboardList} label="Acessar gestão de pedidos" /></div>
          </div>
        </div>
      </section>
    </div>
  );
}

const operationTones = { amber: "bg-amber-50 text-amber-600", blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600" } as const;

function OperationItem({ icon: Icon, label, value, tone }: { icon: typeof Clock3; label: string; value: string; tone: keyof typeof operationTones }) {
  return <div className="rounded-2xl bg-[#FBF8F4] p-3.5"><span className={`grid h-8 w-8 place-items-center rounded-lg ${operationTones[tone]}`}><Icon className="h-4 w-4" /></span><strong className="mt-3 block text-base font-bold text-[#2B1711]">{value}</strong><span className="mt-0.5 block text-[11px] text-[#8A756C]">{label}</span></div>;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof Plus; label: string }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 text-sm font-semibold text-[#4F2618] transition hover:bg-white hover:shadow-sm"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-[#9A5A3C] shadow-sm"><Icon className="h-4 w-4" /></span><span className="flex-1">{label}</span><ArrowUpRight className="h-4 w-4 text-[#B9A096] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#7B3F2A]" /></Link>;
}
