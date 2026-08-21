import type { LucideIcon } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

const toneStyles = {
  brand: "bg-[#fbf0ea] text-[#7b3f2a]",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  violet: "bg-violet-50 text-violet-600",
  red: "bg-red-50 text-red-600"
} as const;

export type AdminStatTone = keyof typeof toneStyles;

export function AdminStatCard({
  label,
  value,
  currency,
  icon: Icon,
  tone = "brand",
  trend
}: {
  label: string;
  value: string | number;
  currency?: boolean;
  icon?: LucideIcon;
  tone?: AdminStatTone;
  /** Percentage change vs. the previous period. Omit when there's no real comparison data. */
  trend?: number;
}) {
  return (
    <div className="group flex h-full flex-col rounded-[18px] bg-white p-4 shadow-[0_10px_32px_rgba(79,38,24,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_38px_rgba(79,38,24,0.11)]">
      <div className="flex items-center justify-between gap-2">
        {Icon && (
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105", toneStyles[tone])}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        )}
        {typeof trend === "number" && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
            {trend >= 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] leading-tight text-[#8A756C]">{label}</p>
      <strong className="mt-1.5 text-[22px] font-bold tracking-tight text-[#2B1711]">
        {currency && typeof value === "number" ? formatCurrency(value) : value}
      </strong>
    </div>
  );
}
