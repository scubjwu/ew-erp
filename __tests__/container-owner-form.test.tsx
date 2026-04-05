import React, { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
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
  const Icon = () => <span data-testid="lucide-mock-icon" />;
  return { ArrowLeft: Icon, ExternalLink: Icon, Loader2: Icon, Pencil: Icon, Plus: Icon, Trash2: Icon };
});

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void } | null>(null);
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (value: string) => void }) => <SelectContext.Provider value={{ value, onValueChange }}><div>{children}</div></SelectContext.Provider>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{useContext(SelectContext)?.value || placeholder || ""}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(SelectContext);
    return <button type="button" onClick={() => ctx?.onValueChange?.(value)}>{children}</button>;
  },
}));

vi.mock("@/app/partners/container-owners/actions", () => ({
  revalidateContainerOwnerViews: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          neq: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        })),
      })),
    })),
  })),
}));
vi.mock("@/lib/container-owners/generate-container-owner-code", () => ({
  generateContainerOwnerCode: vi.fn(() => "OABCDE"),
}));

import { ContainerOwnerForm } from "@/components/container-owners/container-owner-form";
import type { ContainerOwner } from "@/types/container-owner";

const regionOptions = [{ id: "region-1", region_code: "CN", region_name: "China" }];
const picOptions = [{ id: "user-1", full_name: "Shiyun Pan", email: "pic@example.com" }];

const initialOwner: ContainerOwner = {
  id: "owner-1",
  container_owner_code: "OABCDE",
  legal_company_name: "Owner One",
  company_name: "Owner Alias",
  address: "Address",
  region_id: "region-1",
  region: { id: "region-1", region_code: "CN", region_name: "China" },
  country: "China",
  primary_contact_person: "David",
  contact_email: "owner@example.com",
  contact_tel: "456789",
  pic_user_id: "user-1",
  pic_user: { id: "user-1", full_name: "Shiyun Pan" },
  bank_account_name: null,
  bank_account_number: null,
  bank_name: null,
  bank_code: null,
  bank_address: null,
  swift_code: null,
  settlement_payment_term: null,
  settlement_credit_days: 20,
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

describe("ContainerOwnerForm", () => {
  it("renders create and edit actions and keeps view entrypoint", async () => {
    const { rerender } = render(
      <ContainerOwnerForm mode="create" regionOptions={regionOptions} picOptions={picOptions} />
    );
    expect(await screen.findByRole("button", { name: "Create Container Owner" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/partners/container-owners");

    rerender(
      <ContainerOwnerForm
        mode="edit"
        initialContainerOwner={initialOwner}
        regionOptions={regionOptions}
        picOptions={picOptions}
      />
    );
    expect(await screen.findByRole("button", { name: "Save Changes" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /legal company name/i })).toHaveValue("Owner One");

    rerender(
      <ContainerOwnerForm
        mode="view"
        initialContainerOwner={initialOwner}
        regionOptions={regionOptions}
        picOptions={picOptions}
      />
    );
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Edit Container Owner/i })).toBeInTheDocument();
  });
});
