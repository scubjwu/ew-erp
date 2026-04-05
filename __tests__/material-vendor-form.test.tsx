import React, { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerRefresh = vi.fn();
const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
    push: routerPush,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  } & Record<string, unknown>) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    ArrowLeft: Icon,
    ExternalLink: Icon,
    Loader2: Icon,
    Pencil: Icon,
    Plus: Icon,
    Trash2: Icon,
  };
});

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void } | null>(null);

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (value: string) => void }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => {
    const ctx = useContext(SelectContext);
    return <span>{ctx?.value || placeholder || ""}</span>;
  },
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(SelectContext);
    return <button type="button" onClick={() => ctx?.onValueChange?.(value)}>{children}</button>;
  },
}));

vi.mock("@/app/partners/material-vendors/actions", () => ({
  revalidateMaterialVendorViews: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          neq: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/material-vendors/generate-material-vendor-code", () => ({
  formatMaterialVendorCode: vi.fn(() => "DB0001"),
  prefixForMaterialCategory: vi.fn(() => "DB"),
}));

import { MaterialVendorForm } from "@/components/material-vendors/material-vendor-form";
import type { MaterialVendor } from "@/types/material-vendor";

const picOptions = [{ id: "user-1", full_name: "Shiyun Pan", email: "buyer@example.com" }];

const initialVendor: MaterialVendor = {
  id: "material-1",
  vendor_code: "DB0001",
  legal_company_name: "Material Vendor One",
  company_name: "Material Alias",
  address: "Address",
  country: "China",
  primary_contact_person: "Bob",
  material_category: "地板",
  contact_email: "material@example.com",
  contact_tel: "234567",
  pic_user_id: "user-1",
  pic_user: { id: "user-1", full_name: "Shiyun Pan" },
  is_default_vendor: false,
  bank_account_name: null,
  bank_account_number: null,
  bank_name: null,
  bank_code: null,
  bank_address: null,
  swift_code: null,
  settlement_payment_term: null,
  settlement_calculation_method: null,
  settlement_credit_days: 15,
  settlement_advance_payment_percentage: 0,
  settlement_balance_trigger_event: null,
  settlement_currency: "USD",
  settlement_prepayment_pool: false,
  settlement_prepayment_threshold: 0,
  settlement_current_prepaid_balance: 0,
  remark: null,
  status: "Normal",
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-01T00:00:00Z",
  attachment_links: [],
};

describe("MaterialVendorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders create actions in create mode", async () => {
    render(<MaterialVendorForm mode="create" picOptions={picOptions} />);
    expect(await screen.findByRole("button", { name: "Create Material Vendor" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/partners/material-vendors"
    );
  });

  it("renders edit actions in edit mode and keeps field values", async () => {
    render(<MaterialVendorForm mode="edit" initialVendor={initialVendor} picOptions={picOptions} />);
    expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /legal company name/i })).toHaveValue("Material Vendor One");
  });

  it("does not render submit actions in view mode and keeps edit entrypoint", () => {
    render(<MaterialVendorForm mode="view" initialVendor={initialVendor} picOptions={picOptions} />);
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Material Vendor" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit Material Vendor/i })).toBeInTheDocument();
  });

  it("routes cancel back to material vendors list", async () => {
    render(<MaterialVendorForm mode="edit" initialVendor={initialVendor} picOptions={picOptions} />);
    expect(await screen.findByRole("link", { name: "Cancel" })).toHaveAttribute(
      "href",
      "/partners/material-vendors"
    );
    expect(routerPush).not.toHaveBeenCalled();
  });
});
