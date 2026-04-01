"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Package,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type ErpTab = {
  id: string;
  title: string;
  href: string;
};

const BASIC_INFO_TITLES: Record<string, string> = {
  companies: "Company Information Management",
  regions: "Region Codes",
  cities: "City Codes",
  depots: "Depot Codes",
  "cost-codes": "Expense Codes",
  "revenue-codes": "Revenue Codes",
  "condition-codes": "Condition Codes",
  "size-codes": "Size Codes",
  "type-codes": "Type Codes",
  "operation-prices": "Operation Price Configs",
  "container-number-rules": "Container Number Rules",
};

const PARTNER_TITLES: Record<string, string> = {
  customers: "Customers",
  vendors: "Vendors",
  lessee: "Lessee",
  lessor: "Lessor",
  "material-vendors": "Material Vendors",
  "container-owners": "Container Owners",
};

const NAV = [
  {
    id: "basic-info",
    label: "System Codes",
    href: "/basic-info",
    icon: Building2,
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory/center",
    icon: Package,
  },
  { id: "partners", label: "Partners", href: "/partners", icon: Users },
  {
    id: "settings",
    label: "System Settings",
    href: "/settings",
    icon: Settings,
  },
] as const;

function titleForPath(pathname: string): { id: string; title: string; href: string } | null {
  if (pathname.startsWith("/basic-info")) {
    if (pathname.match(/^\/basic-info\/[^/]+$/)) {
      const slug = pathname.split("/")[2] ?? "";
      return {
        id: "basic-info-section",
        title: BASIC_INFO_TITLES[slug] ?? "System Codes Detail",
        href: pathname,
      };
    }
    return { id: "basic-info", title: "System Codes", href: "/basic-info" };
  }
  if (pathname.startsWith("/inventory")) {
    return {
      id: "inventory",
      title: "Inventory Command Center",
      href: "/inventory/center",
    };
  }
  if (pathname.startsWith("/partners")) {
    if (pathname.startsWith("/partners/customers/") && pathname !== "/partners/customers/new") {
      return { id: "partner-customer-edit", title: "Edit Customer", href: pathname };
    }
    if (pathname === "/partners/customers/new") {
      return { id: "partner-customer-new", title: "New Customer", href: pathname };
    }
    if (pathname.match(/^\/partners\/[^/]+$/)) {
      const slug = pathname.split("/")[2] ?? "";
      return {
        id: "partners-section",
        title: PARTNER_TITLES[slug] ?? "Partners Detail",
        href: pathname,
      };
    }
    return { id: "partners", title: "Partners", href: "/partners" };
  }
  if (pathname.startsWith("/customers")) {
    return { id: "partners", title: "Partners", href: "/partners" };
  }
  if (pathname.startsWith("/settings")) {
    return { id: "settings", title: "System Settings", href: "/settings" };
  }
  return null;
}

export function ErpAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [tabs, setTabs] = useState<ErpTab[]>([
    {
      id: "basic-info",
      title: "System Codes",
      href: "/basic-info",
    },
  ]);

  useEffect(() => {
    const meta = titleForPath(pathname);
    if (!meta) return;
    setTabs((prev) => {
      const exists = prev.some((t) => t.href === meta.href);
      if (exists) return prev;
      return [...prev, { id: meta.id, title: meta.title, href: meta.href }];
    });
  }, [pathname]);

  const setActiveTab = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router]
  );

  const closeTab = useCallback(
    (e: ReactMouseEvent, href: string) => {
      e.preventDefault();
      e.stopPropagation();
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const next = prev.filter((t) => t.href !== href);
        if (pathname === href || pathname.startsWith(`${href}/`)) {
          const fallback = next[0]?.href ?? "/inventory/center";
          router.push(fallback);
        }
        return next;
      });
    },
    [pathname, router]
  );

  function tabIsActive(tab: ErpTab): boolean {
    if (pathname === tab.href) return true;
    if (tab.href !== "/" && pathname.startsWith(`${tab.href}/`)) return true;
    return false;
  }

  const sidebarW = collapsed ? "w-16" : "w-[200px]";

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "flex shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 transition-[width] duration-200 ease-out",
            sidebarW
          )}
        >
          <div
            className={cn(
              "flex h-12 items-center border-b border-slate-800 px-3",
              collapsed && "justify-center px-2"
            )}
          >
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-white">
                EW ERP
              </span>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className={cn(
                "ml-auto flex size-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white",
                collapsed && "ml-0"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-2">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className="flex h-11 shrink-0 items-end gap-0 overflow-x-auto border-b border-border bg-muted/40 px-1"
            role="tablist"
            aria-label="Open pages"
          >
            {tabs.map((tab) => {
              const isActive = tabIsActive(tab);
              return (
                <div
                  key={tab.id + tab.href}
                  role="none"
                  className={cn(
                    "group relative flex h-9 max-w-[260px] shrink-0 items-stretch rounded-t-md border border-b-0 text-xs font-medium transition",
                    isActive
                      ? "z-10 border-border bg-background text-foreground shadow-sm"
                      : "border-transparent bg-transparent text-muted-foreground"
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.href)}
                    className={cn(
                      "min-w-0 flex-1 truncate px-3 py-2 text-left transition hover:text-foreground",
                      !isActive && "hover:bg-muted/50"
                    )}
                  >
                    {tab.title}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex w-8 shrink-0 items-center justify-center rounded-tr-md text-muted-foreground transition hover:bg-muted hover:text-foreground",
                      tabs.length <= 1 && "pointer-events-none opacity-30"
                    )}
                    aria-label={`Close ${tab.title}`}
                    onClick={(e) => closeTab(e, tab.href)}
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                  {isActive && (
                    <span className="pointer-events-none absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                  )}
                </div>
              );
            })}
          </div>

          <main className="relative min-h-0 flex-1 overflow-hidden bg-background">
            <div className="h-full min-h-0 overflow-auto">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
