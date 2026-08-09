import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function AdminInput({ className, icon, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          className={cn(
            "h-9 w-full rounded-control border border-[#E5E7EB] bg-white pl-9 pr-3 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#7b3f2a]",
            className
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      className={cn(
        "h-9 w-full rounded-control border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#7b3f2a]",
        className
      )}
      {...props}
    />
  );
}

export function AdminSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-control border border-[#E5E7EB] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#7b3f2a]",
        className
      )}
      {...props}
    />
  );
}

export function AdminTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[80px] w-full rounded-control border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#7b3f2a]",
        className
      )}
      {...props}
    />
  );
}
