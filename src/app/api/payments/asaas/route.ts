import { NextRequest, NextResponse } from "next/server";
import { asaasRequest, digits } from "@/lib/asaas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { estimateDelivery, isZlhubConfigured } from "@/lib/zlhub";
import { coupons } from "@/lib/data/seed";
import type { Order, Product } from "@/types/domain";

export const runtime = "nodejs";
export const maxDuration = 60;

type CardInput = {
  holderName: string;
  number: string;
  expiry: string;
  ccv: string;
  cpfCnpj: string;
  email: string;
  postalCode: string;
  addressNumber: string;
};

type DeliveryAddress = {
  street?: string;
  number?: string;
  neighborhood?: string;
};

type PaymentBody = {
  restaurantSlug: string;
  order: Order;
  cpfCnpj: string;
  email: string;
  card?: CardInput;
  delivery?: DeliveryAddress;
};

type AsaasCustomer = { id: string };
type AsaasList<T> = { data: T[] };
type AsaasPayment = { id: string; status: string };
type AsaasPix = { encodedImage: string; payload: string; expirationDate: string };

// Separado de applyTotals porque o frete gratis precisa saber o subtotal
// antes de decidir a taxa de entrega (ver POST abaixo).
function calculateSubtotal(order: Order, products: Product[]) {
  let subtotal = 0;
  for (const item of order.items) {
    const product = products.find((candidate) => candidate.id === item.productId && candidate.active);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new Error("Um item do carrinho não está mais disponível.");
    }
    const unitPrice = item.variation
      ? product.variations.find((variation) => variation.id === item.variation?.id)?.price
      : product.price;
    if (unitPrice === undefined) throw new Error("Variação de produto inválida.");
    const addons = item.addons.reduce((sum, selected) => {
      const addon = product.addons.find((candidate) => candidate.id === selected.id);
      if (!addon) throw new Error("Adicional de produto inválido.");
      return sum + addon.price;
    }, 0);
    subtotal += (unitPrice + addons) * item.quantity;
  }
  return subtotal;
}

function applyTotals(order: Order, subtotal: number, deliveryFee: number) {
  const fee = order.type === "delivery" ? deliveryFee : 0;
  const coupon = coupons.find((candidate) => candidate.code === order.couponCode && candidate.active);
  let discount = 0;
  if (coupon && subtotal + fee >= (coupon.minimumOrderValue ?? 0)) {
    discount = coupon.type === "percent" ? subtotal * (coupon.value / 100) : coupon.type === "fixed" ? coupon.value : fee;
  }
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    subtotal: round(subtotal),
    deliveryFee: round(fee),
    discount: round(discount),
    amount: round(Math.max(subtotal + fee - discount, 0))
  };
}

// Le a taxa de entrega e o limite de frete gratis do restaurante. Tolerante a
// migracao 015 ainda nao aplicada: se a coluna free_shipping_threshold nao
// existir, cai para a busca sem ela em vez de derrubar o checkout inteiro.
async function getRestaurantDeliverySettings(admin: ReturnType<typeof createSupabaseAdminClient>, slug: string) {
  const withThreshold = await admin
    .from("restaurants")
    .select("delivery_fee, free_shipping_threshold")
    .eq("slug", slug)
    .single();

  if (!withThreshold.error) {
    const row = withThreshold.data as { delivery_fee: number | string; free_shipping_threshold: number | string | null };
    const threshold = row.free_shipping_threshold != null ? Number(row.free_shipping_threshold) : null;
    return { deliveryFee: Number(row.delivery_fee) || 0, freeShippingThreshold: threshold && threshold > 0 ? threshold : null };
  }

  const fallback = await admin.from("restaurants").select("delivery_fee").eq("slug", slug).single();
  if (fallback.error || !fallback.data) return null;
  return { deliveryFee: Number(fallback.data.delivery_fee) || 0, freeShippingThreshold: null };
}

// Frete: usa a cotação dinâmica do ZL Hub para delivery; cai para a taxa fixa
// do restaurante se a integração estiver desligada ou indisponível.
async function resolveDeliveryFee(order: Order, delivery: DeliveryAddress | undefined, fallbackFee: number) {
  if (order.type !== "delivery") return 0;
  if (isZlhubConfigured() && delivery?.street && delivery?.neighborhood) {
    try {
      const estimate = await estimateDelivery({
        street: delivery.street,
        number: delivery.number,
        neighborhood: delivery.neighborhood
      });
      if (estimate.available) return estimate.fee;
    } catch {
      // segue com a taxa fixa
    }
  }
  return fallbackFee;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    // Compra somente com conta logada (usuário anônimo/convidado não vale).
    if (!auth.user || auth.user.is_anonymous) {
      return NextResponse.json({ error: "Faça login ou crie sua conta para finalizar o pedido." }, { status: 401 });
    }
    const body = (await request.json()) as PaymentBody;
    if (!body.order?.items?.length || !["pix", "credit_card"].includes(body.order.paymentMethod)) {
      return NextResponse.json({ error: "Dados do pagamento inválidos." }, { status: 400 });
    }
    const phoneDigits = digits(body.order.customer?.phone ?? "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json({ error: "Informe um telefone válido com DDD." }, { status: 400 });
    }

    const cpfCnpj = digits(body.card?.cpfCnpj ?? body.cpfCnpj);
    const email = (body.card?.email ?? body.email).trim().toLowerCase();
    if (![11, 14].includes(cpfCnpj.length) || !email.includes("@")) {
      return NextResponse.json({ error: "Informe CPF/CNPJ e e-mail válidos." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const [snapshotResult, restaurantSettings] = await Promise.all([
      admin.from("menu_snapshots").select("products").eq("restaurant_slug", body.restaurantSlug).single(),
      getRestaurantDeliverySettings(admin, body.restaurantSlug)
    ]);
    const snapshot = snapshotResult.data;
    if (!snapshot || !restaurantSettings) return NextResponse.json({ error: "Cardápio indisponível para pagamento." }, { status: 400 });

    const subtotal = calculateSubtotal(body.order, snapshot.products as Product[]);
    const freeShippingUnlocked =
      body.order.type === "delivery" &&
      restaurantSettings.freeShippingThreshold != null &&
      subtotal >= restaurantSettings.freeShippingThreshold;
    const deliveryFee = freeShippingUnlocked ? 0 : await resolveDeliveryFee(body.order, body.delivery, restaurantSettings.deliveryFee);
    const totals = applyTotals(body.order, subtotal, deliveryFee);
    const amount = totals.amount;
    if (amount < 0.5) return NextResponse.json({ error: "Valor do pedido inválido." }, { status: 400 });

    const existing = await asaasRequest<AsaasList<AsaasCustomer>>(`/customers?cpfCnpj=${cpfCnpj}&limit=1`);
    const customer = existing.data[0] ?? (await asaasRequest<AsaasCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: body.order.customer.name,
        cpfCnpj,
        email,
        mobilePhone: digits(body.order.customer.phone),
        externalReference: auth.user?.id ?? digits(body.order.customer.phone),
        notificationDisabled: true
      })
    }));

    const { data: session, error: sessionError } = await admin.from("asaas_payment_sessions").insert({
      restaurant_slug: body.restaurantSlug,
      customer_user_id: auth.user?.id ?? null,
      order_data: { ...body.order, subtotal: totals.subtotal, deliveryFee: totals.deliveryFee, discount: totals.discount, total: amount },
      payment_method: body.order.paymentMethod,
      amount,
      asaas_customer_id: customer.id
    }).select("id").single();
    if (sessionError || !session) throw new Error("Não foi possível iniciar o pagamento.");

    const paymentPayload: Record<string, unknown> = {
      customer: customer.id,
      billingType: body.order.paymentMethod === "pix" ? "PIX" : "CREDIT_CARD",
      value: amount,
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pedido ${body.order.code} - DGourmet`,
      externalReference: session.id
    };

    if (body.order.paymentMethod === "credit_card") {
      if (!body.card) throw new Error("Dados do cartão não informados.");
      const [expiryMonth, shortYear] = body.card.expiry.split("/").map((value) => digits(value));
      paymentPayload.creditCard = {
        holderName: body.card.holderName,
        number: digits(body.card.number),
        expiryMonth,
        expiryYear: shortYear.length === 2 ? `20${shortYear}` : shortYear,
        ccv: digits(body.card.ccv)
      };
      paymentPayload.creditCardHolderInfo = {
        name: body.card.holderName,
        email,
        cpfCnpj,
        postalCode: digits(body.card.postalCode),
        addressNumber: body.card.addressNumber,
        mobilePhone: digits(body.order.customer.phone)
      };
      paymentPayload.remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "";
    }

    const payment = await asaasRequest<AsaasPayment>("/payments", { method: "POST", body: JSON.stringify(paymentPayload) });
    const approved = ["CONFIRMED", "RECEIVED"].includes(payment.status);
    const update: Record<string, unknown> = { asaas_payment_id: payment.id, status: approved ? "approved" : "pending", updated_at: new Date().toISOString() };

    let pix: AsaasPix | undefined;
    if (body.order.paymentMethod === "pix") {
      pix = await asaasRequest<AsaasPix>(`/payments/${payment.id}/pixQrCode`);
      Object.assign(update, { pix_encoded_image: pix.encodedImage, pix_payload: pix.payload, pix_expiration_date: pix.expirationDate });
    }
    await admin.from("asaas_payment_sessions").update(update).eq("id", session.id);

    return NextResponse.json({ sessionId: session.id, status: approved ? "approved" : "pending", pix });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao processar pagamento." }, { status: 400 });
  }
}
