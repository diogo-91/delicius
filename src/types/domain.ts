export type OrderStatus =
  | "new"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "finished"
  | "cancelled";

export type OrderType = "delivery" | "pickup" | "dine_in";
export type PaymentMethod = "pix" | "credit_card" | "debit_card";
export type CouponType = "percent" | "fixed" | "delivery";

export type WeekdaySchedule = {
  day: number;
  label: string;
  enabled: boolean;
  open: string;
  close: string;
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  coverUrl?: string;
  bannerUrl?: string;
  address: string;
  openingHours: string;
  weeklySchedule?: WeekdaySchedule[];
  deliveryFee: number;
  averagePrepTime: number;
  isOpen: boolean;
  whatsapp: string;
};

export type Category = {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type ProductVariation = {
  id: string;
  name: string;
  price: number;
};

export type ProductAddon = {
  id: string;
  name: string;
  price: number;
};

export type Product = {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  stock?: number;
  active: boolean;
  requiresNote: boolean;
  variations: ProductVariation[];
  addons: ProductAddon[];
};

export type Customer = {
  id: string;
  restaurantId: string;
  name: string;
  phone: string;
  address?: string;
  totalSpent: number;
  lastOrderAt?: string;
  orderCount: number;
};

export type CartItem = {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  variation?: ProductVariation;
  addons: ProductAddon[];
  note?: string;
  scheduledFor?: string;
};

export type OrderItem = CartItem & {
  id: string;
  total: number;
};

export type OrderHistoryEntry = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  note?: string;
};

export type Order = {
  id: string;
  restaurantId: string;
  code: string;
  customer: Customer;
  type: OrderType;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  total: number;
  createdAt: string;
  history: OrderHistoryEntry[];
};

export type Coupon = {
  id: string;
  restaurantId: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  active: boolean;
  usageLimit?: number;
  usedCount: number;
  minimumOrderValue?: number;
  expiresAt?: string;
  createdAt: string;
};

export type ReportSummary = {
  totalSales: number;
  orderCount: number;
  averageTicket: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  recurringCustomers: Array<{ name: string; orders: number; totalSpent: number }>;
};
