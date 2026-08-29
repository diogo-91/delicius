import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureOrderForSession, type AsaasPaymentSession } from "@/lib/asaas-session";

export const runtime = "nodejs";
export const maxDuration = 60;

type AsaasWebhook = {
  id?: string;
  event: string;
  dateCreated?: string;
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
  if (!payload.event) return NextResponse.json({ error: "Evento invalido." }, { status: 400 });

  // Asaas normally sends a unique `id`, but older/edge payloads may omit it —
  // derive a stable dedupe key so we never reject (rejections pause the queue).
  const eventId = payload.id
    ?? `${payload.event}:${payload.payment?.id ?? payload.payment?.externalReference ?? "?"}:${payload.dateCreated ?? ""}`;

  const admin = createSupabaseAdminClient();
  const { error: eventError } = await admin.from("asaas_webhook_events").insert({ id: eventId, event_type: payload.event, payload });
  if (eventError && eventError.code !== "23505") return NextResponse.json({ error: "Falha ao registrar evento." }, { status: 500 });

  const paymentId = payload.payment?.id;
  const externalReference = payload.payment?.externalReference;
  if (!paymentId && !externalReference) return NextResponse.json({ received: true });

  // Prefer matching by the Asaas payment id; fall back to externalReference
  // (our session id) in case the payment id was never persisted on the session.
  let session: AsaasPaymentSession | null = null;
  if (paymentId) {
    const { data } = await admin.from("asaas_payment_sessions").select("*").eq("asaas_payment_id", paymentId).maybeSingle();
    session = data as AsaasPaymentSession | null;
  }
  if (!session && externalReference) {
    const { data } = await admin.from("asaas_payment_sessions").select("*").eq("id", externalReference).maybeSingle();
    session = data as AsaasPaymentSession | null;
    if (session && paymentId && !session.asaas_payment_id) {
      await admin.from("asaas_payment_sessions").update({ asaas_payment_id: paymentId }).eq("id", session.id);
    }
  }
  if (!session) return NextResponse.json({ received: true });

  const status = approvedEvents.has(payload.event)
    ? "approved"
    : payload.event === "PAYMENT_REFUNDED"
      ? "refunded"
      : failedEvents.has(payload.event)
        ? "failed"
        : null;
  if (!status) return NextResponse.json({ received: true });

  let customerOrderId = session.customer_order_id;
  if (status === "approved") {
    try {
      customerOrderId = await ensureOrderForSession(admin, session);
    } catch {
      return NextResponse.json({ error: "Falha ao liberar pedido." }, { status: 500 });
    }
  }

  await admin.from("asaas_payment_sessions").update({ status, customer_order_id: customerOrderId, updated_at: new Date().toISOString() }).eq("id", session.id);
  return NextResponse.json({ received: true });
}
