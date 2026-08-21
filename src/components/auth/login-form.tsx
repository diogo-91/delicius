"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function signInWithPassword() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);

    if (error) {
      setMessage(error.message === "Invalid login credentials" ? "E-mail ou senha invalidos." : error.message);
      return;
    }

    if (next.startsWith("/dashboard")) {
      await supabase.rpc("ensure_owner_profile", {
        restaurant_name: "Meu negócio",
        owner_name: email
      });
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void signInWithPassword();
      }}
    >
      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#3A1F16]">E-mail</span>
        <span className="relative block">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A7B6E]" />
          <Input
            className="h-12 rounded-xl border-0 bg-white pl-11 shadow-[0_6px_22px_rgba(79,38,24,0.07)] placeholder:text-[#A8958C] focus:ring-4 focus:ring-[#EFD4C6]"
            type="email"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </span>
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#3A1F16]">Senha</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A7B6E]" />
          <Input
            className="h-12 rounded-xl border-0 bg-white px-11 shadow-[0_6px_22px_rgba(79,38,24,0.07)] placeholder:text-[#A8958C] focus:ring-4 focus:ring-[#EFD4C6]"
            type={showPassword ? "text" : "password"}
            placeholder="Digite sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-[#9A7B6E] transition hover:bg-[#FBF0EA] hover:text-[#7B3F2A]"
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>

      <Button variant="cta" className="h-12 w-full rounded-xl text-[15px] shadow-[0_10px_24px_rgba(179,38,30,0.2)]" disabled={loading} type="submit">
        {loading ? "Entrando..." : "Entrar no painel"}
        {!loading && <ArrowRight className="h-4 w-4" />}
      </Button>
      {message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 shadow-sm">{message}</p>}
    </form>
  );
}
