import type { SupabaseClient } from "@supabase/supabase-js";
import { asaasRequest } from "@/lib/asaas";
import type { Order } from "@/types/domain";

export type AsaasPaymentSession = {
  id: string;
  status: string;
  restaurant_slug: string;
  customer_user_id: string | null;
  order_data: Order;
  amount: number | string;
  asaas_payment_id: string | null;
  customer_order_id: string | null;
  updated_at?: string;
};

// Asaas payment statuses that mean the money actually arrived.
const paidAsaasStatuses = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
// Statuses that mean the charge will not be paid.
const failedAsaasStatuses = new Set(["OVERDUE", "DELETED"]);

// Minimum interval between direct calls to the Asaas API for the same session,
// so the 4s client polling does not hammer the gateway.
const RECONCILE_THROTTLE_MS = 9000;

/**
 * Creates the customer_orders row for an approved payment session.
 * Idempotent: safe to call from both the webhook and the status endpoint.
 */
export async function ensureOrderForSession(
  admin: SupabaseClient,
  session: AsaasPaymentSession
): Promise<string | null> {
  if (session.customer_order_id) return session.customer_order_id;

  const order = session.order_data;
  const { count } = await admin
    .from("customer_orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_slug", session.restaurant_slug);
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
  const { data: inserted, error } = await admin
    .from("customer_orders")
    .insert({
      restaurant_slug: session.restaurant_slug,
      code,
      status: "new",
      order_data: orderData,
      customer_user_id: session.customer_user_id,
      payment_session_id: session.id
    })
    .select("id")
    .single();

  if (error?.code === "23505") {
    const { data: existingOrder } = await admin
      .from("customer_orders")
      .select("id")
      .eq("payment_session_id", session.id)
      .single();
    return existingOrder?.id ?? null;
  }
  if (error) throw new Error("Falha ao liberar pedido.");
  return inserted.id;
}

type AsaasPaymentStatus = { status?: string };

/**
 * Asks the Asaas API for the real payment status and reconciles the local
 * session, so a confirmed payment is recognised even when the webhook never
 * reaches us. Degrades gracefully (returns the current local status) if the
 * gateway is unreachable or not configured.
 */
export async function reconcileSessionWithAsaas(
  admin: SupabaseClient,
  session: AsaasPaymentSession
): Promise<{ status: string; customer_order_id: string | null }> {
  const current = { status: session.status, customer_order_id: session.customer_order_id };
  if (session.status !== "pending" || !session.asaas_payment_id) return current;

  if (session.updated_at && Date.now() - new Date(session.updated_at).getTime() < RECONCILE_THROTTLE_MS) {
    return current;
  }

  let remote: AsaasPaymentStatus;
  try {
    remote = await asaasRequest<AsaasPaymentStatus>(`/payments/${session.asaas_payment_id}/status`);
  } catch {
    return current;
  }

  const nextStatus = remote.status && paidAsaasStatuses.has(remote.status)
    ? "approved"
    : remote.status === "REFUNDED"
      ? "refunded"
      : remote.status && failedAsaasStatuses.has(remote.status)
        ? "failed"
        : null;

  if (!nextStatus) {
    // Touch updated_at so the throttle spaces out the next gateway call.
    await admin
      .from("asaas_payment_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", session.id);
    return current;
  }

  let customerOrderId = session.customer_order_id;
  if (nextStatus === "approved") {
    try {
      customerOrderId = await ensureOrderForSession(admin, session);
    } catch {
      return current;
    }
  }
  await admin
    .from("asaas_payment_sessions")
    .update({ status: nextStatus, customer_order_id: customerOrderId, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  return { status: nextStatus, customer_order_id: customerOrderId };
}
