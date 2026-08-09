"use client";

import { useEffect, useState } from "react";
import { getOrders } from "@/lib/data/mock-store";
import { buildReportSummary } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import { AdminStatCard } from "@/components/admin/ui/stat-card";
import { Package, ReceiptText, TrendingUp, Users, WalletCards } from "lucide-react";

export default function ReportsPage() {
  const [orders, setOrders] = useState(getOrders());

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  const report = buildReportSummary(orders);

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#111827] lg:text-[32px]">Relatórios</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Desempenho de vendas, produtos e clientes.</p>
      </div>

      <section className="grid shrink-0 gap-3 md:grid-cols-3">
        <AdminStatCard label="Total de vendas" value={report.totalSales} currency icon={WalletCards} tone="green" />
        <AdminStatCard label="Quantidade de pedidos" value={report.orderCount} icon={ReceiptText} tone="blue" />
        <AdminStatCard label="Ticket médio" value={report.averageTicket} currency icon={TrendingUp} tone="violet" />
      </section>
      <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col rounded-card border border-[#E5E7EB] bg-white p-5 shadow-card lg:min-h-0">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">Produtos mais vendidos</h2>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Package className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {report.topProducts.length === 0 && <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50 p-6 text-center text-sm text-[#6B7280]">Sem vendas registradas ainda.</p>}
            {report.topProducts.map((product) => (
              <div key={product.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="truncate font-medium text-[#111827]">{product.name}</span>
                <strong className="shrink-0 pl-2 text-[#111827]">{product.quantity} un · {formatCurrency(product.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col rounded-card border border-[#E5E7EB] bg-white p-5 shadow-card lg:min-h-0">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h2 className="text-sm font-semibold text-[#111827]">Clientes recorrentes</h2>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <Users className="h-4 w-4" />
            </span>
          </div>
          <div className="space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {report.recurringCustomers.length === 0 && <p className="rounded-xl border border-dashed border-[#E5E7EB] bg-slate-50 p-6 text-center text-sm text-[#6B7280]">Sem clientes recorrentes ainda.</p>}
            {report.recurringCustomers.map((customer) => (
              <div key={customer.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="truncate font-medium text-[#111827]">{customer.name}</span>
                <strong className="shrink-0 pl-2 text-[#111827]">{customer.orders} pedidos · {formatCurrency(customer.totalSpent)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
