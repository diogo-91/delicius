import Link from "next/link";
import { RecoverPasswordForm } from "@/components/auth/recover-password-form";

export default function RecoverPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-900 p-4">
      <section className="w-full max-w-md rounded-lg border border-white/70 bg-white p-8 shadow-panel">
        <img src="/komanda-logo.png" alt="Komanda.ia" className="mb-6 h-16 w-16 rounded-lg object-contain" />
        <h1 className="text-2xl font-bold text-ink">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted">Informe seu email para receber o link de redefinicao.</p>
        <RecoverPasswordForm />
        <Link href="/login" className="mt-5 inline-block text-sm font-medium text-brand-700">Voltar para login</Link>
      </section>
    </main>
  );
}
