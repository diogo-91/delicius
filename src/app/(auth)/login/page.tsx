import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next ?? "/dashboard";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#2F1710] px-4 py-6 sm:px-6 lg:flex lg:items-center lg:justify-center lg:py-8">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#D4A72C]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#B3261E]/20 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-4xl overflow-hidden rounded-[26px] bg-[#FFF8EF] shadow-[0_22px_70px_rgba(0,0,0,0.34),0_0_70px_rgba(212,167,44,0.10)] lg:grid-cols-[0.88fr_1.12fr]">
        <aside className="relative hidden overflow-hidden bg-[#4F2618] p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#D4A72C]/15 blur-sm" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#B3261E]/25 blur-2xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#F6D77C] shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Gestão inteligente
            </span>
            <h2 className="mt-6 max-w-sm font-display text-3xl font-bold leading-tight">
              Seu negócio organizado em um só lugar.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
              Acompanhe pedidos, produtos e resultados com uma operação simples, rápida e segura.
            </p>
          </div>

          <div className="relative flex items-center gap-3 text-sm text-white/75">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <ShieldCheck className="h-5 w-5 text-[#F6D77C]" />
            </span>
            <div>
              <strong className="block font-semibold text-white">Acesso administrativo</strong>
              Ambiente protegido para sua equipe
            </div>
          </div>
        </aside>

        <div className="flex min-h-[510px] items-center p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#9A5A3C]">Painel administrativo</span>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#3A1F16]">Bem-vindo de volta</h1>
              <p className="mt-2 text-sm leading-6 text-[#75645D]">Entre com seus dados para gerenciar sua operação.</p>
            </div>

            <LoginForm next={next} />

            <div className="mt-5 pt-2 text-sm">
              <Link href="/recuperar-senha" className="font-semibold text-[#7B3F2A] transition hover:text-[#4F2618]">Esqueci minha senha</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
