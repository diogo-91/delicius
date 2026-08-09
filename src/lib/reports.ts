import type { Order, ReportSummary } from "@/types/domain";

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
