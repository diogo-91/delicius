import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reconcileSessionWithAsaas } from "@/lib/asaas-session";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  let query = admin.from("asaas_payment_sessions")
    .select("id, status, customer_order_id, restaurant_slug, customer_user_id, order_data, amount, asaas_payment_id, updated_at")
    .eq("id", sessionId);
  if (auth.user) query = query.eq("customer_user_id", auth.user.id);
  const { data } = await query.maybeSingle();
  if (!data) return NextResponse.json({ error: "Pagamento nao encontrado." }, { status: 404 });

  const reconciled = await reconcileSessionWithAsaas(admin, data);
  return NextResponse.json({ status: reconciled.status, customer_order_id: reconciled.customer_order_id });
}
