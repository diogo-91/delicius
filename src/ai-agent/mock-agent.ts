import type { AgentResponse, CustomerIntent } from "./types";

export function interpretCustomerMessage(message: string): CustomerIntent {
  const normalized = message.toLowerCase();
  if (normalized.includes("status") || normalized.includes("pedido")) {
    return { type: "order_status", orderCode: normalized.match(/#\d+/)?.[0] ?? "" };
  }
  if (normalized.includes("cardapio") || normalized.includes("menu")) {
    return { type: "browse_menu" };
  }
  return { type: "faq", question: message };
}

export function answerWithMockAgent(message: string): AgentResponse {
  const intent = interpretCustomerMessage(message);
  if (intent.type === "browse_menu") {
    return { intent, message: "Claro. Vou te enviar o cardapio digital para escolher seus itens." };
  }
  if (intent.type === "order_status") {
    return { intent, message: "Vou consultar o status do seu pedido e ja te retorno." };
  }
  return { intent, message: "Entendi. Esta resposta sera conectada ao agente OpenAI na proxima etapa." };
}
