"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/auth/google-icon";

export function LoginForm({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
        restaurant_name: "Meu restaurante",
        owner_name: email
      });
    }

    router.push(next);
    router.refresh();
  }

  async function signInWithGoogle() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void signInWithPassword();
      }}
    >
      <Input type="email" placeholder="email@restaurante.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Input type="password" placeholder="Senha" value={password} onChange={(event) => setPassword(event.target.value)} required />
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Entrando..." : "Entrar"}
      </Button>
      <Button variant="secondary" className="w-full" disabled={loading} onClick={signInWithGoogle} type="button">
        <GoogleIcon />
        Entrar com Google
      </Button>
      {message && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
    </form>
  );
}
