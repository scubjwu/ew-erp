"use client";

import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  ReceiptText,
  Settings,
  Ship,
  ShoppingCart,
  PackageSearch,
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

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: typeof ShoppingCart;
  children?: Array<{
    id: string;
    label: string;
    href: string;
  }>;
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
  "financial-exchange-rates": "Financial Exchange Rates",
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

const PURCHASE_TITLES: Record<string, string> = {
  "po-management": "PO Management",
};

const SALES_TITLES: Record<string, string> = {
  "sales-orders": "Sales Orders",
  "sales-release": "Sales Release",
};

const DISPATCH_TITLES: Record<string, string> = {
  "dispatch-orders": "Dispatch Orders",
  "dispatch-release": "Dispatch Release Management",
  "one-way-planning": "One Way Planning",
};

const NAV: readonly NavItem[] = [
  {
    id: "purchase",
    label: "Purchase",
    href: "/purchase",
    icon: ShoppingCart,
  },
  {
    id: "sales",
    label: "Sales",
    href: "/sales",
    icon: ReceiptText,
    children: [
      {
        id: "sales-orders",
        label: "Sales Orders",
        href: "/sales/sales-orders",
      },
      {
        id: "sales-release",
        label: "Sales Release",
        href: "/sales/sales-release",
      },
    ],
  },
  {
    id: "dispatch",
    label: "Dispatch",
    href: "/dispatch",
    icon: ArrowRightLeft,
    children: [
      {
        id: "one-way-planning",
        label: "One Way Planning",
        href: "/dispatch/one-way-planning",
      },
      {
        id: "dispatch-release",
        label: "Dispatch Release Management",
        href: "/dispatch/dispatch-release",
      },
    ],
  },
  {
    id: "depot-inventory",
    label: "Depot Inventory",
    href: "/depot-inventory",
    icon: Boxes,
    children: [
      {
        id: "depot-inventory-container-list",
        label: "Container List",
        href: "/depot-inventory",
      },
      {
        id: "depot-inventory-dispatch-availability",
        label: "Dispatch Availability",
        href: "/depot-inventory/summary-for-dispatch",
      },
      {
        id: "depot-inventory-sales-availability",
        label: "Sales Availability",
        href: "/depot-inventory/sales-availability",
      },
    ],
  },
  {
    id: "inventory",
    label: "In-Transit Inventory",
    href: "/inventory/center",
    icon: Ship,
  },
  { id: "partners", label: "Partners", href: "/partners", icon: Users },
  {
    id: "basic-info",
    label: "System Codes",
    href: "/basic-info",
    icon: Database,
  },
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
  if (pathname.startsWith("/depot-inventory")) {
    if (pathname === "/depot-inventory/summary-for-dispatch") {
      return {
        id: "depot-inventory-summary-for-dispatch",
        title: "Dispatch Availability",
        href: pathname,
      };
    }
    if (pathname === "/depot-inventory/sales-availability") {
      return {
        id: "depot-inventory-sales-availability",
        title: "Sales Availability",
        href: pathname,
      };
    }
    return {
      id: "depot-inventory",
      title: "Depot Inventory",
      href: "/depot-inventory",
    };
  }
  if (pathname.startsWith("/purchase")) {
    if (pathname.match(/^\/purchase\/po-management\/[^/]+\/items\/[^/]+\/containers$/)) {
      return {
        id: "purchase-po-containers",
        title: "Purchase Containers",
        href: pathname,
      };
    }
    if (pathname.startsWith("/purchase/po-management/") && pathname.endsWith("/edit")) {
      return { id: "purchase-po-edit", title: "Edit Purchase Order", href: pathname };
    }
    if (pathname === "/purchase/po-management/new") {
      return { id: "purchase-po-new", title: "New Purchase Order", href: pathname };
    }
    if (pathname.match(/^\/purchase\/po-management\/[^/]+$/)) {
      return { id: "purchase-po-view", title: "Purchase Order Detail", href: pathname };
    }
    if (pathname.match(/^\/purchase\/[^/]+$/)) {
      const slug = pathname.split("/")[2] ?? "";
      return {
        id: "purchase-section",
        title: PURCHASE_TITLES[slug] ?? "Purchase Detail",
        href: pathname,
      };
    }
    return { id: "purchase", title: "Purchase", href: "/purchase" };
  }
  if (pathname.startsWith("/sales")) {
    if (pathname.match(/^\/sales\/[^/]+$/)) {
      const slug = pathname.split("/")[2] ?? "";
      return {
        id: "sales-section",
        title: SALES_TITLES[slug] ?? "Sales Detail",
        href: pathname,
      };
    }
    return { id: "sales", title: "Sales", href: "/sales" };
  }
  if (pathname.startsWith("/dispatch")) {
    if (pathname.startsWith("/dispatch/one-way-planning/") && pathname.endsWith("/edit")) {
      return {
        id: "one-way-planning-edit",
        title: "Edit One Way Plan",
        href: pathname,
      };
    }
    if (pathname === "/dispatch/one-way-planning/new") {
      return {
        id: "one-way-planning-new",
        title: "New One Way Plan",
        href: pathname,
      };
    }
    if (pathname === "/dispatch/one-way-planning/import") {
      return {
        id: "one-way-planning-import",
        title: "Import CMA Report",
        href: pathname,
      };
    }
    if (pathname.match(/^\/dispatch\/one-way-planning\/[^/]+$/)) {
      return {
        id: "one-way-planning-detail",
        title: "One Way Plan Detail",
        href: pathname,
      };
    }
    if (pathname === "/dispatch/dispatch-release/create") {
      return {
        id: "dispatch-release-create",
        title: "Create Dispatch Release",
        href: pathname,
      };
    }
    if (pathname.match(/^\/dispatch\/dispatch-release\/[^/]+$/)) {
      return {
        id: "dispatch-release-detail",
        title: "Dispatch Release Detail",
        href: pathname,
      };
    }
    if (pathname.match(/^\/dispatch\/[^/]+$/)) {
      const slug = pathname.split("/")[2] ?? "";
      return {
        id: "dispatch-section",
        title: DISPATCH_TITLES[slug] ?? "Dispatch Detail",
        href: pathname,
      };
    }
    return { id: "dispatch", title: "Dispatch", href: "/dispatch" };
  }
  if (pathname.startsWith("/partners")) {
    if (pathname.startsWith("/partners/container-owners/") && pathname.endsWith("/edit")) {
      return {
        id: "partner-container-owner-edit",
        title: "Edit Container Owner",
        href: pathname,
      };
    }
    if (pathname === "/partners/container-owners/new") {
      return {
        id: "partner-container-owner-new",
        title: "New Container Owner",
        href: pathname,
      };
    }
    if (pathname.match(/^\/partners\/container-owners\/[^/]+$/)) {
      return {
        id: "partner-container-owner-view",
        title: "Container Owner Detail",
        href: pathname,
      };
    }
    if (pathname.startsWith("/partners/lessee/") && pathname.endsWith("/edit")) {
      return { id: "partner-lessee-edit", title: "Edit Lessee", href: pathname };
    }
    if (pathname === "/partners/lessee/new") {
      return { id: "partner-lessee-new", title: "New Lessee", href: pathname };
    }
    if (pathname.match(/^\/partners\/lessee\/[^/]+$/)) {
      return { id: "partner-lessee-view", title: "Lessee Detail", href: pathname };
    }
    if (pathname.startsWith("/partners/material-vendors/") && pathname.endsWith("/edit")) {
      return {
        id: "partner-material-vendor-edit",
        title: "Edit Material Vendor",
        href: pathname,
      };
    }
    if (pathname === "/partners/material-vendors/new") {
      return {
        id: "partner-material-vendor-new",
        title: "New Material Vendor",
        href: pathname,
      };
    }
    if (pathname.match(/^\/partners\/material-vendors\/[^/]+$/)) {
      return {
        id: "partner-material-vendor-view",
        title: "Material Vendor Detail",
        href: pathname,
      };
    }
    if (pathname.startsWith("/partners/vendors/") && pathname.endsWith("/edit")) {
      return { id: "partner-vendor-edit", title: "Edit Vendor", href: pathname };
    }
    if (pathname === "/partners/vendors/new") {
      return { id: "partner-vendor-new", title: "New Vendor", href: pathname };
    }
    if (pathname.match(/^\/partners\/vendors\/[^/]+$/)) {
      return { id: "partner-vendor-view", title: "Vendor Detail", href: pathname };
    }
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
    if (pathname.startsWith("/settings/users/") && pathname.endsWith("/edit")) {
      return { id: "settings-user-edit", title: "Edit User", href: pathname };
    }
    if (pathname === "/settings/users/new") {
      return { id: "settings-user-new", title: "New User", href: pathname };
    }
    if (pathname.match(/^\/settings\/users\/[^/]+$/)) {
      return { id: "settings-user-view", title: "User Detail", href: pathname };
    }
    if (pathname === "/settings/users") {
      return { id: "settings-users", title: "User Management", href: pathname };
    }
    return { id: "settings", title: "System Settings", href: "/settings" };
  }
  return null;
}

export function ErpAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<string, boolean>>({
    "depot-inventory": false,
    sales: false,
    dispatch: false,
  });
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

  useEffect(() => {
    if (pathname.startsWith("/depot-inventory")) {
      setExpandedNavGroups((current) => ({ ...current, "depot-inventory": true }));
    }
    if (pathname.startsWith("/sales")) {
      setExpandedNavGroups((current) => ({ ...current, sales: true }));
    }
    if (pathname.startsWith("/dispatch")) {
      setExpandedNavGroups((current) => ({ ...current, dispatch: true }));
    }
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

  const sidebarW = collapsed ? "w-16" : "w-[248px]";

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
              const childActive = item.children?.some(
                (child) => pathname === child.href || pathname.startsWith(`${child.href}/`)
              );
              const isExpandable = Boolean(item.children?.length);
              const isExpanded = expandedNavGroups[item.id] ?? false;
              const showChildren = !collapsed && isExpandable && isExpanded;
              const Icon = item.icon;
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isExpandable && !collapsed) {
                        setExpandedNavGroups((current) => ({
                          ...current,
                          [item.id]: !isExpanded,
                        }));
                        return;
                      }
                      router.push(item.href);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                      active || childActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white",
                      collapsed && "justify-center px-2"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="size-5 shrink-0 opacity-90" aria-hidden />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && isExpandable ? (
                      <ChevronDown
                        className={cn(
                          "ml-auto size-4 shrink-0 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </button>
                  {showChildren ? (
                    <div className="ml-4 space-y-1 border-l border-slate-800 pl-3">
                      {item.children!.map((child) => {
                        const isChildActive =
                          pathname === child.href || pathname.startsWith(`${child.href}/`);
                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={cn(
                              "flex min-w-0 items-center rounded-md px-3 py-2 text-xs transition",
                              isChildActive
                                ? "bg-slate-800/70 font-medium text-sky-400"
                                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                            )}
                          >
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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
