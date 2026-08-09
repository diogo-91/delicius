import type { OrderStatus } from "@/types/domain";

export type CustomerIntent =
  | { type: "browse_menu" }
  | { type: "add_item"; productName: string; quantity: number }
  | { type: "order_status"; orderCode: string }
  | { type: "faq"; question: string };

export type AgentResponse = {
  message: string;
  intent: CustomerIntent;
  suggestedStatus?: OrderStatus;
};
