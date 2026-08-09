import type { Order } from "@/types/domain";
import type { WhatsAppProvider } from "./types";

export class EvolutionApiMockClient implements WhatsAppProvider {
  async sendText(to: string, message: string) {
    console.log("[whatsapp:mock]", { to, message });
  }

  async sendOrderConfirmation(to: string, order: Order) {
    console.log("[whatsapp:mock:order-confirmation]", { to, orderId: order.id, code: order.code });
  }
}
