"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bike, CheckCircle2, Clock, MapPin, Package, PackageCheck, Phone, Printer, Receipt, Search, TimerReset, User, Volume2, VolumeX, Wallet, XCircle } from "lucide-react";
import { getOrders, getRestaurant, updateOrderStatus } from "@/lib/data/mock-store";
import { getRemoteOrders, updateRemoteOrderStatus } from "@/lib/data/supabase-orders";
import { cn, formatCurrency, formatDateTime, formatScheduledFor } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types/domain";
import { AdminButton } from "@/components/admin/ui/button";
import { AdminInput } from "@/components/admin/ui/input";
import { AdminStatCard } from "@/components/admin/ui/stat-card";

const restaurantSlug = "delicious-gourmet-bolos-e-salgados";

const statuses: Array<{ status: OrderStatus; title: string; shortTitle: string; icon: typeof Clock; dot: string; activePill: string }> = [
  { status: "new", title: "Novos pedidos", shortTitle: "Novo", icon: Clock, dot: "bg-brand-600", activePill: "border-brand-200 bg-brand-50 text-brand-700" },
  { status: "preparing", title: "Em preparo", shortTitle: "Preparo", icon: TimerReset, dot: "bg-amber-500", activePill: "border-amber-200 bg-amber-50 text-amber-700" },
  { status: "ready", title: "Prontos", shortTitle: "Pronto", icon: PackageCheck, dot: "bg-blue-500", activePill: "border-blue-200 bg-blue-50 text-blue-700" },
  { status: "out_for_delivery", title: "Saiu para entrega", shortTitle: "Entrega", icon: Bike, dot: "bg-indigo-500", activePill: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  { status: "finished", title: "Finalizados", shortTitle: "Finalizado", icon: CheckCircle2, dot: "bg-green-500", activePill: "border-green-200 bg-green-50 text-green-700" },
  { status: "cancelled", title: "Cancelados", shortTitle: "Cancelado", icon: XCircle, dot: "bg-red-500", activePill: "border-red-200 bg-red-50 text-red-700" }
];

const nextAction: Partial<Record<OrderStatus, { label: string; status: OrderStatus }>> = {
  new: { label: "Aceitar pedido", status: "preparing" },
  preparing: { label: "Marcar pronto", status: "ready" },
  ready: { label: "Saiu para entrega", status: "out_for_delivery" },
  out_for_delivery: { label: "Finalizar pedido", status: "finished" }
};

function getStatusLabel(status: OrderStatus) {
  return statuses.find((item) => item.status === status)?.shortTitle ?? status;
}

const statusBadgeClasses: Record<OrderStatus, string> = {
  new: "bg-brand-50 text-brand-700",
  preparing: "bg-amber-50 text-amber-700",
  ready: "bg-blue-50 text-blue-700",
  out_for_delivery: "bg-indigo-50 text-indigo-700",
  finished: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700"
};

const statusBorderClasses: Record<OrderStatus, string> = {
  new: "border-l-brand-600",
  preparing: "border-l-amber-500",
  ready: "border-l-blue-500",
  out_for_delivery: "border-l-indigo-500",
  finished: "border-l-green-500",
  cancelled: "border-l-red-500"
};

function getOrderSummary(order: Order) {
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${itemsCount} item(ns)`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function printOrder(order: Order, restaurantName: string) {
  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) return;

  const itemsHtml = order.items
    .map(
      (item) => `
      <div class="row">
        <span>${item.quantity}x ${escapeHtml(item.productName)}</span>
        <span>${formatCurrency(item.total)}</span>
      </div>
      ${item.scheduledFor ? `<div class="note">Agendado para: ${escapeHtml(formatScheduledFor(item.scheduledFor))}</div>` : ""}
      ${item.note ? `<div class="note">Obs: ${escapeHtml(item.note)}</div>` : ""}
    `
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Pedido ${escapeHtml(order.code)}</title>
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; }
          body { font-family: "Courier New", monospace; width: 80mm; margin: 0; padding: 10px; font-size: 13px; color: #000; }
          h1 { font-size: 16px; text-align: center; margin: 0 0 2px; }
          p { margin: 2px 0; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; gap: 8px; }
          .note { font-size: 11px; color: #333; padding-left: 8px; margin-bottom: 4px; }
          .total { font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(restaurantName)}</h1>
        <p class="center bold">PEDIDO ${escapeHtml(order.code)}</p>
        <p class="center">${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
        <div class="line"></div>
        <p class="bold">${order.type === "delivery" ? "ENTREGA" : "RETIRADA"}</p>
        <p>${escapeHtml(order.customer.name)}</p>
        <p>${escapeHtml(order.customer.phone)}</p>
        ${order.customer.address ? `<p>${escapeHtml(order.customer.address)}</p>` : ""}
        <div class="line"></div>
        <p class="bold">ITENS</p>
        ${itemsHtml}
        <div class="line"></div>
        <div class="row bold total"><span>TOTAL</span><span>${formatCurrency(order.total)}</span></div>
        <p class="center" style="margin-top:6px;">Pagamento: ${escapeHtml(order.paymentMethod)}</p>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => printWindow.close();
  printWindow.print();
}

export function OrdersKanban() {
  const searchParams = useSearchParams();
  const restaurant = getRestaurant();
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [activeStatus, setActiveStatus] = useState<OrderStatus>("new");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const knownNewOrderIdsRef = useRef<Set<string>>(new Set());

  function playNewOrderSound() {
    const context = audioContextRef.current;
    if (!context || context.state !== "running") return;

    const start = context.currentTime + 0.03;
    const ringBursts = [0, 1.15, 2.3];

    ringBursts.forEach((offset) => {
      const burstStart = start + offset;
      const burstEnd = burstStart + 0.82;
      const output = context.createGain();
      const tremolo = context.createGain();
      const tremoloOscillator = context.createOscillator();
      const tremoloDepth = context.createGain();

      output.gain.setValueAtTime(0.0001, burstStart);
      output.gain.exponentialRampToValueAtTime(0.78, burstStart + 0.025);
      output.gain.setValueAtTime(0.78, burstEnd - 0.05);
      output.gain.exponentialRampToValueAtTime(0.0001, burstEnd);

      tremolo.gain.setValueAtTime(0.52, burstStart);
      tremoloOscillator.type = "square";
      tremoloOscillator.frequency.setValueAtTime(26, burstStart);
      tremoloDepth.gain.setValueAtTime(0.46, burstStart);
      tremoloOscillator.connect(tremoloDepth);
      tremoloDepth.connect(tremolo.gain);
      tremolo.connect(output);
      output.connect(context.destination);

      [
        { frequency: 440, volume: 0.22, type: "triangle" as OscillatorType },
        { frequency: 480, volume: 0.22, type: "triangle" as OscillatorType },
        { frequency: 920, volume: 0.06, type: "sine" as OscillatorType }
      ].forEach(({ frequency, volume, type }) => {
        const carrier = context.createOscillator();
        const carrierGain = context.createGain();
        carrier.type = type;
        carrier.frequency.setValueAtTime(frequency, burstStart);
        carrierGain.gain.setValueAtTime(volume, burstStart);
        carrier.connect(carrierGain);
        carrierGain.connect(tremolo);
        carrier.start(burstStart);
        carrier.stop(burstEnd + 0.02);
      });

      tremoloOscillator.start(burstStart);
      tremoloOscillator.stop(burstEnd + 0.02);
    });
  }

  async function toggleSound() {
    if (soundEnabledRef.current) {
      soundEnabledRef.current = false;
      setSoundEnabled(false);
      return;
    }

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    await context.resume();
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    playNewOrderSound();
  }

  useEffect(() => {
    let ignore = false;
    let firstLoad = true;

    async function loadOrders() {
      const remoteOrders = await getRemoteOrders(restaurantSlug).catch(() => null);
      if (ignore) return;
      const currentOrders = remoteOrders ?? getOrders();
      const currentNewOrderIds = currentOrders.filter((order) => order.status === "new").map((order) => order.id);
      setOrders(currentOrders);
      if (firstLoad) {
        firstLoad = false;
        knownNewOrderIdsRef.current = new Set(currentNewOrderIds);
        setSelectedOrderId(currentOrders.find((order) => order.status === "new")?.id ?? currentOrders[0]?.id ?? null);
      } else {
        const hasNewArrival = currentNewOrderIds.some((id) => !knownNewOrderIdsRef.current.has(id));
        if (hasNewArrival && soundEnabledRef.current) {
          playNewOrderSound();
          window.navigator.vibrate?.([250, 120, 250, 120, 350]);
        }
        currentNewOrderIds.forEach((id) => knownNewOrderIdsRef.current.add(id));
      }
    }

    loadOrders();
    const interval = window.setInterval(loadOrders, 15000);
    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders
      .filter((order) => order.status === activeStatus)
      .filter((order) => {
        if (!normalizedQuery) return true;
        return (
          order.code.toLowerCase().includes(normalizedQuery) ||
          order.customer.name.toLowerCase().includes(normalizedQuery) ||
          order.customer.phone.toLowerCase().includes(normalizedQuery)
        );
      });
  }, [activeStatus, orders, query]);

  const selectedOrder = useMemo(() => {
    const selected = orders.find((order) => order.id === selectedOrderId);
    if (selected && selected.status === activeStatus) return selected;
    return filteredOrders[0] ?? selected ?? null;
  }, [activeStatus, filteredOrders, orders, selectedOrderId]);

  const currentStatus = statuses.find((item) => item.status === activeStatus) ?? statuses[0];
  const totalOpenOrders = orders.filter((order) => !["finished", "cancelled"].includes(order.status)).length;
  const totalSalesToday = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);

  function changeStatus(orderId: string, status: OrderStatus) {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    setSelectedOrderId(orderId);
    setActiveStatus(status);
    updateRemoteOrderStatus(orderId, status).catch(() => undefined);
    updateOrderStatus(orderId, status);
  }

  function cancelOrder(orderId: string) {
    changeStatus(orderId, "cancelled");
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full lg:min-h-0">
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
        <div className="lg:shrink-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 lg:text-[32px]">Pedidos</h1>
          <p className="mt-1 text-sm text-slate-500">Acompanhe e atualize o andamento de cada pedido em tempo real.</p>
          <button
            className={cn(
              "mt-3 inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition",
              soundEnabled ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            )}
            onClick={() => void toggleSound()}
            type="button"
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            {soundEnabled ? "Alerta sonoro ativo" : "Ativar alerta sonoro"}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:flex-1">
          <AdminStatCard className="rounded-2xl shadow-[0_4px_18px_rgba(36,26,23,0.06)]" label="Pedidos em andamento" value={totalOpenOrders} icon={TimerReset} tone="violet" />
          <AdminStatCard className="rounded-2xl shadow-[0_4px_18px_rgba(36,26,23,0.06)]" label="Novos pedidos" value={orders.filter((order) => order.status === "new").length} icon={Clock} tone="amber" />
          <AdminStatCard className="rounded-2xl shadow-[0_4px_18px_rgba(36,26,23,0.06)]" label="Vendas registradas" value={totalSalesToday} currency icon={Wallet} tone="green" />
        </div>
      </div>

      <section className="flex shrink-0 flex-wrap gap-2.5 rounded-2xl bg-white/60 p-2 shadow-[0_1px_3px_rgba(36,26,23,0.04)]">
        {statuses.map((status) => {
          const Icon = status.icon;
          const active = activeStatus === status.status;
          const count = orders.filter((order) => order.status === status.status).length;
          return (
            <button
              key={status.status}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-150",
                active ? `${status.activePill} shadow-sm` : "border-transparent bg-transparent text-[#665C57] hover:bg-white hover:text-[#241A17]"
              )}
              onClick={() => {
                setActiveStatus(status.status);
                setSelectedOrderId(orders.find((order) => order.status === status.status)?.id ?? null);
              }}
              type="button"
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
              {status.shortTitle}
              <span className={cn("flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 text-[10px] font-bold", active ? "bg-white/90 text-current shadow-sm" : "bg-[#ECE7E3] text-[#665C57]")}>{count}</span>
            </button>
          );
        })}
      </section>

      <section className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.3fr_0.7fr] lg:gap-6">
        <div className="flex flex-col overflow-hidden rounded-card border border-[#E5E7EB] bg-white shadow-card lg:min-h-0">
          <div className="shrink-0 border-b border-[#E5E7EB]/50 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#111827] flex items-center gap-2">
                  <span className={cn("h-2 w-2 rounded-full", currentStatus.dot)} />
                  {currentStatus.title}
                </h2>
                <p className="mt-0.5 text-xs text-[#6B7280]">{filteredOrders.length} pedido(s) nesta etapa</p>
              </div>
              <AdminInput
                className="lg:w-60"
                icon={<Search className="h-3.5 w-3.5 text-slate-400" />}
                placeholder="Buscar pedido ou cliente"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="scrollbar-clean min-h-[220px] divide-y divide-[#E5E7EB]/40 overflow-y-auto lg:min-h-0 lg:flex-1">
            {filteredOrders.length === 0 && (
              <div className="flex min-h-[220px] items-center justify-center p-8 text-center">
                <div>
                  <p className="font-semibold text-[#111827] text-sm">Nenhum pedido por aqui</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">Novos pedidos nesta etapa aparecerão nesta lista.</p>
                </div>
              </div>
            )}

            {filteredOrders.map((order) => {
              const selected = selectedOrder?.id === order.id;
              const action = nextAction[order.status];
              return (
                <article
                  key={order.id}
                  className={cn(
                    "cursor-pointer px-3 py-2.5 transition-all duration-150 border-l-2",
                    selected ? "bg-slate-50/50 border-l-[#7b3f2a] shadow-sm" : "border-l-transparent hover:bg-slate-50/50"
                  )}
                  onClick={() => setSelectedOrderId(order.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <strong className="shrink-0 text-sm font-semibold text-[#111827]">{order.code}</strong>
                      <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium", statusBadgeClasses[order.status])}>{getStatusLabel(order.status)}</span>
                      <span className="truncate text-xs text-[#6B7280]">{order.customer.name}</span>
                    </div>
                    <strong className="shrink-0 text-sm font-semibold text-[#111827]">{formatCurrency(order.total)}</strong>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] text-[#6B7280]">
                      <span>{getOrderSummary(order)}</span>
                      <span>·</span>
                      <span>{order.type === "delivery" ? "Entrega" : "Retirada"}</span>
                      <span>·</span>
                      <span className="uppercase">{order.paymentMethod}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-[#6B7280]">{formatDateTime(order.createdAt)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {action && (
                      <AdminButton className="h-6 px-2 text-[10px]" onClick={(event) => {
                        event.stopPropagation();
                        changeStatus(order.id, action.status);
                      }} type="button">
                        {action.label}
                      </AdminButton>
                    )}
                    {!["finished", "cancelled"].includes(order.status) && (
                      <AdminButton variant="secondary" className="h-6 px-2 text-[10px]" onClick={(event) => {
                        event.stopPropagation();
                        cancelOrder(order.id);
                      }} type="button">
                        Cancelar
                      </AdminButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="flex flex-col overflow-hidden rounded-card border border-[#E5E7EB] bg-white shadow-card lg:min-h-0">
          {selectedOrder ? (
            <>
              <div className="shrink-0 border-b border-[#E5E7EB]/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Detalhes do pedido</p>
                    <h2 className="mt-0.5 text-lg font-bold text-[#111827]">{selectedOrder.code}</h2>
                    <p className="text-[10px] text-[#6B7280]">{formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusBadgeClasses[selectedOrder.status])}>{getStatusLabel(selectedOrder.status)}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-[#6B7280]">{selectedOrder.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="scrollbar-clean space-y-3 overflow-y-auto p-4 lg:min-h-0 lg:flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Cliente</p>
                    <p className="mt-0.5 text-xs font-semibold text-[#111827]">{selectedOrder.customer.name}</p>
                    <p className="text-[11px] text-[#6B7280]">{selectedOrder.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">{selectedOrder.type === "delivery" ? "Entrega" : "Retirada"}</p>
                    <p className="mt-0.5 text-[11px] text-[#6B7280] line-clamp-3">{selectedOrder.customer.address ?? "Retirar no local"}</p>
                  </div>
                </div>

                <div className="border-t border-[#E5E7EB]/50 pt-3">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">Itens do pedido</h3>
                  <div className="divide-y divide-[#E5E7EB]/30">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-4 py-1.5 text-xs">
                        <div>
                          <p className="font-semibold text-[#111827]">{item.quantity}x {item.productName}</p>
                          {item.scheduledFor && (
                            <p className="mt-0.5 text-[10px] font-semibold text-brand-700">
                              Agendado para {formatScheduledFor(item.scheduledFor)}
                            </p>
                          )}
                          {item.note && <p className="mt-0.5 text-[10px] text-[#6B7280]">{item.note}</p>}
                        </div>
                        <strong className="text-[#111827] font-medium">{formatCurrency(item.total)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 border-t border-[#E5E7EB]/50 pt-3">
                  <div className="flex justify-between text-xs text-[#6B7280]"><span>Subtotal</span><span>{formatCurrency(selectedOrder.subtotal)}</span></div>
                  <div className="flex justify-between text-xs text-[#6B7280]"><span>Entrega</span><span>{formatCurrency(selectedOrder.deliveryFee)}</span></div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-xs text-[#7b3f2a] font-medium">
                      <span>Desconto {selectedOrder.couponCode ? `(${selectedOrder.couponCode})` : ""}</span>
                      <span>-{formatCurrency(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="mt-1 flex items-baseline justify-between border-t border-[#E5E7EB]/30 pt-2">
                    <span className="text-xs font-semibold text-[#6B7280]">Total</span>
                    <span className="text-xl font-bold tracking-tight text-[#7b3f2a]">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>

                <div className="grid gap-2 border-t border-[#E5E7EB]/50 pt-3">
                  <AdminButton variant="secondary" className="w-full" onClick={() => printOrder(selectedOrder, restaurant.name)} type="button">
                    <Printer className="h-4 w-4" />
                    Imprimir para a cozinha
                  </AdminButton>
                  {nextAction[selectedOrder.status] && (
                    <AdminButton className="w-full" onClick={() => changeStatus(selectedOrder.id, nextAction[selectedOrder.status]!.status)} type="button">
                      {nextAction[selectedOrder.status]!.label}
                    </AdminButton>
                  )}
                  {!["finished", "cancelled"].includes(selectedOrder.status) && (
                    <AdminButton variant="secondary" className="w-full" onClick={() => cancelOrder(selectedOrder.id)} type="button">
                      Cancelar pedido
                    </AdminButton>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[300px] flex-1 items-center justify-center p-8 text-center">
              <div>
                <p className="font-semibold text-[#111827] text-sm">Selecione um pedido</p>
                <p className="mt-0.5 text-xs text-[#6B7280]">Os detalhes do pedido serão exibidos aqui.</p>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
