"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ClipboardList, Package, ReceiptText, TicketPercent, TrendingUp, Users, WalletCards } from "lucide-react";
import { getCoupons, getOrders, getProducts, getRestaurant } from "@/lib/data/mock-store";
import { getMenuSnapshot } from "@/lib/data/supabase-menu";
import { getRemoteOrders } from "@/lib/data/supabase-orders";
import { buildReportSummary } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminStatCard } from "@/components/admin/ui/stat-card";

const restaurantSlug = "delicious-gourmet-bolos-e-salgados";

export default function DashboardPage() {
  const [orders, setOrders] = useState(getOrders());
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [coupons, setCoupons] = useState(getCoupons());

  useEffect(() => {
    let ignore = false;

    async function refresh() {
      const [remoteOrders, snapshot] = await Promise.all([
        getRemoteOrders(restaurantSlug).catch(() => null),
        getMenuSnapshot(restaurantSlug).catch(() => null)
      ]);
      if (ignore) return;
      setOrders(remoteOrders ?? getOrders());
      setProducts(snapshot && snapshot.products.length > 0 ? snapshot.products : getProducts());
      setCoupons(getCoupons());
    }

    refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  const report = buildReportSummary(orders);
  const restaurant = getRestaurant();
  const recent = orders.slice(0, 5);
  const newOrders = orders.filter((order) => order.status === "new").length;

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827] lg:text-[32px]">Visão geral</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Acompanhe o desempenho da sua operação em tempo real.</p>
      </div>

      <section className="shrink-0 overflow-hidden rounded-card border border-[#E5E7EB] bg-white shadow-card">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_260px] lg:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7b3f2a]">Komanda.ia para delivery</p>
            <h2 className="mt-1.5 max-w-2xl text-base font-semibold leading-snug text-[#111827] lg:text-lg">Controle pedidos, cardápio e clientes com uma operação pronta para WhatsApp.</h2>
            <p className="mt-2 hidden max-w-2xl text-sm leading-relaxed text-[#6B7280] sm:block">A base já cobre o fluxo comercial essencial: produto cadastrado, cardápio público, pedido recebido e kanban operacional.</p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB]/50 bg-slate-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Status da loja</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <strong className="text-sm font-semibold text-[#111827]">{restaurant.name}</strong>
              <AdminBadge tone={restaurant.isOpen ? "success" : "error"}>{restaurant.isOpen ? "Aberto" : "Fechado"}</AdminBadge>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[#6B7280]"><Clock className="h-3.5 w-3.5 text-[#6B7280]" /> {restaurant.averagePrepTime} min de preparo médio</p>
          </div>
        </div>
      </section>

      <section className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <AdminStatCard label="Vendas" value={report.totalSales} currency icon={WalletCards} tone="green" />
        <AdminStatCard label="Pedidos" value={report.orderCount} icon={ReceiptText} tone="blue" />
        <AdminStatCard label="Novos" value={newOrders} icon={ClipboardList} tone="amber" />
        <AdminStatCard label="Ticket médio" value={report.averageTicket} currency icon={TrendingUp} tone="violet" />
        <AdminStatCard label="Produtos ativos" value={products.filter((product) => product.active).length} icon={Package} tone="brand" />
      </section>

      <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.3fr_0.7fr] lg:gap-5">
        <div className="flex flex-col rounded-card border border-[#E5E7EB] bg-white shadow-card lg:min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-[#E5E7EB]/60 p-4">
            <h2 className="text-sm font-semibold text-[#111827]">Pedidos recentes</h2>
          </div>
          <div className="divide-y divide-[#E5E7EB]/50 px-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {recent.length === 0 && (
              <div className="py-6 text-center text-sm text-[#6B7280]">
                Nenhum pedido ainda.
              </div>
            )}
            {recent.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-slate-50/50">
                <div className="min-w-0">
                  <strong className="block truncate text-sm font-medium text-[#111827]">{order.code} — {order.customer.name}</strong>
                  <p className="text-xs text-[#6B7280]">{order.items.length} item(ns) · {formatCurrency(order.total)}</p>
                </div>
                <AdminBadge tone={order.status === "cancelled" ? "error" : order.status === "finished" ? "success" : "warning"}>{order.status}</AdminBadge>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-card lg:min-h-0 lg:overflow-y-auto lg:p-5">
          <h2 className="text-sm font-semibold text-[#111827]">Operação</h2>
          <div className="mt-3 space-y-2.5 text-sm">
            <div className="flex items-center gap-3 text-[#111827]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Clock className="h-3.5 w-3.5" /></span>
              <span className="text-[#6B7280]">Preparo:</span> <strong>{restaurant.averagePrepTime} min médio</strong>
            </div>
            <div className="flex items-center gap-3 text-[#111827]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Package className="h-3.5 w-3.5" /></span>
              <span className="text-[#6B7280]">Produtos:</span> <strong>{products.length} cadastrados</strong>
            </div>
            <div className="flex items-center gap-3 text-[#111827]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><TicketPercent className="h-3.5 w-3.5" /></span>
              <span className="text-[#6B7280]">Cupons:</span> <strong>{coupons.filter((coupon) => coupon.active).length} ativos</strong>
            </div>
            <div className="flex items-center gap-3 text-[#111827]">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Users className="h-3.5 w-3.5" /></span>
              <span className="text-[#6B7280]">Clientes:</span> <strong>Base inicial pronta</strong>
            </div>
            <div className="grid gap-2 border-t border-[#E5E7EB]/50 pt-2.5">
              <Link className="inline-flex h-9 items-center justify-center rounded-control border border-[#E5E7EB] bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50" href="/dashboard/pedidos">Abrir kanban de pedidos</Link>
              <Link className="inline-flex h-9 items-center justify-center rounded-control border border-[#E5E7EB] bg-white px-3.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50" href="/dashboard/cupons">Criar cupom promocional</Link>
            </div>
            <div className="hidden rounded-xl border border-[#E5E7EB]/60 bg-slate-50/50 p-3 xl:block">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Próximo passo</p>
              <p className="mt-1 text-xs leading-relaxed text-[#111827]">Conectar Supabase e Evolution API mantendo a mesma camada de domínio.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
