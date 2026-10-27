import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Atrás do proxy (Coolify/Traefik) o `request.url` do Next vem com o endereço
// interno do servidor (ex.: https://localhost:3000). O domínio real que o
// cliente acessou está nos headers encaminhados pelo proxy.
function getPublicOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

// Só aceita caminhos internos (evita redirecionar o cliente para outro site).
function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeNextPath(requestUrl.searchParams.get("next"));

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

  return NextResponse.redirect(new URL(next, getPublicOrigin(request)));
}
