import { cn } from "@/lib/utils";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone === "green" && "bg-emerald-50 text-emerald-700 ring-emerald-100",
        tone === "amber" && "bg-amber-100 text-amber-700",
        tone === "red" && "bg-red-100 text-red-700",
        tone === "neutral" && "bg-navy-50 text-navy-700"
      )}
    >
      {children}
    </span>
  );
}
