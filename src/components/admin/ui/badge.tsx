import { cn } from "@/lib/utils";

const toneStyles = {
  brand: "bg-[#fbf0ea] text-[#7b3f2a]",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  neutral: "bg-slate-100 text-slate-600"
} as const;

export type AdminBadgeTone = keyof typeof toneStyles;

export function AdminBadge({ children, tone = "neutral", icon }: { children: React.ReactNode; tone?: AdminBadgeTone; icon?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", toneStyles[tone])}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
