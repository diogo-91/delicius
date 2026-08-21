"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  TicketPercent,
  Users,
  X
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getRestaurant } from "@/lib/data/mock-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const sidebarCollapsedStorageKey = "kamanda.admin.sidebar-collapsed";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/produtos", label: "Produtos", icon: Package },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/dashboard/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/empresa", label: "Empresa", icon: Building2 }
];

function SidebarNav({ pathname, onNavigate, collapsed }: { pathname: string; onNavigate?: () => void; collapsed?: boolean }) {
  return (
    <nav className="relative space-y-1">
      {nav.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "relative flex h-10 items-center rounded-lg text-sm font-medium transition-all duration-150",
              collapsed ? "justify-center px-0" : "gap-3 px-3",
              active ? "bg-white/12 text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]" : "text-[#e8c9b8] hover:bg-white/[0.07] hover:text-white"
            )}
          >
            {active && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-white" />}
            <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-white" : "text-[#e8c9b8]")} strokeWidth={2} />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBrand({ restaurant, collapsed }: { restaurant: ReturnType<typeof getRestaurant>; collapsed?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center", collapsed ? "justify-center" : "gap-2.5")}>
      <img src={restaurant.logoUrl ?? "/komanda-logo.png"} alt={restaurant.name} className="h-8 w-8 shrink-0 rounded-lg bg-white object-contain p-1 ring-1 ring-white/15" />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-white">Delicius Gourmet</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#f2c9a3]">
            <Sparkles className="h-2.5 w-2.5" />
            Plano Growth
          </span>
        </div>
      )}
    </div>
  );
}

function SidebarProfile({
  displayName,
  email,
  initial,
  restaurantSlug,
  collapsed,
  open,
  onToggle,
  onClose,
  onSignOut
}: {
  displayName: string;
  email?: string;
  initial: string;
  restaurantSlug: string;
  collapsed?: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="relative">
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-56 rounded-card border border-[#E5E7EB] bg-white p-1 shadow-card-hover">
            {!collapsed && (
              <div className="px-3 py-2">
                <p className="truncate text-xs font-semibold text-[#111827]">{displayName}</p>
                {email && <p className="truncate text-[10px] text-[#6B7280]">{email}</p>}
              </div>
            )}
            {!collapsed && <div className="my-1 h-px bg-[#E5E7EB]/50" />}
            <Link
              href={`/cardapio/${restaurantSlug}`}
              target="_blank"
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              onClick={onClose}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver cardápio
            </Link>
            <button
              className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
              onClick={onSignOut}
              type="button"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair da conta
            </button>
          </div>
        </>
      )}
      <button
        className={cn(
          "flex h-11 w-full items-center rounded-lg transition-all duration-150 hover:bg-white/[0.07]",
          collapsed ? "justify-center px-0" : "gap-2.5 px-2"
        )}
        onClick={onToggle}
        title={collapsed ? displayName : undefined}
        type="button"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4f2618]">{initial}</span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold text-white">{displayName}</span>
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-[#e8c9b8] transition-transform duration-150", open && "rotate-180")} />
          </>
        )}
      </button>
    </div>
  );
}

export function AdminShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const restaurant = getRestaurant();
  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Usuário";
  const initial = displayName.charAt(0).toUpperCase();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(sidebarCollapsedStorageKey) === "1";
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [search, setSearch] = useState("");

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(sidebarCollapsedStorageKey, next ? "1" : "0");
      return next;
    });
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    router.push(search.trim() ? `/dashboard/pedidos?q=${encodeURIComponent(search.trim())}` : "/dashboard/pedidos");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F3EE] lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col overflow-hidden bg-[#2B1711] transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-[232px]"
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
          style={{ background: "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.15), transparent 70%)" }}
        />
        <div className={cn("relative flex h-16 shrink-0 items-center border-b border-white/10", collapsed ? "justify-center px-2" : "px-5")}>
          <SidebarBrand restaurant={restaurant} collapsed={collapsed} />
        </div>

        {!collapsed && (
          <form className="relative shrink-0 px-3 pt-3" onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#e8c9b8]" />
              <input
                className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.07] pl-9 pr-3 text-xs text-white outline-none transition placeholder:text-[#e8c9b8]/70 focus:border-white/25 focus:bg-white/10"
                placeholder="Buscar pedido, cliente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                type="search"
              />
            </div>
          </form>
        )}

        <div className={cn("relative flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
          <SidebarNav pathname={pathname} collapsed={collapsed} />
        </div>

        <div className="relative shrink-0 space-y-2 border-t border-white/10 p-3">
          <SidebarProfile
            displayName={displayName}
            email={user.email}
            initial={initial}
            restaurantSlug={restaurant.slug}
            collapsed={collapsed}
            open={profileOpen}
            onToggle={() => setProfileOpen((current) => !current)}
            onClose={() => setProfileOpen(false)}
            onSignOut={signOut}
          />
          <Link
            href="/dashboard/pedidos"
            title={collapsed ? "Abrir pedidos" : undefined}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-[#4f2618] shadow-card transition-all duration-150 hover:bg-[#f8f0ea]"
          >
            <ClipboardList className="h-4 w-4" />
            {!collapsed && "Abrir pedidos"}
          </Link>
          <button
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-[#e8c9b8] transition-all duration-150 hover:bg-white/[0.07] hover:text-white"
            onClick={toggleCollapsed}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            type="button"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                Recolher
              </>
            )}
          </button>
        </div>
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#111827]/20 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-gradient-to-b from-[#5c3020] via-[#4f2618] to-[#3c1c11] shadow-elevate-lg">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <SidebarBrand restaurant={restaurant} />
              <button className="shrink-0 rounded-lg p-1.5 text-[#e8c9b8] hover:bg-white/[0.07] hover:text-white" onClick={() => setMobileNavOpen(false)} type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <SidebarNav pathname={pathname} onNavigate={() => setMobileNavOpen(false)} />
            </div>
            <div className="shrink-0 space-y-2 border-t border-white/10 p-3">
              <SidebarProfile
                displayName={displayName}
                email={user.email}
                initial={initial}
                restaurantSlug={restaurant.slug}
                open={mobileProfileOpen}
                onToggle={() => setMobileProfileOpen((current) => !current)}
                onClose={() => setMobileProfileOpen(false)}
                onSignOut={signOut}
              />
              <Link
                href="/dashboard/pedidos"
                onClick={() => setMobileNavOpen(false)}
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-[#4f2618] shadow-card transition-all duration-150 hover:bg-[#f8f0ea]"
              >
                <ClipboardList className="h-4 w-4" />
                Abrir pedidos
              </Link>
            </div>
          </aside>
        </div>
      )}

      <button
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#4f2618] shadow-card-hover lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        type="button"
      >
        <Menu className="h-5 w-5" />
      </button>

      <main className="flex w-full flex-1 flex-col overflow-y-auto px-4 pb-6 pt-20 sm:px-6 sm:pb-8 sm:pt-20 lg:mx-auto lg:min-h-0 lg:max-w-[1580px] lg:overflow-y-auto lg:px-8 lg:pb-8 lg:pt-7">{children}</main>
    </div>
  );
}
