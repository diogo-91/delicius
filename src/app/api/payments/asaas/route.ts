import { NextRequest, NextResponse } from "next/server";
import { asaasRequest, digits } from "@/lib/asaas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

type PaymentBody = {
  restaurantSlug: string;
  order: Order;
  cpfCnpj: string;
  email: string;
  card?: CardInput;
};

type AsaasCustomer = { id: string };
type AsaasList<T> = { data: T[] };
type AsaasPayment = { id: string; status: string };
type AsaasPix = { encodedImage: string; payload: string; expirationDate: string };

function calculateOrder(order: Order, products: Product[], deliveryFee: number) {
  let subtotal = 0;
  for (const item of order.items) {
    const product = products.find((candidate) => candidate.id === item.productId && candidate.active);
    if (!product || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new Error("Um item do carrinho nao esta mais disponivel.");
    }
    const unitPrice = item.variation
      ? product.variations.find((variation) => variation.id === item.variation?.id)?.price
      : product.price;
    if (unitPrice === undefined) throw new Error("Variacao de produto invalida.");
    const addons = item.addons.reduce((sum, selected) => {
      const addon = product.addons.find((candidate) => candidate.id === selected.id);
      if (!addon) throw new Error("Adicional de produto invalido.");
      return sum + addon.price;
    }, 0);
    subtotal += (unitPrice + addons) * item.quantity;
  }

  const fee = order.type === "delivery" ? deliveryFee : 0;
  const coupon = coupons.find((candidate) => candidate.code === order.couponCode && candidate.active);
  let discount = 0;
  if (coupon && subtotal + fee >= (coupon.minimumOrderValue ?? 0)) {
    discount = coupon.type === "percent" ? subtotal * (coupon.value / 100) : coupon.type === "fixed" ? coupon.value : fee;
  }
  return Math.round(Math.max(subtotal + fee - discount, 0) * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    const body = (await request.json()) as PaymentBody;
    if (!body.order?.items?.length || !["pix", "credit_card"].includes(body.order.paymentMethod)) {
      return NextResponse.json({ error: "Dados do pagamento invalidos." }, { status: 400 });
    }

    const cpfCnpj = digits(body.card?.cpfCnpj ?? body.cpfCnpj);
    const email = (body.card?.email ?? body.email).trim().toLowerCase();
    if (![11, 14].includes(cpfCnpj.length) || !email.includes("@")) {
      return NextResponse.json({ error: "Informe CPF/CNPJ e e-mail validos." }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const [{ data: snapshot }, { data: restaurant }] = await Promise.all([
      admin.from("menu_snapshots").select("products").eq("restaurant_slug", body.restaurantSlug).single(),
      admin.from("restaurants").select("delivery_fee").eq("slug", body.restaurantSlug).single()
    ]);
    if (!snapshot || !restaurant) return NextResponse.json({ error: "Cardapio indisponivel para pagamento." }, { status: 400 });

    const amount = calculateOrder(body.order, snapshot.products as Product[], Number(restaurant.delivery_fee));
    if (amount < 0.5) return NextResponse.json({ error: "Valor do pedido invalido." }, { status: 400 });

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
      order_data: { ...body.order, total: amount },
      payment_method: body.order.paymentMethod,
      amount,
      asaas_customer_id: customer.id
    }).select("id").single();
    if (sessionError || !session) throw new Error("Nao foi possivel iniciar o pagamento.");

    const paymentPayload: Record<string, unknown> = {
      customer: customer.id,
      billingType: body.order.paymentMethod === "pix" ? "PIX" : "CREDIT_CARD",
      value: amount,
      dueDate: new Date().toISOString().slice(0, 10),
      description: `Pedido ${body.order.code} - DGourmet`,
      externalReference: session.id
    };

    if (body.order.paymentMethod === "credit_card") {
      if (!body.card) throw new Error("Dados do cartao nao informados.");
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
