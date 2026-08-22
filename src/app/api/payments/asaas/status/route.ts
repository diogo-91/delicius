import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Sessao invalida." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  let query = admin.from("asaas_payment_sessions")
    .select("status, customer_order_id")
    .eq("id", sessionId);
  if (auth.user) query = query.eq("customer_user_id", auth.user.id);
  const { data } = await query.maybeSingle();
  if (!data) return NextResponse.json({ error: "Pagamento nao encontrado." }, { status: 404 });
  return NextResponse.json(data);
}
