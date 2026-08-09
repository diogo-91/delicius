import type { Order } from "@/types/domain";

export type WhatsAppMessage = {
  from: string;
  body: string;
  restaurantId: string;
};

export type WhatsAppProvider = {
  sendText(to: string, message: string): Promise<void>;
  sendOrderConfirmation(to: string, order: Order): Promise<void>;
};
