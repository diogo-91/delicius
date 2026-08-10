"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Clock, Crown, Flame, Gift, Heart, ListFilter, MapPin, Minus, PackageCheck, Plus, Search, Send, ShoppingBag, Sparkles, Star, Truck, UserCircle, Utensils, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { STORE_UPDATED_EVENT, createOrder, getCategories, getCoupons, getOrders, getProducts, getRestaurant } from "@/lib/data/mock-store";
import { getMenuSnapshot } from "@/lib/data/supabase-menu";
import { createRemoteOrder, getMyRemoteOrders } from "@/lib/data/supabase-orders";
import { getRemoteCustomerProfile, saveRemoteCustomerProfile } from "@/lib/data/supabase-customer-profile";
import { getPublicRestaurantBySlug } from "@/lib/data/supabase-restaurant";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatCurrency, formatScheduledFor } from "@/lib/utils";
import type { CartItem, Category, Coupon, Order, OrderStatus, OrderType, PaymentMethod, Product, Restaurant, WeekdaySchedule } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { GoogleIcon } from "@/components/auth/google-icon";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { generateAvailableSlots, type Slot } from "@/lib/menu/slots";
import { getCrossSellProducts, getHighlightProducts } from "@/lib/menu/highlights";
import { SocialProof } from "@/components/menu/social-proof";

const categoryIcons = [Gift, Star, Flame, Sparkles, Utensils, Utensils, ShoppingBag, ShoppingBag];
const menuSlug = "delicious-gourmet-bolos-e-salgados";

const benefits = [
  { icon: Sparkles, title: "Ingredientes selecionados", description: "Produtos frescos e de alta qualidade." },
  { icon: Heart, title: "Feito com amor", description: "Receitas especiais da casa." },
  { icon: Truck, title: "Entrega rápida e segura", description: "Seu pedido chega com cuidado." },
  { icon: PackageCheck, title: "Retirada no balcão", description: "Mais rapidez e praticidade." }
];

const defaultWeeklySchedule: WeekdaySchedule[] = [
  { day: 0, label: "Domingo", enabled: true, open: "09:00", close: "11:30" },
  { day: 1, label: "Segunda-feira", enabled: false, open: "09:30", close: "17:30" },
  { day: 2, label: "Terça-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 3, label: "Quarta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 4, label: "Quinta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 5, label: "Sexta-feira", enabled: true, open: "09:30", close: "17:30" },
  { day: 6, label: "Sábado", enabled: true, open: "09:00", close: "17:00" }
];

const defaultCustomer = {
  name: "",
  phone: "",
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  reference: ""
};

const customerProfileStorageKey = "kamanda.delicious.customer-profile";
const cartStorageKey = "kamanda.delicious.cart";
const reopenCartStorageKey = "kamanda.delicious.reopen-cart";

type CustomerForm = typeof defaultCustomer;

function readSavedCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(cartStorageKey);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function formatCustomerAddress(customer: CustomerForm) {
  return [
    customer.street ? `${customer.street}${customer.number ? `, ${customer.number}` : ""}` : "",
    customer.neighborhood,
    customer.complement ? `Compl.: ${customer.complement}` : "",
    customer.reference ? `Ref.: ${customer.reference}` : ""
  ]
    .filter(Boolean)
    .join(" - ");
}

function readSavedCustomerProfile(): CustomerForm {
  if (typeof window === "undefined") return defaultCustomer;
  const raw = window.localStorage.getItem(customerProfileStorageKey);
  return raw ? { ...defaultCustomer, ...(JSON.parse(raw) as Partial<CustomerForm>) } : defaultCustomer;
}

function parseScheduleMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatScheduleTime(value: string) {
  return value.replace(":", "h");
}

function getOpeningHoursSummary(schedule: WeekdaySchedule[]) {
  const enabled = schedule.filter((day) => day.enabled);
  const sunday = enabled.find((day) => day.day === 0);
  const monday = enabled.find((day) => day.day === 1);
  const saturday = enabled.find((day) => day.day === 6);
  const weekdays = enabled.filter((day) => day.day >= 2 && day.day <= 5);
  const parts: string[] = [];

  if (monday) parts.push(`Segunda-feira: ${formatScheduleTime(monday.open)} às ${formatScheduleTime(monday.close)}`);
  const weekdaySameTime = weekdays.length === 4 && weekdays.every((day) => day.open === weekdays[0].open && day.close === weekdays[0].close);
  if (weekdaySameTime) parts.push(`Terça a sexta: ${formatScheduleTime(weekdays[0].open)} às ${formatScheduleTime(weekdays[0].close)}`);
  else weekdays.forEach((day) => parts.push(`${day.label}: ${formatScheduleTime(day.open)} às ${formatScheduleTime(day.close)}`));

  if (saturday) parts.push(`Sábado: ${formatScheduleTime(saturday.open)} às ${formatScheduleTime(saturday.close)}`);
  if (sunday) parts.push(`Domingo: ${formatScheduleTime(sunday.open)} às ${formatScheduleTime(sunday.close)}`);

  return parts.length > 0 ? parts : ["Loja fechada todos os dias"];
}

function getStoreOpenStatus(restaurant: Restaurant, now: Date) {
  const weeklySchedule = restaurant.weeklySchedule ?? defaultWeeklySchedule;
  const schedule = weeklySchedule.find((day) => day.day === now.getDay() && day.enabled);
  const minutes = now.getHours() * 60 + now.getMinutes();

  if (!schedule) {
    return { isOpen: false, message: "Loja fechada agora. Volte no próximo horário de funcionamento." };
  }

  const open = parseScheduleMinutes(schedule.open);
  const close = parseScheduleMinutes(schedule.close);
  const isOpen = minutes >= open && minutes < close;
  return {
    isOpen,
    message: isOpen
      ? `Loja aberta agora. ${schedule.label}: ${formatScheduleTime(schedule.open)} às ${formatScheduleTime(schedule.close)}.`
      : `Loja fechada agora. Atendimento: ${schedule.label}: ${formatScheduleTime(schedule.open)} às ${formatScheduleTime(schedule.close)}.`
  };
}

const orderTimelineSteps: Array<{ status: OrderStatus; title: string; description: string }> = [
  { status: "new", title: "Pedido recebido", description: "O estabelecimento recebeu seu pedido." },
  { status: "preparing", title: "Em preparo", description: "Sua compra esta sendo preparada." },
  { status: "ready", title: "Pronto", description: "Pedido pronto para retirada ou envio." },
  { status: "out_for_delivery", title: "Saiu para entrega", description: "O pedido esta a caminho." },
  { status: "finished", title: "Finalizado", description: "Pedido concluido. Bom apetite!" }
];

const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Pedido recebido",
  preparing: "Em preparo",
  ready: "Pronto",
  out_for_delivery: "Saiu para entrega",
  finished: "Finalizado",
  cancelled: "Cancelado"
};

function OrderTimeline({ order }: { order: Order }) {
  const historyByStatus = new Map(order.history.map((entry) => [entry.status, entry]));
  const cancelledEntry = historyByStatus.get("cancelled");
  const currentIndex = orderTimelineSteps.findIndex((step) => step.status === order.status);

  if (cancelledEntry) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-4">
        <p className="text-sm font-semibold text-red-700">Pedido cancelado</p>
        <p className="mt-1 text-xs text-red-600">{new Date(cancelledEntry.createdAt).toLocaleString("pt-BR")}</p>
        <p className="mt-2 text-sm text-red-700">{cancelledEntry.note ?? "O pedido foi cancelado pelo estabelecimento."}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Acompanhe seu pedido</p>
          <p className="mt-1 text-xs text-muted">Atualiza conforme o estabelecimento muda o status.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{orderStatusLabels[order.status]}</span>
      </div>
      <div className="space-y-0">
        {orderTimelineSteps.map((step, index) => {
          const entry = historyByStatus.get(step.status);
          const completed = Boolean(entry) || index <= currentIndex;
          const active = step.status === order.status;
          const isLast = index === orderTimelineSteps.length - 1;

          return (
            <div key={step.status} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                    completed ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-muted"
                  }`}
                >
                  {completed ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                {!isLast && <span className={`h-10 w-px ${completed ? "bg-brand-200" : "bg-line"}`} />}
              </div>
              <div className={`pb-5 ${active ? "text-ink" : "text-muted"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{step.title}</p>
                  {active && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">Agora</span>}
                </div>
                <p className="mt-1 text-xs leading-5">{entry?.note ?? step.description}</p>
                {entry && <p className="mt-1 text-[11px] text-muted">{new Date(entry.createdAt).toLocaleString("pt-BR")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PublicMenu() {
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [restaurant, setRestaurant] = useState(() => getRestaurant());
  const [categories, setCategories] = useState<Category[]>(() => (supabaseConfigured ? [] : getCategories()));
  const [products, setProducts] = useState<Product[]>(() => (supabaseConfigured ? [] : getProducts().filter((product) => product.active)));
  const [menuLoading, setMenuLoading] = useState(supabaseConfigured);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>(readSavedCart);
  const [coupons, setCoupons] = useState<Coupon[]>(getCoupons());
  const [ordersSnapshot, setOrdersSnapshot] = useState<Order[]>(getOrders());
  const [customer, setCustomer] = useState<CustomerForm>(defaultCustomer);
  const [customerProfile, setCustomerProfile] = useState<CustomerForm>(defaultCustomer);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [type, setType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [addressMode, setAddressMode] = useState<"saved" | "other">("saved");
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [signupForm, setSignupForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [customerLoginForm, setCustomerLoginForm] = useState({ email: "", password: "" });
  const [localCustomerSession, setLocalCustomerSession] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);
  const [mobileCustomerOpen, setMobileCustomerOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "approved">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [slotPickerOpen, setSlotPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [lastOrderWasGuest, setLastOrderWasGuest] = useState(false);
  const [guestSavePromptDismissed, setGuestSavePromptDismissed] = useState(false);
  const remoteMenuLoadedRef = useRef(false);
  const remoteOrdersLoadedRef = useRef(false);
  const [cardForm, setCardForm] = useState({
    holder: "",
    number: "",
    expiry: "",
    cvv: "",
    cpf: ""
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (window.localStorage.getItem(reopenCartStorageKey) === "1") {
      window.localStorage.removeItem(reopenCartStorageKey);
      setCartModalOpen(true);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadRemoteRestaurant() {
      try {
        const remoteRestaurant = await getPublicRestaurantBySlug(menuSlug);
        if (!ignore && remoteRestaurant) {
          setRestaurant(remoteRestaurant);
        }
        const snapshot = await getMenuSnapshot(menuSlug);
        if (!ignore && snapshot && snapshot.products.length > 0) {
          remoteMenuLoadedRef.current = true;
          setCategories(snapshot.categories.length > 0 ? snapshot.categories : getCategories());
          setProducts(snapshot.products.filter((product) => product.active));
        }
      } finally {
        if (!ignore) setMenuLoading(false);
      }
    }

    loadRemoteRestaurant().catch(() => undefined);
    const interval = window.setInterval(() => {
      loadRemoteRestaurant().catch(() => undefined);
    }, 15000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!user && !localCustomerSession) return;
    let ignore = false;

    async function loadMyOrders() {
      const remoteOrders = await getMyRemoteOrders(restaurant.slug);
      if (!ignore && remoteOrders) {
        remoteOrdersLoadedRef.current = true;
        setOrdersSnapshot(remoteOrders);
      }
    }

    loadMyOrders().catch(() => undefined);
    const interval = window.setInterval(() => {
      loadMyOrders().catch(() => undefined);
    }, 8000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [user, localCustomerSession, restaurant.slug]);

  useEffect(() => {
    function refreshStoreData() {
      if (!remoteMenuLoadedRef.current && !supabaseConfigured) {
        setRestaurant(getRestaurant());
        setCategories(getCategories());
        setProducts(getProducts().filter((product) => product.active));
      }
      setCoupons(getCoupons());
      if (!remoteOrdersLoadedRef.current) setOrdersSnapshot(getOrders());
    }

    function handleStorage(event: StorageEvent) {
      if (!event.key || event.key.startsWith("kamanda.delicious.")) {
        refreshStoreData();
      }
    }

    refreshStoreData();
    const interval = window.setInterval(refreshStoreData, 2500);
    window.addEventListener(STORE_UPDATED_EVENT, refreshStoreData);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(STORE_UPDATED_EVENT, refreshStoreData);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const savedProfile = readSavedCustomerProfile();
    const userName = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
    const localProfile = {
      ...savedProfile,
      name: savedProfile.name || userName || "",
      phone: savedProfile.phone || user?.user_metadata?.phone || ""
    };
    setCustomerProfile(localProfile);
    setCustomer(localProfile);

    if (user) {
      getRemoteCustomerProfile().then((remoteProfile) => {
        if (ignore || !remoteProfile) return;
        const merged = { ...localProfile, ...remoteProfile };
        window.localStorage.setItem(customerProfileStorageKey, JSON.stringify(merged));
        setCustomerProfile(merged);
        setCustomer(merged);
      });
    }

    return () => {
      ignore = true;
    };
  }, [user?.id, localCustomerSession]);

  useEffect(() => {
    if (historyOrder) {
      setHistoryOrder(ordersSnapshot.find((order) => order.id === historyOrder.id) ?? historyOrder);
    }

    if (createdOrder) {
      setCreatedOrder(ordersSnapshot.find((order) => order.id === createdOrder.id) ?? createdOrder);
    }
  }, [createdOrder, historyOrder, ordersSnapshot]);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));

    return () => data.subscription.unsubscribe();
  }, [supabaseConfigured]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categoryId === activeCategory;
      const matchesSearch = !normalizedQuery || product.name.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, products, searchQuery]);

  const categoriesWithProducts = useMemo(
    () => categories.filter((category) => products.some((product) => product.categoryId === category.id)),
    [categories, products]
  );

  const highlightProducts = useMemo(() => getHighlightProducts(categories, products, []), [categories, products]);
  const crossSellProducts = useMemo(
    () => getCrossSellProducts(categories, products, cart.map((item) => item.productId)),
    [categories, products, cart]
  );

  const visibleCategories = useMemo(
    () =>
      categories
        .filter((category) => activeCategory === "all" || category.id === activeCategory)
        .map((category) => ({
          ...category,
          products: filteredProducts.filter((product) => product.categoryId === category.id)
        }))
        .filter((category) => category.products.length > 0),
    [activeCategory, categories, filteredProducts]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const addonsTotal = item.addons.reduce((addonSum, addon) => addonSum + addon.price, 0);
        return sum + (item.unitPrice + addonsTotal) * item.quantity;
      }, 0),
    [cart]
  );

  const deliveryFee = type === "delivery" ? restaurant.deliveryFee : 0;
  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.type === "percent") return Math.min(subtotal * (appliedCoupon.value / 100), subtotal + deliveryFee);
    if (appliedCoupon.type === "fixed") return Math.min(appliedCoupon.value, subtotal + deliveryFee);
    return Math.min(deliveryFee, subtotal + deliveryFee);
  }, [appliedCoupon, deliveryFee, subtotal]);
  const total = Math.max(subtotal + deliveryFee - discount, 0);
  const customerIsAuthenticated = Boolean(user || localCustomerSession);
  const customerHistory = customerIsAuthenticated ? ordersSnapshot.slice(0, 3) : [];
  const displayName = useMemo(() => restaurant.name.replace(/\s*BOLOS E SALGADOS\s*/i, "").trim(), [restaurant.name]);
  const [wordmarkName, wordmarkSubtitle] = useMemo(() => {
    const [first, ...rest] = displayName.split(/\s+/).filter(Boolean);
    const titleCased = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : displayName;
    return [titleCased, rest.join(" ")];
  }, [displayName]);
  const openingHours = useMemo(() => getOpeningHoursSummary(restaurant.weeklySchedule ?? defaultWeeklySchedule), [restaurant.weeklySchedule]);
  const openStatus = useMemo(() => getStoreOpenStatus(restaurant, now), [now, restaurant]);
  const storeAcceptingOrders = restaurant.isOpen && openStatus.isOpen;
  const closedMessage = restaurant.isOpen ? openStatus.message : "Loja fechada temporariamente.";
  const todaySchedule = useMemo(
    () => (restaurant.weeklySchedule ?? defaultWeeklySchedule).find((day) => day.day === now.getDay()),
    [restaurant.weeklySchedule, now]
  );
  const availableSlots = useMemo(
    () => generateAvailableSlots(restaurant.weeklySchedule ?? defaultWeeklySchedule, restaurant.averagePrepTime, now),
    [restaurant.weeklySchedule, restaurant.averagePrepTime, now]
  );

  function getAvailableStock(product: Product) {
    const cartQuantity = cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    return Math.max((product.stock ?? 20) - cartQuantity, 0);
  }

  function getCartQuantity(product: Product) {
    return cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
  }

  function incrementProduct(product: Product) {
    if (getAvailableStock(product) <= 0) return;
    setCreatedOrder(null);
    setPaymentStatus("idle");
    setPaymentMessage("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCart((current) => {
      const index = current.findIndex((item) => item.productId === product.id);
      if (index === -1) {
        const variation = product.variations[0];
        return [
          ...current,
          {
            productId: product.id,
            productName: product.name,
            unitPrice: variation?.price ?? product.price,
            quantity: 1,
            variation,
            addons: [],
            note: ""
          }
        ];
      }
      return current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: item.quantity + 1 } : item));
    });
  }

  function decrementProduct(product: Product) {
    setPaymentStatus("idle");
    setPaymentMessage("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCart((current) => {
      const index = current.findIndex((item) => item.productId === product.id);
      if (index === -1) return current;
      const nextQuantity = current[index].quantity - 1;
      return nextQuantity <= 0
        ? current.filter((_, itemIndex) => itemIndex !== index)
        : current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: nextQuantity } : item));
    });
  }

  function updateQuantity(index: number, quantity: number) {
    setPaymentStatus("idle");
    setPaymentMessage("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCart((current) => current.flatMap((item, itemIndex) => (itemIndex === index ? (quantity <= 0 ? [] : [{ ...item, quantity }]) : [item])));
  }

  async function submitOrder(items: CartItem[]) {
    const checkoutCustomer = addressMode === "saved" ? customerProfile : customer;
    const customerName = checkoutCustomer.name || customer.name || "Cliente Teste";
    const customerPhone = checkoutCustomer.phone || customer.phone || "(15) 99999-0000";

    if (items.length === 0) return;
    if (type === "delivery" && addressMode === "saved" && !formatCustomerAddress(customerProfile)) {
      setPaymentMessage("Cadastre um endereco na Area do cliente ou selecione outro endereco para entrega.");
      return;
    }
    if (paymentStatus !== "approved") {
      setPaymentStatus("approved");
      setPaymentMessage("Pagamento teste aprovado automaticamente.");
    }

    const address =
      type === "delivery"
        ? addressMode === "saved"
          ? formatCustomerAddress(customerProfile)
          : formatCustomerAddress(customer)
        : undefined;

    const wasGuest = !customerIsAuthenticated;

    const order = createOrder({
      customer: {
        name: customerName,
        phone: customerPhone,
        address
      },
      type,
      paymentMethod,
      items,
      discount,
      couponCode: appliedCoupon?.code
    });
    setCreatedOrder(order);
    setOrderDetailsOpen(false);
    setCart([]);
    setPaymentStatus("idle");
    setPaymentMessage("");
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponMessage("");
    setCustomer(customerProfile);
    setSlotPickerOpen(false);
    setSelectedSlot(null);
    setLastOrderWasGuest(wasGuest);
    setGuestSavePromptDismissed(false);

    if (wasGuest && supabaseConfigured) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signInAnonymously();
      } catch {
        // "Anonymous Sign-ins" pode ainda nao estar habilitado no projeto Supabase.
        // O pedido local ja foi criado; a sincronizacao abaixo cai no aviso padrao.
      }
    }

    try {
      const remoteOrder = await createRemoteOrder(restaurant.slug, order);
      if (remoteOrder) setCreatedOrder(remoteOrder);
    } catch (error) {
      setPaymentMessage(error instanceof Error ? `Pedido salvo, mas houve um erro ao enviar para o painel: ${error.message}` : "Pedido salvo, mas nao foi possivel enviar para o painel.");
    }
  }

  async function finishOrder() {
    if (!storeAcceptingOrders) {
      setPaymentMessage("A loja está fora do horário de funcionamento. Não é possível finalizar pedidos agora.");
      return;
    }
    await submitOrder(cart);
  }

  async function confirmScheduling() {
    if (!selectedSlot) return;
    await submitOrder(cart.map((item) => ({ ...item, scheduledFor: selectedSlot.iso })));
  }

  async function signInWithGoogle() {
    if (!supabaseConfigured) {
      setAuthMessage("Login de clientes em configuração.");
      return;
    }

    if (cartModalOpen) window.localStorage.setItem(reopenCartStorageKey, "1");
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/cardapio/${restaurant.slug}`
      }
    });
  }

  async function signOut() {
    if (supabaseConfigured) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    setUser(null);
    setLocalCustomerSession(false);
  }

  async function saveCustomerProfile() {
    window.localStorage.setItem(customerProfileStorageKey, JSON.stringify(customerProfile));
    setCustomer(customerProfile);
    setProfileEditing(false);
    setProfileMessage("Dados salvos. O checkout usara este endereço automaticamente.");

    if (customerIsAuthenticated) {
      try {
        await saveRemoteCustomerProfile(customerProfile);
      } catch (error) {
        setProfileMessage(
          error instanceof Error
            ? `Dados salvos neste navegador, mas nao foi possivel sincronizar com sua conta: ${error.message}`
            : "Dados salvos neste navegador, mas nao foi possivel sincronizar com sua conta."
        );
      }
    }
  }

  function updateCustomerProfile(nextProfile: CustomerForm) {
    setCustomerProfile(nextProfile);
    setProfileMessage("");
  }

  function openCart() {
    setCartModalOpen(true);
  }

  async function signInCustomerWithPassword() {
    if (!supabaseConfigured) {
      setAuthMessage("Supabase nao configurado. Use o cliente teste por enquanto.");
      return;
    }

    setAuthMessage("");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: customerLoginForm.email,
      password: customerLoginForm.password
    });

    if (error) {
      setAuthMessage(error.message === "Invalid login credentials" ? "E-mail ou senha invalidos." : error.message);
      return;
    }

    setAuthModalOpen(false);
    setCartModalOpen(true);
  }

  function selectPaymentMethod(method: PaymentMethod) {
    setPaymentMethod(method);
    setPaymentStatus("idle");
    setPaymentMessage("");
  }

  function simulatePayment() {
    if (paymentMethod !== "pix" && (!cardForm.holder || !cardForm.number || !cardForm.expiry || !cardForm.cvv || !cardForm.cpf)) {
      setCardForm({
        holder: "Cliente Teste",
        number: "4111 1111 1111 1111",
        expiry: "12/30",
        cvv: "123",
        cpf: "123.456.789-09"
      });
    }
    setPaymentStatus("approved");
    setPaymentMessage(paymentMethod === "pix" ? "Pix teste aprovado na simulacao." : "Cartao teste preenchido e aprovado na simulacao do Asaas.");
  }

  function applyCoupon() {
    const normalized = couponCode.trim().toUpperCase();
    const coupon = coupons.find((item) => item.code === normalized && item.active);
    const baseTotal = subtotal + deliveryFee;
    if (!coupon) {
      setAppliedCoupon(null);
      setCouponMessage("Cupom invalido. Teste DEL10, DOCE5 ou FRETEGRATIS.");
      return;
    }

    if (coupon.minimumOrderValue && baseTotal < coupon.minimumOrderValue) {
      setAppliedCoupon(null);
      setCouponMessage(`Cupom valido para pedidos acima de ${formatCurrency(coupon.minimumOrderValue)}.`);
      return;
    }

    setAppliedCoupon(coupon);
    setCouponCode(normalized);
    setPaymentStatus("idle");
    setPaymentMessage("");
    setCouponMessage(`Cupom aplicado: ${coupon.description}.`);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponMessage("");
    setPaymentStatus("idle");
    setPaymentMessage("");
  }

  async function createCustomerAccount() {
    if (!signupForm.name || !signupForm.email) {
      setAuthMessage("Informe nome e e-mail para criar seu cadastro.");
      return;
    }

    if (!supabaseConfigured) {
      setAuthMessage("Cadastro local criado. Ao conectar o Supabase, esta conta sera persistida.");
      setCustomer((current) => ({ ...current, name: signupForm.name, phone: signupForm.phone }));
      setLocalCustomerSession(true);
      setAuthModalOpen(false);
      setCartModalOpen(true);
      return;
    }

    if (!signupForm.password || signupForm.password.length < 6) {
      setAuthMessage("Informe uma senha com pelo menos 6 caracteres.");
      return;
    }

    setAuthMessage("");
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/cardapio/${restaurant.slug}`,
        data: {
          full_name: signupForm.name,
          phone: signupForm.phone,
          role: "customer"
        }
      }
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    const nextProfile = { ...customerProfile, name: signupForm.name, phone: signupForm.phone };
    window.localStorage.setItem(customerProfileStorageKey, JSON.stringify(nextProfile));
    setCustomerProfile(nextProfile);
    setCustomer(nextProfile);
    setLocalCustomerSession(Boolean(data.session));
    setAuthModalOpen(false);
    setCartModalOpen(true);
    if (!data.session) {
      setAuthMessage("Cadastro criado. Confira seu e-mail para confirmar a conta.");
    }
  }

  const cartContent = slotPickerOpen ? (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-ink2">Agendar pedido</h3>
      <p className="mt-1 text-sm text-muted2">A loja está fechada agora. Escolha quando deseja receber ou retirar:</p>
      {availableSlots.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-muted2">
          Nenhum horário disponível no momento. Tente novamente mais tarde ou fale conosco pelo WhatsApp.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableSlots.map((slot) => (
            <button
              key={slot.iso}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                selectedSlot?.iso === slot.iso ? "border-cta bg-cta text-white" : "border-line2 bg-white text-ink2 hover:border-cta"
              }`}
              onClick={() => setSelectedSlot(slot)}
              type="button"
            >
              {slot.label}
            </button>
          ))}
        </div>
      )}
      {selectedSlot && (
        <div className="mt-4 rounded-xl bg-paper p-4 text-sm text-ink2">
          <p className="font-semibold">Pedido agendado</p>
          <p className="mt-1 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {selectedSlot.label}
          </p>
          <p className="mt-1">{type === "delivery" ? "🛵 Entrega" : "📍 Retirada no balcão"}</p>
        </div>
      )}
      {paymentMessage && <p className="mt-3 text-xs font-medium text-amber-700">{paymentMessage}</p>}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="h-11 rounded-xl"
          onClick={() => {
            setSlotPickerOpen(false);
            setSelectedSlot(null);
          }}
          type="button"
        >
          Voltar
        </Button>
        <Button variant="cta" className="h-11 rounded-xl" disabled={!selectedSlot} onClick={confirmScheduling} type="button">
          CONFIRMAR • {formatCurrency(total)}
        </Button>
      </div>
    </div>
  ) : createdOrder ? (
    <div className="p-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <Check className="h-8 w-8" />
      </div>
      <h3 className="mt-6 text-xl font-semibold text-ink">Seu pedido esta prontinho!</h3>
      <p className="mt-3 text-sm leading-6 text-muted">O pedido foi enviado para o painel administrativo do estabelecimento.</p>
      <button
        className="mt-6 w-full rounded-xl bg-brand-50 p-4 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
        onClick={() => setOrderDetailsOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Send className="h-4 w-4" />
          Pedido {createdOrder.code} recebido. Clique para ver completo.
        </span>
      </button>
      {orderDetailsOpen && (
        <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4 text-left text-sm">
          <OrderTimeline order={createdOrder} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
              <p className="mt-1 font-semibold text-ink">{createdOrder.customer.name}</p>
              <p className="text-muted">{createdOrder.customer.phone}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pedido</p>
              <p className="mt-1 font-semibold text-ink">{createdOrder.code}</p>
              <p className="text-muted">{createdOrder.type === "delivery" ? "Entrega" : "Retirada"}</p>
            </div>
          </div>
          {createdOrder.customer.address && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Endereco</p>
              <p className="mt-1 text-ink">{createdOrder.customer.address}</p>
            </div>
          )}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Itens</p>
            <div className="mt-2 space-y-2">
              {createdOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 rounded-lg bg-white p-3 ring-1 ring-line">
                  <span>
                    {item.quantity}x {item.productName}
                    {item.scheduledFor && (
                      <span className="mt-0.5 block text-xs font-semibold text-brand-700">
                        Agendado para {formatScheduledFor(item.scheduledFor)}
                      </span>
                    )}
                  </span>
                  <strong>{formatCurrency(item.total)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg bg-navy-900 p-4 text-white">
            <div className="flex justify-between text-sm text-white/70"><span>Subtotal</span><span>{formatCurrency(createdOrder.subtotal)}</span></div>
            <div className="mt-2 flex justify-between text-sm text-white/70"><span>Entrega</span><span>{formatCurrency(createdOrder.deliveryFee)}</span></div>
            {createdOrder.discount > 0 && (
              <div className="mt-2 flex justify-between text-sm text-brand-500">
                <span>Desconto {createdOrder.couponCode ? `(${createdOrder.couponCode})` : ""}</span>
                <span>-{formatCurrency(createdOrder.discount)}</span>
              </div>
            )}
            <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-semibold"><span>Total</span><span className="text-brand-500">{formatCurrency(createdOrder.total)}</span></div>
          </div>
        </div>
      )}
      {lastOrderWasGuest && !guestSavePromptDismissed && (
        <div className="mt-4 rounded-xl border border-line2 bg-paper p-4 text-left">
          <p className="text-sm font-semibold text-ink2">Quer salvar seus dados para pedir mais rápido da próxima vez?</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="h-10 rounded-lg text-xs" onClick={() => setGuestSavePromptDismissed(true)} type="button">
              Agora não
            </Button>
            <Button
              variant="cta"
              className="h-10 rounded-lg text-xs"
              onClick={() => {
                setGuestSavePromptDismissed(true);
                setAuthModalOpen(true);
              }}
              type="button"
            >
              Salvar dados
            </Button>
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        className="mt-4 w-full rounded-xl"
        onClick={() => {
          setCreatedOrder(null);
          setCartModalOpen(false);
        }}
        type="button"
      >
        Fazer outra compra
      </Button>
    </div>
  ) : (
    <div className="grid gap-5 p-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-3">
        {cart.length === 0 && (
          <div className="rounded-xl bg-white/70 p-5 text-center text-sm text-muted ring-1 ring-line/70">
            Sua sacola ainda esta vazia. Escolha um item do cardapio para continuar.
          </div>
        )}
        {cart.map((item, index) => (
          <div key={`${item.productId}_${index}`} className="rounded-xl border border-line bg-white/70 p-4">
            <div className="flex justify-between gap-3">
              <strong className="text-sm text-ink">{item.productName}</strong>
              <span className="text-sm font-bold text-ink">{formatCurrency(item.unitPrice * item.quantity)}</span>
            </div>
            {item.scheduledFor && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-700">
                <CalendarDays className="h-3.5 w-3.5" />
                Agendado para {formatScheduledFor(item.scheduledFor)}
              </p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" className="h-8 w-8 rounded-lg px-0" onClick={() => updateQuantity(index, item.quantity - 1)} type="button">
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
              <Button variant="secondary" className="h-8 w-8 rounded-lg px-0" onClick={() => updateQuantity(index, item.quantity + 1)} type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {cart.length > 0 && crossSellProducts.length > 0 && (
          <div className="rounded-xl border border-line2 bg-paper p-4">
            <p className="text-sm font-semibold text-ink2">Combine com ❤️</p>
            <div className="mt-3 space-y-2">
              {crossSellProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between gap-3 rounded-lg bg-white p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img src={product.imageUrl} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink2">{product.name}</p>
                      <p className="text-xs text-muted2">{formatCurrency(product.variations[0]?.price ?? product.price)}</p>
                    </div>
                  </div>
                  <button
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cta text-white disabled:opacity-40"
                    disabled={getAvailableStock(product) <= 0}
                    onClick={() => incrementProduct(product)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
        <Input placeholder="Nome completo" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
        <Input placeholder="Telefone/WhatsApp" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Como deseja receber?</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "delivery", label: "Entrega" },
              { value: "pickup", label: "Retirada" }
            ].map((option) => (
              <button
                key={option.value}
                className={`h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                  type === option.value ? "border-brand-600 bg-brand-600 text-white shadow-soft" : "border-line bg-white text-ink hover:border-brand-500"
                }`}
                onClick={() => {
                  setType(option.value as OrderType);
                  setPaymentStatus("idle");
                  setPaymentMessage("");
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {type === "delivery" && (
          <div className="space-y-3 rounded-xl border border-line bg-white/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Endereco de entrega</p>
            <button
              className={`w-full rounded-xl border p-3 text-left transition ${
                addressMode === "saved" ? "border-brand-500 bg-brand-50 text-ink" : "border-line bg-white text-muted hover:border-brand-500"
              }`}
              onClick={() => setAddressMode("saved")}
              type="button"
            >
              <span className="block text-sm font-semibold text-ink">Usar endereco cadastrado</span>
              <span className="mt-1 block text-xs leading-5">{formatCustomerAddress(customerProfile) || "Cadastre seu endereco na Area do cliente."}</span>
            </button>
            <button
              className={`h-10 w-full rounded-xl border text-sm font-semibold transition ${
                addressMode === "other" ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink hover:border-brand-500"
              }`}
              onClick={() => setAddressMode("other")}
              type="button"
            >
              Entregar em outro endereco
            </button>
            {addressMode === "other" && (
              <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
                <Input className="bg-white" placeholder="Rua / Avenida" value={customer.street} onChange={(event) => setCustomer({ ...customer, street: event.target.value })} />
                <Input className="bg-white" placeholder="Numero" value={customer.number} onChange={(event) => setCustomer({ ...customer, number: event.target.value })} />
                <Input className="bg-white sm:col-span-2" placeholder="Bairro" value={customer.neighborhood} onChange={(event) => setCustomer({ ...customer, neighborhood: event.target.value })} />
                <Input className="bg-white sm:col-span-2" placeholder="Complemento (apto, bloco, casa)" value={customer.complement} onChange={(event) => setCustomer({ ...customer, complement: event.target.value })} />
                <Textarea className="min-h-20 bg-white sm:col-span-2" placeholder="Ponto de referencia ou observacao da entrega" value={customer.reference} onChange={(event) => setCustomer({ ...customer, reference: event.target.value })} />
              </div>
            )}
          </div>
        )}
        <div className="rounded-xl border border-line bg-white/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cupom de desconto</p>
          <div className="mt-2 flex gap-2">
            <Input
              className="h-10 bg-white uppercase"
              placeholder="DEL10, DOCE5 ou FRETEGRATIS"
              value={couponCode}
              onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
            />
            {appliedCoupon ? (
              <Button variant="secondary" className="h-10 rounded-lg px-3 text-xs" onClick={removeCoupon} type="button">
                Remover
              </Button>
            ) : (
              <Button variant="secondary" className="h-10 rounded-lg px-3 text-xs" onClick={applyCoupon} type="button">
                Aplicar
              </Button>
            )}
          </div>
          {couponMessage && <p className={`mt-2 text-xs font-medium ${appliedCoupon ? "text-brand-700" : "text-amber-700"}`}>{couponMessage}</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Forma de pagamento</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { value: "pix", label: "Pix" },
              { value: "credit_card", label: "Cartao de credito" },
              { value: "debit_card", label: "Cartao de debito" }
            ].map((option) => (
              <button
                key={option.value}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold transition ${
                  paymentMethod === option.value ? "border-brand-600 bg-brand-500 text-white shadow-soft" : "border-line bg-white text-ink hover:border-brand-500"
                }`}
                onClick={() => selectPaymentMethod(option.value as PaymentMethod)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === "pix" ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50 p-3">
            <div className="flex gap-3">
              <div className="grid h-24 w-24 shrink-0 grid-cols-5 gap-1 rounded-lg bg-white p-2 ring-1 ring-brand-100">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} className={`rounded-sm ${index % 2 === 0 || index % 7 === 0 ? "bg-navy-900" : "bg-slate-100"}`} />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Pix copia e cola</p>
                <p className="mt-1 break-all rounded-lg bg-white p-2 text-xs leading-5 text-muted ring-1 ring-brand-100">
                  00020126580014br.gov.bcb.pix0136komanda-delicious-gourmet-mock520400005303986540{total.toFixed(2)}5802BR5925DELICIOUS GOURMET MOCK6008SOROCABA
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-xl border border-line bg-white/60 p-3 sm:grid-cols-2">
            <Input className="bg-white sm:col-span-2" placeholder="Nome impresso no cartao" value={cardForm.holder} onChange={(event) => setCardForm({ ...cardForm, holder: event.target.value })} />
            <Input className="bg-white sm:col-span-2" placeholder="Numero do cartao" value={cardForm.number} onChange={(event) => setCardForm({ ...cardForm, number: event.target.value })} />
            <Input className="bg-white" placeholder="Validade MM/AA" value={cardForm.expiry} onChange={(event) => setCardForm({ ...cardForm, expiry: event.target.value })} />
            <Input className="bg-white" placeholder="CVV" value={cardForm.cvv} onChange={(event) => setCardForm({ ...cardForm, cvv: event.target.value })} />
            <Input className="bg-white sm:col-span-2" placeholder="CPF do titular" value={cardForm.cpf} onChange={(event) => setCardForm({ ...cardForm, cpf: event.target.value })} />
          </div>
        )}

        <div className="rounded-xl border border-line bg-white/70 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Pagamento Asaas mock</p>
              <p className="mt-1 text-xs text-muted">Nenhuma cobranca real sera criada nesta etapa.</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatus === "approved" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-muted"}`}>
              {paymentStatus === "approved" ? "Aprovado" : "Aguardando"}
            </span>
          </div>
          <Button variant="secondary" className="mt-3 h-10 w-full rounded-lg" onClick={simulatePayment} type="button">
            Aprovar pagamento teste
          </Button>
          {paymentMessage && <p className="mt-2 text-xs font-medium text-amber-700">{paymentMessage}</p>}
        </div>

        <div className="rounded-xl border border-line bg-slate-100 p-4 text-ink">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted">
            <span>Entrega</span>
            <span>{formatCurrency(deliveryFee)}</span>
          </div>
          {discount > 0 && (
            <div className="mt-2 flex items-center justify-between text-sm text-brand-700">
              <span>Desconto {appliedCoupon ? `(${appliedCoupon.code})` : ""}</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span className="font-bold">Total</span>
            <strong className="text-2xl text-brand-700">{formatCurrency(total)}</strong>
          </div>
        </div>

        {storeAcceptingOrders ? (
          <Button variant="cta" className="h-12 w-full rounded-xl" disabled={cart.length === 0} onClick={finishOrder} type="button">
            FINALIZAR PEDIDO • {formatCurrency(total)}
          </Button>
        ) : (
          <Button variant="cta" className="h-12 w-full rounded-xl" disabled={cart.length === 0} onClick={() => setSlotPickerOpen(true)} type="button">
            AGENDAR PEDIDO
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f7f2ed] pb-24 text-ink md:bg-[#f5f6f8] xl:pb-12">
      <header className="sticky top-0 z-30 border-b border-line2 bg-white">
        <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3 px-4 py-3 xl:w-[94%]">
          <div className="flex shrink-0 flex-col items-center leading-none">
            <Crown className="h-3.5 w-3.5 text-ink2" strokeWidth={1.5} />
            <span className="font-display text-xl italic text-ink2 md:text-2xl">{wordmarkName}</span>
            {wordmarkSubtitle && (
              <span className="mt-1 border-t border-ink2/50 pt-0.5 text-[9px] font-semibold tracking-[0.35em] text-ink2 md:text-[10px]">{wordmarkSubtitle}</span>
            )}
          </div>

          <div className="hidden flex-1 md:block">
            <div className="relative mx-auto max-w-xl">
              <input
                className="h-11 w-full rounded-full border border-line2 bg-white pl-4 pr-11 text-sm text-ink2 placeholder:text-muted2 focus:border-cta focus:outline-none"
                placeholder="O que você está com vontade de comer?"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
              />
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted2" />
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-3 md:ml-0 md:gap-5">
            <button
              className="flex h-6 w-6 items-center justify-center text-ink2 md:hidden"
              onClick={() => document.getElementById("mobile-search-input")?.focus()}
              aria-label="Buscar"
              type="button"
            >
              <Search className="h-5 w-5" />
            </button>
            <button
              className="hidden items-center gap-1.5 text-sm font-medium text-ink2 transition hover:text-cta md:flex"
              onClick={() => setMobileCustomerOpen(true)}
              type="button"
            >
              <UserCircle className="h-5 w-5" />
              Área do cliente
            </button>
            <button className="flex h-6 w-6 items-center justify-center text-ink2 md:hidden" onClick={() => setMobileCustomerOpen(true)} aria-label="Área do cliente" type="button">
              <UserCircle className="h-5 w-5" />
            </button>
            <button className="relative flex items-center gap-2" onClick={openCart} type="button" aria-label="Sacola">
              <span className="relative flex h-6 w-6 items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-ink2" />
                {cart.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-cta text-[10px] font-bold leading-none text-white">
                    {cart.length}
                  </span>
                )}
              </span>
              {subtotal > 0 && <span className="hidden text-sm font-bold text-gold sm:block">{formatCurrency(subtotal)}</span>}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <input
              id="mobile-search-input"
              className="h-10 w-full rounded-full border border-line2 bg-white pl-4 pr-10 text-sm text-ink2 placeholder:text-muted2 focus:border-cta focus:outline-none"
              placeholder="Buscar bolo, salgado, doce..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
            />
            <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted2" />
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-line2 px-4 py-2 xl:px-[3%]">
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${storeAcceptingOrders ? "text-emerald-700" : "text-red-700"}`}>
            <span className={`h-2 w-2 rounded-full ${storeAcceptingOrders ? "bg-emerald-500" : "bg-red-500"}`} />
            {storeAcceptingOrders ? "Aberto agora" : "Fechado agora"}
            {storeAcceptingOrders && todaySchedule && ` • Fecha às ${formatScheduleTime(todaySchedule.close)}`}
          </span>
          <button className="text-xs font-medium text-muted2 underline-offset-2 hover:underline" onClick={() => setInfoModalOpen(true)} type="button">
            Endereço e horários
          </button>
        </div>
      </header>

      <section className="mx-auto mt-2 w-full max-w-[1500px] px-4 md:mt-4 xl:w-[94%]">
        <img
          src={restaurant.bannerUrl ?? "/banner.png"}
          alt="Banner promocional"
          className="aspect-[5/1] max-h-[300px] w-full rounded-2xl bg-slate-100 object-cover"
        />
      </section>

      <nav className="sticky top-[150px] z-20 mt-4 w-full overflow-x-auto bg-paper py-3 md:top-[102px]">
        <div className="mx-auto flex w-max min-w-full gap-2 px-4 xl:w-[94%]">
          <button
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === "all" ? "border border-line2 bg-white text-ink2 shadow-sm" : "border border-transparent text-muted2 hover:text-ink2"
            }`}
            onClick={() => setActiveCategory("all")}
            type="button"
          >
            <Star className={`h-4 w-4 ${activeCategory === "all" ? "fill-gold text-gold" : ""}`} />
            Destaques
          </button>
          {categoriesWithProducts.map((category, index) => {
            const Icon = categoryIcons[index % categoryIcons.length];
            return (
              <button
                key={category.id}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCategory === category.id ? "border border-line2 bg-white text-ink2 shadow-sm" : "border border-transparent text-muted2 hover:text-ink2"
                }`}
                onClick={() => setActiveCategory(category.id)}
                type="button"
              >
                <Icon className={`h-4 w-4 ${activeCategory === category.id ? "text-gold" : ""}`} />
                {category.name}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 py-3 md:py-6 xl:w-[94%]">
        <section className="min-w-0 space-y-6 pb-12">
          {!storeAcceptingOrders && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong className="font-semibold">Pedidos indisponíveis no momento.</strong>
              <span className="ml-1">{closedMessage}</span>
            </div>
          )}

          {activeCategory === "all" && highlightProducts.length > 0 && (
            <div className="space-y-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink2 md:text-2xl">Selecionados para você ❤️</h2>
                <p className="mt-0.5 text-sm text-muted2">Uma seleção especial do nosso cardápio</p>
              </div>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {highlightProducts.map((product) => (
                  <div key={product.id} className="w-[168px] shrink-0 rounded-2xl border border-line2 bg-white p-2">
                    <img src={product.imageUrl} alt={product.name} className="aspect-square w-full rounded-xl object-cover" />
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight text-ink2">{product.name}</p>
                    <strong className="mt-1 block text-sm font-bold text-ink2">{formatCurrency(product.variations[0]?.price ?? product.price)}</strong>
                    {getCartQuantity(product) === 0 ? (
                      <Button
                        variant="cta"
                        className="mt-2 h-8 w-full rounded-full text-xs"
                        disabled={getAvailableStock(product) <= 0}
                        onClick={() => incrementProduct(product)}
                        type="button"
                      >
                        {getAvailableStock(product) <= 0 ? "Sem estoque" : "Adicionar"}
                      </Button>
                    ) : (
                      <div className="mt-2 flex h-8 w-full items-center justify-between rounded-full bg-paper px-1">
                        <button className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink2 shadow-sm" onClick={() => decrementProduct(product)} type="button">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="text-xs font-bold text-ink2">{getCartQuantity(product)}</span>
                        <button
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink2 shadow-sm disabled:opacity-40"
                          disabled={getAvailableStock(product) <= 0}
                          onClick={() => incrementProduct(product)}
                          type="button"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCategory === "all" && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-line2 bg-white p-4 sm:grid-cols-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex flex-col items-start gap-1.5">
                  <benefit.icon className="h-5 w-5 text-gold" />
                  <p className="text-xs font-semibold leading-tight text-ink2">{benefit.title}</p>
                  <p className="text-[11px] leading-tight text-muted2">{benefit.description}</p>
                </div>
              ))}
            </div>
          )}

          {activeCategory === "all" && <SocialProof />}

          {menuLoading && (
            <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[190px] animate-pulse rounded-3xl bg-slate-100 md:h-[176px] md:rounded-2xl" />
              ))}
            </div>
          )}

          <div className="space-y-6 md:space-y-8">
            {visibleCategories.map((category) => (
              <section key={category.id} className="space-y-4 md:space-y-5">
                {activeCategory === "all" && (
                  <div className={`flex items-center justify-between gap-4 border-b border-line pb-3 md:pb-4 ${category.id === "cat_promocao" ? "rounded-2xl border-none bg-[#fff5ed] px-3 py-2 shadow-[0_4px_12px_rgba(79,38,24,0.04)] md:rounded-none md:border-b md:bg-transparent md:px-0 md:py-0 md:shadow-none" : ""}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      {category.id === "cat_promocao" && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-[0_3px_8px_rgba(79,38,24,0.04)] md:hidden">
                          <Gift className="h-4 w-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-display text-[19px] font-semibold leading-6 text-ink2 md:text-xl">{category.name}</h3>
                        {category.id === "cat_promocao" && <p className="mt-0.5 text-[11px] font-medium text-brand-700 md:hidden">Seleção especial de hoje</p>}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
                  {category.products.map((product, index) => (
                    <article key={product.id} className="group relative grid grid-cols-1 overflow-hidden rounded-3xl bg-white p-1.5 shadow-[0_6px_18px_rgba(79,38,24,0.05)] transition duration-200 motion-reduce:transition-none active:scale-[0.985] motion-safe:hover:-translate-y-0.5 md:min-h-[190px] md:rounded-2xl md:border md:border-slate-200 md:p-3 md:shadow-sm md:hover:border-brand-100 md:hover:shadow-soft lg:grid-cols-[160px_minmax(0,1fr)] 2xl:grid-cols-[180px_minmax(0,1fr)]">
                      <div className="relative flex items-center justify-center rounded-[22px] bg-[#F8F4EF] md:rounded-xl md:bg-slate-50">
                        <div className="aspect-[1.32/1] w-full overflow-hidden rounded-[22px] bg-white shadow-[0_3px_8px_rgba(79,38,24,0.04)] ring-1 ring-black/[0.025] md:aspect-square md:rounded-xl md:shadow-none md:ring-slate-100">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            width={1080}
                            height={1080}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        {category.id === "cat_promocao" && index === 0 && (
                          <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white shadow-[0_6px_14px_rgba(79,38,24,0.16)] md:text-sm">
                            1
                          </span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col px-1.5 pb-1.5 pt-2 md:px-4 md:py-2">
                        <div className="flex flex-1 flex-col">
                          <div>
                            <h3 className="line-clamp-2 text-base font-semibold leading-[1.22] text-ink md:text-base md:leading-5">{product.name}</h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <strong className="text-[20px] font-bold leading-none text-brand-700 md:inline-flex md:rounded-full md:bg-brand-50 md:px-2.5 md:py-1 md:text-sm md:font-semibold">{formatCurrency(product.variations[0]?.price ?? product.price)}</strong>
                              <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline-flex ${getAvailableStock(product) > 0 ? "bg-slate-100 text-muted" : "bg-red-50 text-red-700"}`}>
                                {getAvailableStock(product) > 0 ? `${getAvailableStock(product)} disponivel` : "Indisponivel"}
                              </span>
                            </div>
                          </div>
                          <p className="mt-2 hidden line-clamp-3 text-sm leading-5 text-muted md:block xl:max-w-[52ch] 2xl:max-w-none">{product.description}</p>
                        </div>
                        {getCartQuantity(product) === 0 ? (
                          <Button
                            variant="cta"
                            className="mt-2 h-8 w-full rounded-full text-sm font-semibold shadow-none transition duration-200 motion-reduce:transition-none active:scale-[0.97] md:mt-3 md:h-10 md:rounded-lg"
                            disabled={getAvailableStock(product) <= 0}
                            type="button"
                            onClick={() => incrementProduct(product)}
                          >
                            {getAvailableStock(product) <= 0 ? (
                              "Sem estoque"
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                ADICIONAR • {formatCurrency(product.variations[0]?.price ?? product.price)}
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="mt-2 flex h-8 w-full items-center justify-between rounded-full bg-paper px-1 md:mt-3 md:h-10 md:rounded-lg">
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink2 shadow-sm md:h-8 md:w-8"
                              onClick={() => decrementProduct(product)}
                              type="button"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-bold text-ink2">{getCartQuantity(product)}</span>
                            <button
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-ink2 shadow-sm disabled:opacity-40 md:h-8 md:w-8"
                              disabled={getAvailableStock(product) <= 0}
                              onClick={() => incrementProduct(product)}
                              type="button"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 xl:hidden">
        <div className="mx-auto grid max-w-sm grid-cols-[1fr_1.08fr_1fr] gap-1 rounded-[22px] border border-white/80 bg-white/95 p-1 shadow-[0_-4px_18px_rgba(79,38,24,0.08)] backdrop-blur-xl">
          <button className="flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold text-muted transition duration-200 motion-reduce:transition-none active:scale-[0.96]" onClick={() => setMobileCustomerOpen(true)} type="button">
            <UserCircle className="h-4 w-4 text-brand-600" />
            Cliente
          </button>
          <button className="relative flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-2xl bg-[#4f2618] text-[10px] font-semibold text-white shadow-[0_4px_12px_rgba(79,38,24,0.14)] transition duration-200 motion-reduce:transition-none active:scale-[0.96]" onClick={openCart} type="button">
            <ShoppingBag className="h-4 w-4" />
            Sacola
            <span className="absolute right-3 top-1 rounded-full bg-white px-1.5 py-0.5 text-[9px] font-bold leading-none text-brand-700 shadow-[0_2px_5px_rgba(79,38,24,0.10)]">{cart.length}</span>
          </button>
          <button className="flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-semibold text-muted transition duration-200 motion-reduce:transition-none active:scale-[0.96]" onClick={() => setMobileFiltersOpen(true)} type="button">
            <ListFilter className="h-4 w-4 text-brand-600" />
            Filtros
          </button>
        </div>
      </nav>

      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/70 bg-white p-5 shadow-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Endereço e horários</h2>
              <button className="rounded-full p-1.5 text-muted transition hover:bg-slate-100" onClick={() => setInfoModalOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 text-sm text-ink">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <span>{restaurant.address}</span>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-line pt-3">
              {openingHours.map((hour) => (
                <div key={hour} className="flex items-center gap-2 text-sm text-muted">
                  <Clock className="h-4 w-4 shrink-0 text-brand-600" />
                  <span>{hour}</span>
                </div>
              ))}
            </div>
            {restaurant.whatsapp && (
              <p className="mt-3 border-t border-line pt-3 text-sm text-muted">Telefone: {restaurant.whatsapp}</p>
            )}
          </div>
        </div>
      )}

      {cartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[76vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-panel">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <ShoppingBag className="h-5 w-5 text-brand-600" />
                Sua Sacola
              </h2>
              <button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setCartModalOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scrollbar-clean overflow-y-auto">{cartContent}</div>
          </div>
        </div>
      )}

      {mobileCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-navy-900/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-3xl border border-white/70 bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Área do cliente</h2>
              <button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setMobileCustomerOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            {customerIsAuthenticated ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{user?.user_metadata?.full_name ?? user?.email ?? signupForm.email}</p>
                    </div>
                    <button className="shrink-0 text-xs font-semibold text-brand-700" onClick={() => setProfileEditing((current) => !current)} type="button">
                      {profileEditing ? "Fechar" : "Editar"}
                    </button>
                  </div>
                  {profileEditing ? (
                    <div className="mt-3 space-y-2">
                      <Input placeholder="Nome completo" value={customerProfile.name} onChange={(event) => updateCustomerProfile({ ...customerProfile, name: event.target.value })} />
                      <Input placeholder="Telefone/WhatsApp" value={customerProfile.phone} onChange={(event) => updateCustomerProfile({ ...customerProfile, phone: event.target.value })} />
                      <div className="grid grid-cols-[minmax(0,1fr)_80px] gap-2">
                        <Input placeholder="Rua / Avenida" value={customerProfile.street} onChange={(event) => updateCustomerProfile({ ...customerProfile, street: event.target.value })} />
                        <Input placeholder="Nº" value={customerProfile.number} onChange={(event) => updateCustomerProfile({ ...customerProfile, number: event.target.value })} />
                      </div>
                      <Input placeholder="Bairro" value={customerProfile.neighborhood} onChange={(event) => updateCustomerProfile({ ...customerProfile, neighborhood: event.target.value })} />
                      <Input placeholder="Complemento" value={customerProfile.complement} onChange={(event) => updateCustomerProfile({ ...customerProfile, complement: event.target.value })} />
                      <Textarea className="min-h-16" placeholder="Ponto de referência ou observação" value={customerProfile.reference} onChange={(event) => updateCustomerProfile({ ...customerProfile, reference: event.target.value })} />
                      <Button className="h-11 w-full rounded-xl" onClick={saveCustomerProfile} type="button">
                        Salvar dados
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-muted">{formatCustomerAddress(customerProfile) || "Endereço não informado"}</p>
                  )}
                  {profileMessage && <p className="mt-2 text-xs font-medium text-brand-700">{profileMessage}</p>}
                </div>
                {customerHistory.length > 0 && (
                  <div className="rounded-xl border border-line bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Últimos pedidos</p>
                    {customerHistory.map((order) => (
                      <button
                        key={order.id}
                        className="flex w-full items-center justify-between rounded-lg py-2 text-left text-sm"
                        onClick={() => {
                          setHistoryOrder(order);
                          setMobileCustomerOpen(false);
                        }}
                        type="button"
                      >
                        <span>
                          <span className="block font-semibold text-ink">{order.code}</span>
                          <span className="text-xs text-muted">{orderStatusLabels[order.status]}</span>
                        </span>
                        <strong>{formatCurrency(order.total)}</strong>
                      </button>
                    ))}
                  </div>
                )}
                <Button variant="secondary" className="h-11 w-full rounded-xl" onClick={signOut} type="button">
                  Sair da conta
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm leading-5 text-muted">Entre ou crie uma conta para acompanhar pedidos e salvar seus dados.</p>
                <Button
                  className="h-11 w-full rounded-xl"
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMobileCustomerOpen(false);
                  }}
                  type="button"
                >
                  Fazer login
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-navy-900/50 p-3 backdrop-blur-sm xl:hidden">
          <div className="w-full rounded-3xl border border-white/70 bg-white p-4 shadow-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Filtros</h2>
              <button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setMobileFiltersOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-2">
              <button
                className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold uppercase tracking-wide ${activeCategory === "all" ? "bg-brand-600 text-white" : "border border-line bg-white text-muted"}`}
                onClick={() => {
                  setActiveCategory("all");
                  setMobileFiltersOpen(false);
                }}
                type="button"
              >
                <Flame className="h-4 w-4" />
                Ver tudo
              </button>
              {categoriesWithProducts.map((category, index) => {
                const Icon = categoryIcons[index] ?? Utensils;
                const active = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold uppercase tracking-wide ${active ? "bg-brand-600 text-white" : "border border-line bg-white text-muted"}`}
                    onClick={() => {
                      setActiveCategory(category.id);
                      setMobileFiltersOpen(false);
                    }}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {historyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-panel">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Pedido {historyOrder.code}</h2>
                <p className="mt-1 text-sm text-muted">{historyOrder.type === "delivery" ? "Entrega" : "Retirada"} - {orderStatusLabels[historyOrder.status]}</p>
              </div>
              <button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setHistoryOrder(null)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="scrollbar-clean max-h-[calc(86vh-76px)] overflow-y-auto p-5">
              <OrderTimeline order={historyOrder} />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-surface/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
                  <p className="mt-2 font-semibold text-ink">{historyOrder.customer.name}</p>
                  <p className="text-sm text-muted">{historyOrder.customer.phone}</p>
                </div>
                <div className="rounded-xl border border-line bg-surface/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Pagamento</p>
                  <p className="mt-2 font-semibold text-ink">{historyOrder.paymentMethod}</p>
                  <p className="text-sm text-muted">{historyOrder.createdAt ? new Date(historyOrder.createdAt).toLocaleString("pt-BR") : ""}</p>
                </div>
              </div>

              {historyOrder.customer.address && (
                <div className="mt-4 rounded-xl border border-line bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Endereco</p>
                  <p className="mt-2 text-sm text-ink">{historyOrder.customer.address}</p>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-line bg-white">
                <div className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">Itens do pedido</div>
                <div className="divide-y divide-line">
                  {historyOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                      <span>{item.quantity}x {item.productName}</span>
                      <strong>{formatCurrency(item.total)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-navy-900 p-4 text-white">
                <div className="flex justify-between text-sm text-white/70"><span>Subtotal</span><span>{formatCurrency(historyOrder.subtotal)}</span></div>
                <div className="mt-2 flex justify-between text-sm text-white/70"><span>Entrega</span><span>{formatCurrency(historyOrder.deliveryFee)}</span></div>
                {(historyOrder.discount ?? 0) > 0 && (
                  <div className="mt-2 flex justify-between text-sm text-brand-500">
                    <span>Desconto {historyOrder.couponCode ? `(${historyOrder.couponCode})` : ""}</span>
                    <span>-{formatCurrency(historyOrder.discount ?? 0)}</span>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-white/10 pt-3 font-semibold">
                  <span>Total</span>
                  <span className="text-brand-500">{formatCurrency(historyOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {authModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Área do cliente</h2>
                <p className="mt-1 text-sm text-muted">Acesse seu histórico, favoritos e próximos pedidos.</p>
              </div>
              <button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={() => setAuthModalOpen(false)} type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
              <button
                className={`h-10 rounded-lg text-sm font-semibold transition ${authMode === "login" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
                onClick={() => setAuthMode("login")}
                type="button"
              >
                Login
              </button>
              <button
                className={`h-10 rounded-lg text-sm font-semibold transition ${authMode === "signup" ? "bg-white text-ink shadow-sm" : "text-muted"}`}
                onClick={() => setAuthMode("signup")}
                type="button"
              >
                Criar cadastro
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-line bg-white text-sm font-semibold text-ink shadow-sm transition hover:bg-slate-50"
                onClick={signInWithGoogle}
                type="button"
              >
                <GoogleIcon />
                Entrar com Google
              </button>

              {authMode === "signup" && (
                <div className="space-y-3 rounded-xl border border-line bg-slate-50 p-3">
                  <Input placeholder="Nome completo" value={signupForm.name} onChange={(event) => setSignupForm({ ...signupForm, name: event.target.value })} />
                  <Input placeholder="E-mail" type="email" value={signupForm.email} onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })} />
                  <Input placeholder="Telefone/WhatsApp" value={signupForm.phone} onChange={(event) => setSignupForm({ ...signupForm, phone: event.target.value })} />
                  <Input placeholder="Senha" type="password" value={signupForm.password} onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })} />
                  <Button className="w-full rounded-xl" onClick={createCustomerAccount} type="button">
                    Criar cadastro
                  </Button>
                </div>
              )}

              {authMode === "login" && (
                <div className="space-y-3 rounded-xl border border-line bg-slate-50 p-3">
                  <Input placeholder="E-mail" type="email" value={customerLoginForm.email} onChange={(event) => setCustomerLoginForm({ ...customerLoginForm, email: event.target.value })} />
                  <Input placeholder="Senha" type="password" value={customerLoginForm.password} onChange={(event) => setCustomerLoginForm({ ...customerLoginForm, password: event.target.value })} />
                  <Button className="w-full rounded-xl" onClick={signInCustomerWithPassword} type="button">
                    Entrar
                  </Button>
                </div>
              )}

              {authMessage && <p className="text-xs text-amber-700">{authMessage}</p>}
            </div>
          </div>
        </div>
      )}

      {restaurant.whatsapp && (
        <a
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition duration-200 motion-reduce:transition-none hover:bg-[#20BD5A] active:scale-95 xl:bottom-6 xl:right-6"
          href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Vim pelo cardápio ${displayName} e gostaria de fazer um pedido.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Fale conosco pelo WhatsApp"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      )}
    </main>
  );
}

