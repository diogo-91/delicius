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
  trend,
  className
}: {
  label: string;
  value: string | number;
  currency?: boolean;
  icon?: LucideIcon;
  tone?: AdminStatTone;
  /** Percentage change vs. the previous period. Omit when there's no real comparison data. */
  trend?: number;
  className?: string;
}) {
  return (
    <div className={cn("group flex h-full flex-col bg-white p-5 transition-colors duration-150 hover:bg-[#FCFAF8]", className)}>
      <div className="flex items-center justify-between gap-2">
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", toneStyles[tone])}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        )}
        {typeof trend === "number" && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trend >= 0 ? "text-emerald-600" : "text-red-600")}>
            {trend >= 0 ? `+${trend}%` : `${trend}%`}
          </span>
        )}
      </div>
      <p className="mt-4 text-xs font-medium leading-tight text-[#786D68]">{label}</p>
      <strong className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#241A17]">
        {currency && typeof value === "number" ? formatCurrency(value) : value}
      </strong>
    </div>
  );
}
