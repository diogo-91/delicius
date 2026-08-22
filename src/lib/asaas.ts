const defaultAsaasUrl = "https://api.asaas.com/v3";

export async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("Gateway de pagamento nao configurado.");

  const response = await fetch(`${process.env.ASAAS_API_URL ?? defaultAsaasUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: apiKey,
      ...init?.headers
    },
    cache: "no-store",
    signal: AbortSignal.timeout(65000)
  });
  const data = (await response.json().catch(() => ({}))) as T & { errors?: Array<{ description?: string }> };
  if (!response.ok) {
    throw new Error(data.errors?.map((error) => error.description).filter(Boolean).join(" ") || "Pagamento recusado pelo Asaas.");
  }
  return data;
}

export function digits(value: string) {
  return value.replace(/\D/g, "");
}
