import { Suspense } from "react";
import { OrdersKanban } from "@/components/orders/orders-kanban";

export default function OrdersPage() {
  return (
    <Suspense fallback={null}>
      <OrdersKanban />
    </Suspense>
  );
}
