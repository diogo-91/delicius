import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Order } from "@/types/domain";

type AsaasWebhook = {
  id: string;
  event: string;
  payment?: { id?: string; externalReference?: string };
};

const approvedEvents = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const failedEvents = new Set(["PAYMENT_OVERDUE", "PAYMENT_DELETED"]);

export async function POST(request: NextRequest) {
  const configuredToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!configuredToken || receivedToken !== configuredToken) {
    return NextResponse.json({ error: "Token invalido." }, { status: 401 });
  }

  const payload = (await request.json()) as AsaasWebhook;
  if (!payload.id || !payload.event) return NextResponse.json({ error: "Evento invalido." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const { error: eventError } = await admin.from("asaas_webhook_events").insert({ id: payload.id, event_type: payload.event, payload });
  if (eventError && eventError.code !== "23505") return NextResponse.json({ error: "Falha ao registrar evento." }, { status: 500 });

  const paymentId = payload.payment?.id;
  if (!paymentId) return NextResponse.json({ received: true });
  const { data: session } = await admin.from("asaas_payment_sessions").select("*").eq("asaas_payment_id", paymentId).maybeSingle();
  if (!session) return NextResponse.json({ received: true });

  const status = approvedEvents.has(payload.event) ? "approved" : payload.event === "PAYMENT_REFUNDED" ? "refunded" : failedEvents.has(payload.event) ? "failed" : null;
  if (!status) return NextResponse.json({ received: true });

  let customerOrderId = session.customer_order_id as string | null;
  if (status === "approved" && !customerOrderId) {
    const order = session.order_data as Order;
    const { count } = await admin.from("customer_orders").select("id", { count: "exact", head: true }).eq("restaurant_slug", session.restaurant_slug);
    const code = `#${1026 + (count ?? 0)}`;
    const now = new Date().toISOString();
    const orderData: Order = {
      ...order,
      code,
      status: "new",
      total: Number(session.amount),
      createdAt: now,
      history: [{ id: `hist_${Date.now()}`, status: "new", createdAt: now, note: "Pagamento confirmado pelo Asaas" }]
    };
    const { data: inserted, error } = await admin.from("customer_orders").insert({
      restaurant_slug: session.restaurant_slug,
      code,
      status: "new",
      order_data: orderData,
      customer_user_id: session.customer_user_id,
      payment_session_id: session.id
    }).select("id").single();
    if (error?.code === "23505") {
      const { data: existingOrder } = await admin.from("customer_orders").select("id").eq("payment_session_id", session.id).single();
      customerOrderId = existingOrder?.id ?? null;
    } else if (error) {
      return NextResponse.json({ error: "Falha ao liberar pedido." }, { status: 500 });
    } else {
      customerOrderId = inserted.id;
    }
  }

  await admin.from("asaas_payment_sessions").update({ status, customer_order_id: customerOrderId, updated_at: new Date().toISOString() }).eq("id", session.id);
  return NextResponse.json({ received: true });
}
