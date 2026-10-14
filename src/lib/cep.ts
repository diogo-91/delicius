// Busca de endereco por CEP em APIs publicas e gratuitas (sem chave):
// ViaCEP (base dos Correios) e, como reserva, BrasilAPI. Ambas liberam CORS,
// entao a consulta pode ser feita direto do navegador.

export type CepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  erro?: boolean | string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

type BrasilApiResponse = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { accept: "application/json" } });
  if (!response.ok) return null;
  return (await response.json()) as T;
}

// Retorna null quando o CEP nao existe. Lanca erro quando todas as APIs falham.
export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  let reachable = false;

  try {
    const data = await fetchJson<ViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`);
    if (data) {
      reachable = true;
      if (!data.erro) {
        return {
          street: data.logradouro ?? "",
          neighborhood: data.bairro ?? "",
          city: data.localidade ?? "",
          state: (data.uf ?? "").toUpperCase()
        };
      }
    }
  } catch {
    // tenta a API reserva
  }

  try {
    const data = await fetchJson<BrasilApiResponse>(`https://brasilapi.com.br/api/cep/v1/${digits}`);
    if (data) {
      reachable = true;
      return {
        street: data.street ?? "",
        neighborhood: data.neighborhood ?? "",
        city: data.city ?? "",
        state: (data.state ?? "").toUpperCase()
      };
    }
  } catch {
    // ignora
  }

  if (!reachable) throw new Error("Nao foi possivel consultar o CEP agora.");
  return null;
}
