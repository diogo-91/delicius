"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarRange, CreditCard, Download, LoaderCircle, Package, ReceiptText, RefreshCw, ShoppingBag, TrendingUp, Truck, Users, WalletCards, XCircle } from "lucide-react";
import { getOrders, getRestaurant } from "@/lib/data/mock-store";
import { getRemoteOrders } from "@/lib/data/supabase-orders";
import { buildDetailedReport, type ReportBreakdown } from "@/lib/reports";
import { formatCurrency } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/domain";
import { AdminBadge } from "@/components/admin/ui/badge";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminStatCard } from "@/components/admin/ui/stat-card";

type PeriodPreset = "today" | "7d" | "30d" | "90d" | "all" | "custom";

const statusLabels: Record<OrderStatus, string> = {
  new: "Novo", preparing: "Em preparo", ready: "Pronto", out_for_delivery: "Em entrega", finished: "Finalizado", cancelled: "Cancelado"
};

function toInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function presetDates(preset: PeriodPreset) {
  const end = new Date();
  const start = new Date(end);
  if (preset === "today") return { start: toInputDate(end), end: toInputDate(end) };
  if (preset === "7d") start.setDate(start.getDate() - 6);
  if (preset === "30d") start.setDate(start.getDate() - 29);
  if (preset === "90d") start.setDate(start.getDate() - 89);
  if (preset === "all") return { start: "", end: "" };
  return { start: toInputDate(start), end: toInputDate(end) };
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function periodLabel(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "Todo o período";
  const start = startDate ? new Date(`${startDate}T12:00:00`).toLocaleDateString("pt-BR") : "início";
  const end = endDate ? new Date(`${endDate}T12:00:00`).toLocaleDateString("pt-BR") : "hoje";
  return `${start} a ${end}`;
}

export default function ReportsPage() {
  const initialDates = presetDates("30d");
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [preset, setPreset] = useState<PeriodPreset>("30d");
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function refreshOrders() {
    setLoading(true);
    try {
      const remoteOrders = await getRemoteOrders(getRestaurant().slug);
      setOrders(remoteOrders ?? getOrders());
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshOrders().catch(() => setLoading(false));
    const interval = window.setInterval(() => refreshOrders().catch(() => undefined), 15000);
    return () => window.clearInterval(interval);
  }, []);

  const filteredOrders = useMemo(() => {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;
    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return (!start || createdAt >= start) && (!end || createdAt <= end);
    });
  }, [orders, startDate, endDate]);

  const report = useMemo(() => buildDetailedReport(filteredOrders), [filteredOrders]);
  const recentOrders = useMemo(() => [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10), [filteredOrders]);
  const maxDailySales = Math.max(...report.dailySales.map((day) => day.total), 1);

  function selectPreset(nextPreset: PeriodPreset) {
    const dates = presetDates(nextPreset);
    setPreset(nextPreset);
    setStartDate(dates.start);
    setEndDate(dates.end);
  }

  async function downloadPdf() {
    setExporting(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const restaurant = getRestaurant();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      doc.setFillColor(52, 25, 18);
      doc.rect(0, 0, pageWidth, 34, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Relatório de desempenho", margin, 15);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(restaurant.name, margin, 22);
      doc.text(`Período: ${periodLabel(startDate, endDate)}`, margin, 28);

      const metrics = [
        ["Vendas", formatCurrency(report.totalSales)], ["Pedidos", String(report.orderCount)], ["Ticket médio", formatCurrency(report.averageTicket)],
        ["Clientes", String(report.uniqueCustomers)], ["Itens vendidos", String(report.totalItems)], ["Cancelamentos", `${report.cancelledOrders} (${report.cancellationRate.toFixed(1)}%)`]
      ];
      metrics.forEach(([label, value], index) => {
        const x = margin + (index % 3) * 61;
        const y = 42 + Math.floor(index / 3) * 20;
        doc.setFillColor(248, 246, 244);
        doc.roundedRect(x, y, 56, 15, 2, 2, "F");
        doc.setTextColor(105, 91, 86);
        doc.setFontSize(7);
        doc.text(label, x + 3, y + 5);
        doc.setTextColor(36, 26, 23);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(value, x + 3, y + 11);
        doc.setFont("helvetica", "normal");
      });

      autoTable(doc, {
        startY: 86,
        head: [["Data", "Pedidos", "Faturamento"]],
        body: report.dailySales.map((day) => [formatDate(day.date), String(day.orders), formatCurrency(day.total)]),
        theme: "grid", headStyles: { fillColor: [123, 63, 42] }, styles: { fontSize: 8, cellPadding: 2.2 }, margin: { left: margin, right: margin }
      });
      const dailyEnd = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 86;
      autoTable(doc, {
        startY: dailyEnd + 8,
        head: [["Produto", "Quantidade", "Receita"]],
        body: report.topProducts.slice(0, 12).map((product) => [product.name, String(product.quantity), formatCurrency(product.revenue)]),
        theme: "striped", headStyles: { fillColor: [52, 25, 18] }, styles: { fontSize: 8, cellPadding: 2.2 }, margin: { left: margin, right: margin }
      });
      autoTable(doc, {
        head: [["Cliente", "Pedidos", "Total gasto"]],
        body: report.recurringCustomers.slice(0, 15).map((customer) => [customer.name, String(customer.orders), formatCurrency(customer.totalSpent)]),
        theme: "striped", headStyles: { fillColor: [52, 25, 18] }, styles: { fontSize: 8, cellPadding: 2.2 }, margin: { left: margin, right: margin }
      });

      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page += 1) {
        doc.setPage(page);
        doc.setTextColor(120, 110, 105);
        doc.setFontSize(7);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, 291);
        doc.text(`Página ${page} de ${pages}`, pageWidth - margin, 291, { align: "right" });
      }
      doc.save(`relatorio-${startDate || "inicio"}-${endDate || "hoje"}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold leading-tight tracking-tight text-[#111827] lg:text-[32px]">Relatórios</h1><p className="mt-1 text-sm text-[#6B7280]">Visão completa de vendas, pedidos, produtos e clientes.</p></div>
        <div className="flex flex-wrap gap-2">
          <AdminButton disabled={loading} variant="secondary" onClick={() => refreshOrders()} type="button"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</AdminButton>
          <AdminButton disabled={exporting || loading} onClick={downloadPdf} type="button">{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? "Gerando PDF..." : "Baixar PDF"}</AdminButton>
        </div>
      </header>

      <section className="rounded-card border border-[#E5E7EB] bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {(["today", "7d", "30d", "90d", "all"] as PeriodPreset[]).map((item) => (
              <button key={item} className={`h-9 rounded-control px-3 text-sm font-medium transition ${preset === item ? "bg-brand-600 text-white" : "border border-[#E5E7EB] bg-white text-slate-600 hover:bg-slate-50"}`} onClick={() => selectPreset(item)} type="button">
                {{ today: "Hoje", "7d": "7 dias", "30d": "30 dias", "90d": "90 dias", all: "Tudo", custom: "Personalizado" }[item]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-end gap-2">
            <label className="text-xs font-medium text-slate-500">De<AdminInput className="mt-1 w-36" type="date" value={startDate} onChange={(event) => { setPreset("custom"); setStartDate(event.target.value); }} /></label>
            <label className="text-xs font-medium text-slate-500">Até<AdminInput className="mt-1 w-36" type="date" value={endDate} onChange={(event) => { setPreset("custom"); setEndDate(event.target.value); }} /></label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="flex items-center gap-1.5"><CalendarRange className="h-3.5 w-3.5" />{periodLabel(startDate, endDate)}</span><span>{lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Carregando dados..."}</span></div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Faturamento" value={report.totalSales} currency icon={WalletCards} tone="green" />
        <AdminStatCard label="Pedidos válidos" value={report.orderCount} icon={ReceiptText} tone="blue" />
        <AdminStatCard label="Ticket médio" value={report.averageTicket} currency icon={TrendingUp} tone="violet" />
        <AdminStatCard label="Clientes únicos" value={report.uniqueCustomers} icon={Users} tone="brand" />
        <AdminStatCard label="Itens vendidos" value={report.totalItems} icon={ShoppingBag} tone="blue" />
        <AdminStatCard label="Maior pedido" value={report.highestOrder} currency icon={BarChart3} tone="green" />
        <AdminStatCard label="Taxas de entrega" value={report.deliveryFees} currency icon={Truck} tone="brand" />
        <AdminStatCard label="Cancelamentos" value={report.cancelledOrders} icon={XCircle} tone="violet" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <ReportCard title="Faturamento por dia" icon={<TrendingUp className="h-4 w-4" />}>
          {report.dailySales.length === 0 ? <EmptyState /> : <div className="flex h-64 items-end gap-2 overflow-x-auto px-1 pt-6">{report.dailySales.map((day) => <div key={day.date} className="group flex h-full min-w-10 flex-1 flex-col justify-end text-center"><span className="mb-1 hidden text-[10px] font-semibold text-slate-700 group-hover:block">{formatCurrency(day.total)}</span><div className="mx-auto w-full max-w-12 rounded-t-md bg-brand-500 transition hover:bg-brand-600" style={{ height: `${Math.max((day.total / maxDailySales) * 100, 3)}%` }} /><span className="mt-2 text-[10px] text-slate-500">{formatDate(day.date)}</span></div>)}</div>}
        </ReportCard>
        <ReportCard title="Meios de pagamento" icon={<CreditCard className="h-4 w-4" />}>
          <BreakdownList items={report.paymentMethods} total={report.totalSales} />
          <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de atendimento</h3><BreakdownList items={report.orderTypes} total={report.totalSales} compact /></div>
        </ReportCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ReportCard title="Produtos mais vendidos" icon={<Package className="h-4 w-4" />}>
          {report.topProducts.length === 0 ? <EmptyState /> : <div className="space-y-3">{report.topProducts.slice(0, 10).map((product, index) => <RankingRow key={product.name} index={index} title={product.name} subtitle={`${product.quantity} unidades`} value={formatCurrency(product.revenue)} />)}</div>}
        </ReportCard>
        <ReportCard title="Melhores clientes" icon={<Users className="h-4 w-4" />}>
          {report.recurringCustomers.length === 0 ? <EmptyState /> : <div className="space-y-3">{report.recurringCustomers.slice(0, 10).map((customer, index) => <RankingRow key={customer.name} index={index} title={customer.name} subtitle={`${customer.orders} pedidos`} value={formatCurrency(customer.totalSpent)} violet />)}</div>}
        </ReportCard>
      </section>

      <ReportCard title="Pedidos do período" icon={<ReceiptText className="h-4 w-4" />}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Pedido</th><th className="px-3 py-3">Data</th><th className="px-3 py-3">Cliente</th><th className="px-3 py-3">Pagamento</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{recentOrders.map((order) => <tr key={order.id} className="hover:bg-slate-50"><td className="px-3 py-3 font-semibold text-slate-900">{order.code}</td><td className="px-3 py-3 text-slate-600">{formatDateTime(order.createdAt)}</td><td className="px-3 py-3 text-slate-800">{order.customer.name}</td><td className="px-3 py-3 text-slate-600">{{ pix: "Pix", credit_card: "Crédito", debit_card: "Débito" }[order.paymentMethod]}</td><td className="px-3 py-3"><AdminBadge tone={order.status === "cancelled" ? "error" : order.status === "finished" ? "success" : "neutral"}>{statusLabels[order.status]}</AdminBadge></td><td className="px-3 py-3 text-right font-semibold text-slate-900">{formatCurrency(order.total)}</td></tr>)}</tbody></table>
          {recentOrders.length === 0 && <EmptyState />}
        </div>
      </ReportCard>
    </div>
  );
}

function ReportCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <section className="rounded-card border border-[#E5E7EB] bg-white p-5 shadow-card"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">{icon}</span></div>{children}</section>;
}

function EmptyState() { return <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Sem dados no período selecionado.</p>; }

function RankingRow({ index, title, subtitle, value, violet = false }: { index: number; title: string; subtitle: string; value: string; violet?: boolean }) {
  return <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${violet ? "bg-violet-50 text-violet-700" : "bg-brand-50 text-brand-700"}`}>{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{title}</p><p className="text-xs text-slate-500">{subtitle}</p></div><strong className="text-sm text-slate-900">{value}</strong></div>;
}

function BreakdownList({ items, total, compact = false }: { items: ReportBreakdown[]; total: number; compact?: boolean }) {
  if (items.length === 0) return <EmptyState />;
  return <div className={compact ? "space-y-2.5" : "space-y-4"}>{items.map((item) => { const percentage = total ? (item.total / total) * 100 : 0; return <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{item.label} <small className="text-slate-400">({item.count})</small></span><strong className="text-slate-900">{formatCurrency(item.total)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${percentage}%` }} /></div></div>; })}</div>;
}
