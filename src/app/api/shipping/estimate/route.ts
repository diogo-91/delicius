import { NextRequest, NextResponse } from "next/server";
import { estimateDelivery, isZlhubConfigured } from "@/lib/zlhub";

export const runtime = "nodejs";
export const maxDuration = 30;

type EstimateBody = {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export async function POST(request: NextRequest) {
  if (!isZlhubConfigured()) {
    return NextResponse.json({ configured: false, available: false }, { status: 200 });
  }

  let body: EstimateBody;
  try {
    body = (await request.json()) as EstimateBody;
  } catch {
    return NextResponse.json({ error: "Requisicao invalida." }, { status: 400 });
  }

  const street = body.street?.trim();
  const neighborhood = body.neighborhood?.trim();
  if (!street || !neighborhood) {
    return NextResponse.json({ error: "Informe rua e bairro para calcular o frete." }, { status: 400 });
  }

  try {
    const estimate = await estimateDelivery({
      street,
      number: body.number?.trim(),
      neighborhood,
      city: body.city?.trim() || undefined,
      state: body.state?.trim() || undefined
    });
    return NextResponse.json({
      configured: true,
      available: estimate.available,
      fee: estimate.fee,
      km: estimate.km,
      minutes: estimate.minutes
    });
  } catch (error) {
    return NextResponse.json(
      { configured: true, available: false, error: error instanceof Error ? error.message : "Falha ao calcular o frete." },
      { status: 200 }
    );
  }
}
