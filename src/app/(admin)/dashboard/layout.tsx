import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login?next=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = profile?.role === "owner" ? "owner" : "cashier";

  return <AdminShell user={data.user} role={role}>{children}</AdminShell>;
}
