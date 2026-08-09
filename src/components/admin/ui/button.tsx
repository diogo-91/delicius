import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function AdminButton({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-control px-3.5 text-sm font-medium transition-all duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        variant === "secondary" && "border border-[#E5E7EB] bg-white text-[#111827] shadow-sm hover:bg-slate-50",
        variant === "ghost" && "bg-transparent text-[#6B7280] hover:bg-slate-100 hover:text-[#111827]",
        variant === "danger" && "bg-red-50 text-red-700 hover:bg-red-100",
        className
      )}
      {...props}
    />
  );
}
