"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, ExternalLink, Package, ReceiptText, TicketPercent, TrendingUp, Users, WalletCards } from "lucide-react";
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
const paymentLabels = { pix: "Pix", credit_card: "Crédito", debit_card: "Débito" };

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
      setProducts(snapshot?.products.length ? snapshot.products : getProducts());
      setCoupons(getCoupons());
    }
    refresh();
    const interval = window.setInterval(refresh, 15000);
    return () => { ignore = true; window.clearInterval(interval); };
  }, []);

  const report = buildReportSummary(orders);
  const restaurant = getRestaurant();
  const recent = orders.slice(0, 6);
  const activeProducts = products.filter((product) => product.active).length;
  const activeCoupons = coupons.filter((coupon) => coupon.active).length;

  return (
    <div className="flex min-h-full flex-col gap-7 pb-4">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-[#241A17]">Visão geral</h1>
          <p className="mt-1 text-sm text-[#786D68]">Resumo da operação e dos pedidos mais recentes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-[#5F554F]">
            <span className={`h-2 w-2 rounded-full ${restaurant.isOpen ? "bg-emerald-500" : "bg-red-500"}`} />
            {restaurant.isOpen ? "Loja aberta" : "Loja fechada"}
          </div>
          <Link href={`/cardapio/${restaurant.slug}`} target="_blank" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#2F1811] px-3.5 text-sm font-medium text-white transition hover:bg-[#4F2618]">
            Ver cardápio <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section className="grid gap-px overflow-hidden rounded-xl bg-[#E7E1DC] shadow-[0_1px_2px_rgba(36,26,23,0.04)] sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Vendas" value={report.totalSales} currency icon={WalletCards} tone="green" />
        <AdminStatCard label="Pedidos" value={report.orderCount} icon={ReceiptText} tone="blue" />
        <AdminStatCard label="Ticket médio" value={report.averageTicket} currency icon={TrendingUp} tone="violet" />
        <AdminStatCard label="Produtos ativos" value={activeProducts} icon={Package} tone="brand" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-xl bg-white shadow-[0_1px_3px_rgba(36,26,23,0.08)]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-[#241A17]">Pedidos recentes</h2>
              <p className="mt-0.5 text-xs text-[#8A807B]">Últimos pedidos recebidos pela loja</p>
            </div>
            <Link href="/dashboard/pedidos" className="flex items-center gap-1.5 text-xs font-medium text-[#6A3A2A] hover:text-[#A12A22]">Ver todos <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex min-h-[310px] flex-col items-center justify-center border-t border-[#EEE9E5] px-6 text-center">
              <ReceiptText className="h-6 w-6 text-[#B4A8A1]" />
              <h3 className="mt-3 text-sm font-semibold text-[#3A302B]">Nenhum pedido recebido</h3>
              <p className="mt-1 max-w-xs text-sm leading-5 text-[#8A807B]">Os novos pedidos aparecerão aqui assim que forem finalizados no cardápio.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-[#EEE9E5]">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead><tr className="text-[11px] font-medium uppercase tracking-wider text-[#8A807B]"><th className="px-5 py-3">Pedido</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Pagamento</th><th className="px-4 py-3">Total</th><th className="px-5 py-3 text-right">Status</th></tr></thead>
                <tbody className="divide-y divide-[#F0ECE9]">{recent.map((order) => (
                  <tr key={order.id} className="text-sm transition hover:bg-[#FAF8F6]">
                    <td className="px-5 py-3.5 font-medium text-[#241A17]">{order.code}</td>
                    <td className="px-4 py-3.5"><span className="block font-medium text-[#3A302B]">{order.customer.name}</span><span className="text-xs text-[#948983]">{order.items.length} item(ns)</span></td>
                    <td className="px-4 py-3.5 text-[#665C57]">{paymentLabels[order.paymentMethod]}</td>
                    <td className="px-4 py-3.5 font-medium text-[#3A302B]">{formatCurrency(order.total)}</td>
                    <td className="px-5 py-3.5 text-right"><AdminBadge tone={order.status === "cancelled" ? "error" : order.status === "finished" ? "success" : "warning"}>{statusLabels[order.status]}</AdminBadge></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(36,26,23,0.08)]">
            <h2 className="text-sm font-semibold text-[#241A17]">Operação</h2>
            <dl className="mt-4 divide-y divide-[#EEE9E5]">
              <SummaryRow icon={Clock} label="Tempo de preparo" value={`${restaurant.averagePrepTime} min`} />
              <SummaryRow icon={Package} label="Produtos cadastrados" value={`${products.length}`} />
              <SummaryRow icon={TicketPercent} label="Cupons ativos" value={`${activeCoupons}`} />
              <SummaryRow icon={Users} label="Clientes recorrentes" value={`${report.recurringCustomers.length}`} />
            </dl>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(36,26,23,0.08)]">
            <h2 className="text-sm font-semibold text-[#241A17]">Acesso rápido</h2>
            <nav className="mt-3 space-y-1">
              <PlainLink href="/dashboard/pedidos">Gerenciar pedidos</PlainLink>
              <PlainLink href="/dashboard/produtos">Editar produtos</PlainLink>
              <PlainLink href="/dashboard/cupons">Gerenciar cupons</PlainLink>
              <PlainLink href="/dashboard/relatorios">Ver relatórios</PlainLink>
            </nav>
          </div>
        </aside>
      </section>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><Icon className="h-4 w-4 shrink-0 text-[#9B8D86]" /><dt className="flex-1 text-sm text-[#665C57]">{label}</dt><dd className="text-sm font-semibold text-[#2F2520]">{value}</dd></div>;
}

function PlainLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="group flex items-center justify-between rounded-md px-2 py-2 text-sm text-[#5F554F] transition hover:bg-[#F6F2EF] hover:text-[#2F1811]"><span>{children}</span><ArrowRight className="h-3.5 w-3.5 text-[#B1A59F] transition group-hover:translate-x-0.5 group-hover:text-[#6A3A2A]" /></Link>;
}
