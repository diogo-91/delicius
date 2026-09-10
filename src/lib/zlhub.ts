// Cliente da API ZL Hub (https://integracao.zlhub.com.br/doc) — cotacao e
// abertura de entregas por motoboy. Roda somente no servidor.

const defaultBaseUrl = "https://integracao.zlhub.com.br";

// Endereco de partida da loja. Pode ser sobrescrito por env.
const origin = {
  endereco: process.env.ZLHUB_ORIGIN_ENDERECO ?? "R. Aparecida, 1341",
  bairro: process.env.ZLHUB_ORIGIN_BAIRRO ?? "Santa Rosalia",
  cidade: process.env.ZLHUB_ORIGIN_CIDADE ?? "Sorocaba",
  estado: process.env.ZLHUB_ORIGIN_ESTADO ?? "SP"
};

// Unidade do valor retornado pela API ("reais" ou "centavos"). Ajuste via env
// depois de conferir uma cotacao real.
const valueIsCents = (process.env.ZLHUB_VALUE_UNIT ?? "reais").toLowerCase() === "centavos";

export function isZlhubConfigured() {
  return Boolean(process.env.ZLHUB_API_KEY);
}

function baseUrl() {
  return (process.env.ZLHUB_API_URL ?? defaultBaseUrl).replace(/\/$/, "");
}

// O token vale 3 dias; guardamos em memoria do processo com folga.
let tokenCache: { token: string; expiresAt: number } | null = null;

async function zlhubFetch(path: string, init: RequestInit) {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: { accept: "application/json", "content-type": "application/json", ...init.headers },
    cache: "no-store",
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : null) ?? `ZL Hub respondeu ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function pickString(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== "object") return null;
  const record = source as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function getZlhubToken(): Promise<string> {
  const apiKey = process.env.ZLHUB_API_KEY;
  if (!apiKey) throw new Error("Integracao de entregas nao configurada.");

  if (tokenCache && tokenCache.expiresAt > Date.now()) return tokenCache.token;

  const data = await zlhubFetch("/token", { method: "POST", body: JSON.stringify({ api_key: apiKey }) });
  const token =
    pickString(data, ["token", "access_token", "accessToken"]) ??
    pickString((data as { data?: unknown })?.data, ["token", "access_token", "accessToken"]);
  if (!token) throw new Error("ZL Hub nao retornou o token de autenticacao.");

  // renova bem antes dos 3 dias
  tokenCache = { token, expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000 };
  return token;
}

export type DeliveryDestination = {
  street: string;
  number?: string;
  neighborhood: string;
  city?: string;
  state?: string;
};

export type DeliveryEstimate = {
  available: boolean;
  fee: number; // em reais
  km: number | null;
  minutes: number | null;
  raw: unknown;
};

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
    const loose = Number(value);
    if (Number.isFinite(loose)) return loose;
  }
  return null;
}

function readEstimateFields(source: unknown): { km: number | null; minutes: number | null; valor: number | null } {
  if (!source || typeof source !== "object") return { km: null, minutes: null, valor: null };
  const record = source as Record<string, unknown>;
  return {
    km: toNumber(record.estimativa_km ?? record.km ?? record.distancia_km ?? record.distancia),
    minutes: toNumber(record.estimativa_minutos ?? record.minutos ?? record.tempo_minutos ?? record.tempo),
    valor: toNumber(record.estimativa_valor ?? record.valor ?? record.valor_entrega ?? record.preco)
  };
}

export async function estimateDelivery(destination: DeliveryDestination): Promise<DeliveryEstimate> {
  const token = await getZlhubToken();
  const enderecoDesejado = [destination.street, destination.number].filter(Boolean).join(", ");

  const data = await zlhubFetch("/estimativa", {
    method: "POST",
    headers: { authorization: token },
    body: JSON.stringify({
      endereco_partida: origin.endereco,
      bairro_partida: origin.bairro,
      cidade_partida: origin.cidade,
      estado_partida: origin.estado,
      endereco_desejado: enderecoDesejado,
      bairro_desejado: destination.neighborhood,
      cidade_desejado: destination.city ?? origin.cidade,
      estado_desejado: destination.state ?? origin.estado
    })
  });

  // a resposta pode vir no topo, em `data`, ou em `estimativas`/`estimativa`
  const containers = [
    data,
    (data as { data?: unknown })?.data,
    (data as { estimativas?: unknown })?.estimativas,
    (data as { estimativa?: unknown })?.estimativa
  ];
  let fields = { km: null as number | null, minutes: null as number | null, valor: null as number | null };
  for (const container of containers) {
    const parsed = readEstimateFields(container);
    if (parsed.valor != null || parsed.km != null || parsed.minutes != null) {
      fields = parsed;
      break;
    }
  }

  if (fields.valor == null) {
    return { available: false, fee: 0, km: fields.km, minutes: fields.minutes, raw: data };
  }

  const fee = Math.round((valueIsCents ? fields.valor / 100 : fields.valor) * 100) / 100;
  return { available: fee > 0, fee, km: fields.km, minutes: fields.minutes, raw: data };
}
