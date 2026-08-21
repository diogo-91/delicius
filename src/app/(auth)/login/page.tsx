import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <section className="w-full max-w-md rounded-lg border border-white/70 bg-white p-8 shadow-panel">
        <h1 className="text-2xl font-bold text-ink">Entrar</h1>
        <p className="mt-2 text-sm text-muted">Acesse o painel do seu restaurante.</p>
        <LoginForm next={next} />
        <div className="mt-5 flex justify-between text-sm">
          <Link href="/recuperar-senha" className="font-medium text-brand-700">Recuperar senha</Link>
          <Link href="/cadastro" className="font-medium text-brand-700">Criar conta</Link>
        </div>
      </section>
    </main>
  );
}
