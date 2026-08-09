import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    if (next.startsWith("/dashboard")) {
      const { data } = await supabase.auth.getUser();
      const metadata = data.user?.user_metadata;
      await supabase.rpc("ensure_owner_profile", {
        restaurant_name: metadata?.restaurant_name ?? metadata?.restaurantName ?? "Meu restaurante",
        owner_name: metadata?.full_name ?? metadata?.name ?? data.user?.email ?? "Administrador"
      });
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
