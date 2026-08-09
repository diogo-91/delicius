"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecoverPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function recoverPassword() {
    setLoading(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
    });
    setLoading(false);

    setMessage(error ? error.message : "Enviamos o link de redefinicao para seu e-mail.");
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void recoverPassword();
      }}
    >
      <Input type="email" placeholder="email@restaurante.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
      <Button className="w-full" disabled={loading} type="submit">
        {loading ? "Enviando..." : "Enviar link"}
      </Button>
      {message && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">{message}</p>}
    </form>
  );
}
