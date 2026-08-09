import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatScheduledFor(value: string) {
  const [datePart, timePart] = value.split("T");
  const dateLabel = new Date(`${datePart}T00:00:00`).toLocaleDateString("pt-BR");
  return timePart ? `${dateLabel} às ${timePart}` : dateLabel;
}
