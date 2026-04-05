import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { customerActions, toast, anchorClick } = vi.hoisted(() => ({
  customerActions: {
    exportCustomers: vi.fn(),
    getCustomers: vi.fn(),
  },
  toast: vi.fn(),
  anchorClick: vi.fn(),
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
    ArrowDown: Icon,
    ArrowUp: Icon,
    ArrowUpDown: Icon,
    Download: Icon,
    Eye: Icon,
    Pencil: Icon,
    Plus: Icon,
    RotateCcw: Icon,
    Search: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/app/customers/actions", () => customerActions);

import { ACTIONS_STICKY_CELL_CLASS } from "@/components/shared/page-standard/table-standard";
import { CustomersDashboard } from "@/components/customers/customers-dashboard";
import type { Customer } from "@/types/customer";

function installDownloadMocks() {
  const originalCreateElement = document.createElement.bind(document);
  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock"),
    });
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  }
  if (!("revokeObjectURL" in URL)) {
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(() => {}),
    });
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  }
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === "a") {
      const anchor = originalCreateElement(tagName) as HTMLAnchorElement;
      vi.spyOn(anchor, "click").mockImplementation(() => {
        anchorClick();
      });
      return anchor;
    }
    return originalCreateElement(tagName);
  });
}

function customerResult(
  overrides?: Partial<Parameters<typeof CustomersDashboard>[0]["initial"]>
): Parameters<typeof CustomersDashboard>[0]["initial"] {
  return {
    rows: [
      {
        id: "customer-1",
        customer_custom_id: "CX0001",
        company_name: "Customer One",
        company_name_other_language: "Customer Alias",
        customer_grade: "A",
        assigned_sales: "Sales One",
        region_id: "region-1",
        region: { region_code: "CN", region_name: "China" },
        contact_person: "Alice",
        status: "Normal",
        contact_phone: "123456",
        address: "Address",
        notes: null,
        finance_emails: ["finance@example.com"],
        ops_emails: ["ops@example.com"],
        purchasing_emails: ["buy@example.com"],
        credit_limit: 8000,
        credit_term_days: 30,
        depot_info: null,
        certificate_links: [],
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    ] as Customer[],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      customerId: "",
      companyName: "",
    },
    sort: {
      sortBy: "customerId",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  customerIds: [
    {
      value: "CX0001",
      label: "CX0001",
      secondaryLabel: "Customer One",
      searchText: "CX0001 Customer One",
    },
  ],
  legalCompanyNames: [
    {
      value: "Customer One",
      label: "Customer One",
      secondaryLabel: "CX0001",
      searchText: "Customer One CX0001",
    },
  ],
};

describe("CustomersDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports autocomplete-assisted free text search on enter", async () => {
    const user = userEvent.setup();
    customerActions.getCustomers.mockResolvedValueOnce(
      customerResult({
        filters: {
          customerId: "CX9999",
          companyName: "",
        },
      })
    );

    render(
      <CustomersDashboard initial={customerResult()} pageSize={10} filterOptions={filterOptions} />
    );

    const input = screen.getByRole("combobox", { name: "Customer ID" });
    await user.clear(input);
    await user.type(input, "CX9999{Enter}");

    await waitFor(() =>
      expect(customerActions.getCustomers).toHaveBeenCalledWith({
        customerId: "CX9999",
        companyName: "",
        sortBy: "customerId",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied filters and sort", async () => {
    const user = userEvent.setup();
    customerActions.getCustomers.mockResolvedValueOnce(
      customerResult({
        sort: { sortBy: "creditLimit", sortDirection: "asc" },
      })
    );
    customerActions.exportCustomers.mockResolvedValue(customerResult().rows);

    render(
      <CustomersDashboard initial={customerResult()} pageSize={10} filterOptions={filterOptions} />
    );

    await user.click(screen.getByRole("button", { name: /Credit Limit/i }));
    await waitFor(() =>
      expect(customerActions.getCustomers).toHaveBeenCalledWith({
        customerId: "",
        companyName: "",
        sortBy: "creditLimit",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() =>
      expect(customerActions.exportCustomers).toHaveBeenCalledWith({
        customerId: "",
        companyName: "",
        sortBy: "creditLimit",
        sortDirection: "asc",
      })
    );

    expect(anchorClick).toHaveBeenCalled();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("8,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/i }).closest("td")).toHaveClass(
      ACTIONS_STICKY_CELL_CLASS.split(" ")[0]
    );
  });
});
