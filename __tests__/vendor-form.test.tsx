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

const SelectContext = createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
} | null>(null);

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
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
    return (
      <button type="button" onClick={() => ctx?.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/app/partners/vendors/actions", () => ({
  revalidateVendorViews: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/vendors/generate-vendor-code", () => ({
  generateVendorCode: vi.fn(() => "SABCDE"),
}));

import { VendorForm } from "@/components/vendors/vendor-form";
import type { Vendor } from "@/types/vendor";

const regionOptions = [
  { id: "region-1", region_code: "CN", region_name: "China" },
];

const buyerOptions = [
  { id: "user-1", full_name: "Shiyun Pan", email: "buyer@example.com" },
];

const initialVendor: Vendor = {
  id: "vendor-1",
  vendor_code: "SABCDE",
  legal_company_name: "Vendor One",
  company_name: "Vendor Alias",
  address: "Address",
  region_id: "region-1",
  region: { id: "region-1", region_code: "CN", region_name: "China" },
  country: "China",
  primary_contact_person: "Alice",
  contact_email: "vendor@example.com",
  contact_tel: "123456",
  category: "Container",
  assigned_buyer_id: "user-1",
  assigned_buyer: { id: "user-1", full_name: "Shiyun Pan" },
  bank_account_name: null,
  bank_account_number: null,
  bank_name: null,
  bank_code: null,
  bank_address: null,
  swift_code: null,
  settlement_payment_term: null,
  settlement_credit_days: 30,
  settlement_credit_limit: 500000,
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

describe("VendorForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders create actions in create mode", async () => {
    render(
      <VendorForm mode="create" regionOptions={regionOptions} buyerOptions={buyerOptions} />
    );

    expect(await screen.findByRole("button", { name: "Create Vendor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders edit actions in edit mode and keeps field values", async () => {
    render(
      <VendorForm
        mode="edit"
        initialVendor={initialVendor}
        regionOptions={regionOptions}
        buyerOptions={buyerOptions}
      />
    );

    expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /legal company name/i })).toHaveValue(
      "Vendor One"
    );
  });

  it("does not render submit actions in view mode and keeps edit entrypoint", () => {
    render(
      <VendorForm
        mode="view"
        initialVendor={initialVendor}
        regionOptions={regionOptions}
        buyerOptions={buyerOptions}
      />
    );

    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create Vendor" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit Vendor/i })).toBeInTheDocument();
  });

  it("renders settlement credit limit in view mode", async () => {
    const user = userEvent.setup();

    render(
      <VendorForm
        mode="view"
        initialVendor={initialVendor}
        regionOptions={regionOptions}
        buyerOptions={buyerOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: "Settlement" }));

    expect(await screen.findByDisplayValue("500000")).toBeInTheDocument();
  });

  it("routes cancel back to vendors list", async () => {
    const user = userEvent.setup();

    render(
      <VendorForm
        mode="edit"
        initialVendor={initialVendor}
        regionOptions={regionOptions}
        buyerOptions={buyerOptions}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/partners/vendors");
    });
  });
});
