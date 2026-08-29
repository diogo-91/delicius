import type { Order, ReportSummary } from "@/types/domain";

export type ReportBreakdown = { label: string; count: number; total: number };

export type DetailedReport = ReportSummary & {
  uniqueCustomers: number;
  cancelledOrders: number;
  cancellationRate: number;
  totalItems: number;
  averageItemsPerOrder: number;
  deliveryFees: number;
  highestOrder: number;
  dailySales: Array<{ date: string; orders: number; total: number }>;
  paymentMethods: ReportBreakdown[];
  orderTypes: ReportBreakdown[];
  statusCounts: Array<{ status: Order["status"]; count: number }>;
};

const paymentLabels: Record<Order["paymentMethod"], string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito" };
const orderTypeLabels: Record<Order["type"], string> = { delivery: "Entrega", pickup: "Retirada", dine_in: "Consumo no local" };

function toDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function buildReportSummary(orders: Order[]): ReportSummary {
  const finishedOrders = orders.filter((order) => order.status !== "cancelled");
  const totalSales = finishedOrders.reduce((sum, order) => sum + order.total, 0);
  const productMap = new Map<string, { quantity: number; revenue: number }>();
  const customerMap = new Map<string, { orders: number; totalSpent: number }>();

  finishedOrders.forEach((order) => {
    customerMap.set(order.customer.name, {
      orders: (customerMap.get(order.customer.name)?.orders ?? 0) + 1,
      totalSpent: (customerMap.get(order.customer.name)?.totalSpent ?? 0) + order.total
    });

    order.items.forEach((item) => {
      productMap.set(item.productName, {
        quantity: (productMap.get(item.productName)?.quantity ?? 0) + item.quantity,
        revenue: (productMap.get(item.productName)?.revenue ?? 0) + item.total
      });
    });
  });

  return {
    totalSales,
    orderCount: finishedOrders.length,
    averageTicket: finishedOrders.length ? totalSales / finishedOrders.length : 0,
    topProducts: Array.from(productMap, ([name, value]) => ({ name, ...value })).sort((a, b) => b.quantity - a.quantity),
    recurringCustomers: Array.from(customerMap, ([name, value]) => ({ name, ...value })).sort((a, b) => b.orders - a.orders)
  };
}

export function buildDetailedReport(orders: Order[]): DetailedReport {
  const summary = buildReportSummary(orders);
  const validOrders = orders.filter((order) => order.status !== "cancelled");
  const cancelledOrders = orders.length - validOrders.length;
  const totalItems = validOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  const customerKeys = new Set(validOrders.map((order) => order.customer.phone.replace(/\D/g, "") || order.customer.name.trim().toLowerCase()));
  const dailyMap = new Map<string, { orders: number; total: number }>();
  const paymentMap = new Map<Order["paymentMethod"], { count: number; total: number }>();
  const orderTypeMap = new Map<Order["type"], { count: number; total: number }>();
  const statusMap = new Map<Order["status"], number>();

  orders.forEach((order) => statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1));
  validOrders.forEach((order) => {
    const dateKey = toDateKey(order.createdAt);
    const daily = dailyMap.get(dateKey) ?? { orders: 0, total: 0 };
    dailyMap.set(dateKey, { orders: daily.orders + 1, total: daily.total + order.total });
    const payment = paymentMap.get(order.paymentMethod) ?? { count: 0, total: 0 };
    paymentMap.set(order.paymentMethod, { count: payment.count + 1, total: payment.total + order.total });
    const orderType = orderTypeMap.get(order.type) ?? { count: 0, total: 0 };
    orderTypeMap.set(order.type, { count: orderType.count + 1, total: orderType.total + order.total });
  });

  return {
    ...summary,
    uniqueCustomers: customerKeys.size,
    cancelledOrders,
    cancellationRate: orders.length ? (cancelledOrders / orders.length) * 100 : 0,
    totalItems,
    averageItemsPerOrder: validOrders.length ? totalItems / validOrders.length : 0,
    deliveryFees: validOrders.reduce((sum, order) => sum + order.deliveryFee, 0),
    highestOrder: validOrders.reduce((highest, order) => Math.max(highest, order.total), 0),
    dailySales: Array.from(dailyMap, ([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
    paymentMethods: Array.from(paymentMap, ([method, value]) => ({ label: paymentLabels[method], ...value })).sort((a, b) => b.total - a.total),
    orderTypes: Array.from(orderTypeMap, ([type, value]) => ({ label: orderTypeLabels[type], ...value })).sort((a, b) => b.total - a.total),
    statusCounts: Array.from(statusMap, ([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count)
  };
}
