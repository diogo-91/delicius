import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function AdminCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-card border border-[#E5E7EB] bg-white shadow-card", className)} {...props} />;
}

export function AdminCardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB]/50 px-6 py-4", className)} {...props} />;
}

export function AdminCardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}
