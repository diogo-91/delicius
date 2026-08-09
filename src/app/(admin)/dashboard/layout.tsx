import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login?next=/dashboard");
  }

  return <AdminShell user={data.user}>{children}</AdminShell>;
}
