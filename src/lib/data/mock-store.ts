"use client";

import { categories, coupons, customers, orders, products, restaurant } from "@/lib/data/seed";
import type { CartItem, Category, Coupon, Customer, Order, OrderStatus, Product, Restaurant } from "@/types/domain";

const CATEGORIES_KEY = "kamanda.delicious.categories";
const PRODUCTS_KEY = "kamanda.delicious.products";
const ORDERS_KEY = "kamanda.delicious.orders";
const CUSTOMERS_KEY = "kamanda.delicious.customers";
const COUPONS_KEY = "kamanda.delicious.coupons";
const RESTAURANT_KEY = "kamanda.delicious.restaurant";

export const STORE_UPDATED_EVENT = "kamanda-store-updated";

const orderStatusNotes: Record<OrderStatus, string> = {
  new: "Pedido recebido pelo estabelecimento",
  preparing: "O pedido entrou em preparo",
  ready: "Pedido pronto para retirada ou envio",
  out_for_delivery: "Pedido saiu para entrega",
  finished: "Pedido finalizado",
  cancelled: "Pedido cancelado pelo estabelecimento"
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(STORE_UPDATED_EVENT, { detail: { key } }));
}

export function getRestaurant() {
  return read<Restaurant>(RESTAURANT_KEY, restaurant);
}

export function saveRestaurant(nextRestaurant: Restaurant) {
  write(RESTAURANT_KEY, nextRestaurant);
  return nextRestaurant;
}

export function getCategories() {
  return read<Category[]>(CATEGORIES_KEY, categories);
}

export function saveCategory(category: Category) {
  const current = getCategories();
  const next = current.some((item) => item.id === category.id)
    ? current.map((item) => (item.id === category.id ? category : item))
    : [...current, category];
  write(CATEGORIES_KEY, next);
  return next;
}

export function getProducts() {
  return read<Product[]>(PRODUCTS_KEY, products).map((product) => ({
    ...product,
    stock: product.stock ?? 20
  }));
}

export function getCoupons() {
  return read<Coupon[]>(COUPONS_KEY, coupons);
}

export function saveCoupon(coupon: Coupon) {
  const normalized = { ...coupon, code: coupon.code.trim().toUpperCase() };
  const current = getCoupons();
  const next = current.some((item) => item.id === normalized.id)
    ? current.map((item) => (item.id === normalized.id ? normalized : item))
    : [normalized, ...current];
  write(COUPONS_KEY, next);
  return next;
}

export function toggleCoupon(couponId: string) {
  const next = getCoupons().map((coupon) => (coupon.id === couponId ? { ...coupon, active: !coupon.active } : coupon));
  write(COUPONS_KEY, next);
  return next;
}

export function saveProduct(product: Product) {
  const current = getProducts();
  const next = current.some((item) => item.id === product.id)
    ? current.map((item) => (item.id === product.id ? product : item))
    : [product, ...current];
  write(PRODUCTS_KEY, next);
  return next;
}

export function deleteProduct(productId: string) {
  const next = getProducts().filter((item) => item.id !== productId);
  write(PRODUCTS_KEY, next);
  return next;
}

export function getOrders() {
  return read<Order[]>(ORDERS_KEY, orders);
}

export function getCustomers() {
  return read<Customer[]>(CUSTOMERS_KEY, customers);
}

export function createOrder(payload: {
  customer: Pick<Customer, "name" | "phone" | "address">;
  type: Order["type"];
  paymentMethod: Order["paymentMethod"];
  items: CartItem[];
  discount?: number;
  couponCode?: string;
}) {
  const allOrders = getOrders();
  const allCustomers = getCustomers();
  const subtotal = payload.items.reduce((sum, item) => {
    const addonsTotal = item.addons.reduce((total, addon) => total + addon.price, 0);
    return sum + (item.unitPrice + addonsTotal) * item.quantity;
  }, 0);
  const currentRestaurant = getRestaurant();
  const deliveryFee = payload.type === "delivery" ? currentRestaurant.deliveryFee : 0;
  const discount = Math.min(payload.discount ?? 0, subtotal + deliveryFee);
  const customer: Customer = {
    id: `cust_${Date.now()}`,
    restaurantId: currentRestaurant.id,
    name: payload.customer.name,
    phone: payload.customer.phone,
    address: payload.customer.address,
    totalSpent: subtotal + deliveryFee - discount,
    lastOrderAt: new Date().toISOString(),
    orderCount: 1
  };
  const order: Order = {
    id: `ord_${Date.now()}`,
    restaurantId: currentRestaurant.id,
    code: `#${1025 + allOrders.length}`,
    customer,
    type: payload.type,
    paymentMethod: payload.paymentMethod,
    status: "new",
    items: payload.items.map((item, index) => ({
      ...item,
      id: `item_${Date.now()}_${index}`,
      total: (item.unitPrice + item.addons.reduce((total, addon) => total + addon.price, 0)) * item.quantity
    })),
    subtotal,
    discount,
    couponCode: payload.couponCode,
    deliveryFee,
    total: subtotal + deliveryFee - discount,
    createdAt: new Date().toISOString(),
    history: [{ id: `hist_${Date.now()}`, status: "new", createdAt: new Date().toISOString(), note: "Pedido enviado pelo cardapio publico" }]
  };

  write(ORDERS_KEY, [order, ...allOrders]);
  write(CUSTOMERS_KEY, [customer, ...allCustomers]);
  write(
    PRODUCTS_KEY,
    getProducts().map((product) => {
      const orderedQuantity = payload.items
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.quantity, 0);
      return orderedQuantity > 0 ? { ...product, stock: Math.max((product.stock ?? 20) - orderedQuantity, 0) } : product;
    })
  );
  return order;
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const next = getOrders().map((order) =>
    order.id === orderId
      ? {
          ...order,
          status,
          history: [
            ...order.history.filter((entry) => entry.status !== status),
            { id: `hist_${Date.now()}`, status, createdAt: new Date().toISOString(), note: orderStatusNotes[status] }
          ]
        }
      : order
  );
  write(ORDERS_KEY, next);
  return next;
}
