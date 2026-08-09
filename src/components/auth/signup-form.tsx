"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GoogleIcon } from "@/components/auth/google-icon";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    restaurantName: "",
    email: "",
    password: "",
    whatsapp: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          full_name: form.name,
          restaurant_name: form.restaurantName,
          whatsapp: form.whatsapp,
          role: "owner"
        }
      }
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data.session) {
      await supabase.rpc("ensure_owner_profile", {
        restaurant_name: form.restaurantName,
        owner_name: form.name
      });
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setMessage("Cadastro criado. Confira seu e-mail para confirmar a conta antes de entrar.");
  }

  async function signUpWithGoogle() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
      }
    });

    if (error) {
      setLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <form
      className="mt-6 grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        void createAccount();
      }}
    >
      <Input placeholder="Seu nome" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      <Input placeholder="Nome do restaurante" value={form.restaurantName} onChange={(event) => setForm({ ...form, restaurantName: event.target.value })} required />
      <Input className="sm:col-span-2" type="email" placeholder="email@restaurante.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      <Input type="password" placeholder="Senha" minLength={6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      <Input placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
      <Button className="sm:col-span-2" disabled={loading} type="submit">
        {loading ? "Criando..." : "Cadastrar"}
      </Button>
      <Button variant="secondary" className="sm:col-span-2" disabled={loading} onClick={signUpWithGoogle} type="button">
        <GoogleIcon />
        Criar/entrar com Google
      </Button>
      {message && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700 sm:col-span-2">{message}</p>}
    </form>
  );
}
