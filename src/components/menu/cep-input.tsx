"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { fetchAddressByCep, type CepAddress } from "@/lib/cep";
import { maskCep, onlyDigits } from "@/lib/masks";
import { Input } from "@/components/ui/input";

type CepInputProps = {
  value: string;
  onChange: (maskedCep: string) => void;
  // Chamado quando o CEP e encontrado; o pai preenche rua/bairro/cidade/UF.
  onResolved: (address: CepAddress) => void;
  className?: string;
};

export function CepInput({ value, onChange, onResolved, className }: CepInputProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notFound" | "error">("idle");
  const lastLookup = useRef("");
  const onResolvedRef = useRef(onResolved);
  onResolvedRef.current = onResolved;

  const digits = onlyDigits(value);

  useEffect(() => {
    if (digits.length !== 8) {
      if (status !== "idle") setStatus("idle");
      lastLookup.current = "";
      return;
    }
    if (lastLookup.current === digits) return;
    lastLookup.current = digits;

    let cancelled = false;
    setStatus("loading");
    fetchAddressByCep(digits)
      .then((address) => {
        if (cancelled) return;
        if (!address) {
          setStatus("notFound");
          return;
        }
        setStatus("found");
        onResolvedRef.current(address);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  return (
    <div className={className}>
      <div className="relative">
        <Input
          className="bg-white pr-10"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
          placeholder="CEP (somente números)"
          value={value}
          onChange={(event) => onChange(maskCep(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          {status === "loading" && <LoaderCircle className="h-4 w-4 animate-spin text-muted" />}
          {status === "found" && <CheckCircle2 className="h-4 w-4 text-success-600" />}
          {(status === "notFound" || status === "error") && <TriangleAlert className="h-4 w-4 text-amber-600" />}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-muted2">
        {status === "loading" && "Buscando endereço..."}
        {status === "found" && "Endereço preenchido pelo CEP. Confira e informe o número."}
        {status === "notFound" && "CEP não encontrado. Preencha o endereço manualmente."}
        {status === "error" && "Não foi possível consultar o CEP agora. Preencha manualmente."}
        {status === "idle" && (
          <>
            Digite o CEP para preencher o endereço.{" "}
            <a
              className="font-semibold text-brand-700 underline"
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              Não sei meu CEP
            </a>
          </>
        )}
      </p>
    </div>
  );
}
