import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { revalidateCustomerViews } from "@/app/customers/actions";
import { CustomerForm } from "@/components/customers/customer-form";
import { toast } from "@/hooks/use-toast";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Customer } from "@/types/customer";

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
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    ExternalLink: Icon,
    Loader2: Icon,
    Plus: Icon,
    Trash2: Icon,
  };
});

vi.mock("@/app/customers/actions", () => ({
  revalidateCustomerViews: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/customers/generate-customer-custom-id", () => ({
  generateCustomerCustomId: vi.fn(() => "CABCDE"),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createBrowserClient);
const mockedToast = vi.mocked(toast);
const mockedRevalidateCustomerViews = vi.mocked(revalidateCustomerViews);

type BrowserMockOptions = {
  companyNameDuplicate?: boolean;
  customerIdDuplicate?: boolean;
  occUpdatedAt?: string;
};

const regionOptions = [{ id: "region-1", region_code: "APAC", region_name: "Asia Pacific" }];
const cityOptions = [
  { city_code: "CNSHA", city_name: "Shanghai" },
  { city_code: "CNSHK", city_name: "Shekou" },
];

function createCustomerDepotRow(overrides: Partial<NonNullable<Customer["customer_depots"]>[number]> = {}) {
  return {
    id: "depot-row-1",
    customer_id: "uuid-cust-1",
    city_code: "CNSHA",
    city_name: "Shanghai",
    depot_name: "Shanghai Main Depot",
    depot_address: "1 Bund Rd",
    depot_contact_person: "Alice",
    depot_tel: "12345678",
    contact_email: "alice@example.com",
    is_default: true,
    status: "ACTIVE" as const,
    remark: "Default depot",
    created_at: "2026-05-30T10:00:00.000Z",
    updated_at: "2026-05-30T10:00:00.000Z",
    ...overrides,
  };
}

const baseCustomer: Customer = {
  id: "uuid-cust-1",
  customer_custom_id: "CABCDE",
  company_name: "Acme Ltd",
  company_name_other_language: "Acme CN",
  customer_grade: "C",
  assigned_sales: "Bob Smith",
  region_id: "region-1",
  region: { region_code: "APAC", region_name: "Asia Pacific" },
  status: "Normal",
  contact_phone: "800-555-0000",
  address: "1 Customer Way",
  contact_person: "John",
  notes: "Existing notes",
  finance_emails: ["fin@acme.test"],
  ops_emails: ["ops@acme.test"],
  purchasing_emails: ["buy@acme.test"],
  credit_limit: 5000,
  credit_term_days: 30,
  depot_info: null,
  customer_depots: [createCustomerDepotRow()],
  certificate_links: [],
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-06-01T12:00:00.000Z",
};

function buildBrowserClientMock(options: BrowserMockOptions = {}) {
  const captures = {
    customerInsert: null as unknown,
    customerDepotInsert: [] as unknown[],
    customerDepotUpdates: [] as Array<{ id: string; customerId: string; payload: unknown }>,
    customerUpdate: null as unknown,
    deleteCertificateCalls: 0,
  };

  return {
    __captures: captures,
    from: vi.fn((tableName: string) => {
      if (tableName === "region_codes") {
        return {
          select: () => ({
            order: async () => ({ data: regionOptions, error: null }),
          }),
        };
      }

      if (tableName === "cities") {
        return {
          select: () => ({
            order: async () => ({ data: cityOptions, error: null }),
          }),
        };
      }

      if (tableName === "customers") {
        return {
          select: (columns?: string) => {
            const cols = String(columns ?? "");
            if (cols.includes("updated_at")) {
              return {
                eq: () => ({
                  single: async () => ({
                    data: { updated_at: options.occUpdatedAt ?? baseCustomer.updated_at },
                    error: null,
                  }),
                }),
              };
            }

            return {
              eq: (column: string) => {
                const rows =
                  column === "company_name" && options.companyNameDuplicate
                    ? [{ id: "duplicate-company-id" }]
                    : column === "customer_custom_id" && options.customerIdDuplicate
                      ? [{ id: "duplicate-customer-id" }]
                      : [];

                return {
                  neq: () => ({
                    limit: async () => ({ data: rows, error: null }),
                  }),
                  limit: async () => ({ data: rows, error: null }),
                };
              },
            };
          },
          insert: (payload: unknown) => {
            captures.customerInsert = payload;
            return {
              select: () => ({
                single: async () => ({ data: { id: "new-customer-id" }, error: null }),
              }),
            };
          },
          update: (payload: unknown) => {
            captures.customerUpdate = payload;
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { ...baseCustomer, ...(payload as Record<string, unknown>), updated_at: "2026-05-30T12:00:00.000Z" },
                    error: null,
                  }),
                }),
              }),
            };
          },
        };
      }

      if (tableName === "customer_certificate_links") {
        return {
          insert: async () => ({ error: null }),
          delete: () => ({
            eq: async () => {
              captures.deleteCertificateCalls += 1;
              return { error: null };
            },
          }),
        };
      }

      if (tableName === "customer_depot") {
        return {
          insert: async (payload: unknown) => {
            captures.customerDepotInsert = payload as unknown[];
            return { error: null };
          },
          update: (payload: unknown) => ({
            eq: (_firstColumn: string, id: string) => ({
              eq: async (_secondColumn: string, customerId: string) => {
                captures.customerDepotUpdates.push({ id, customerId, payload });
                return { error: null };
              },
            }),
          }),
        };
      }

      throw new Error(`Unexpected table ${tableName}`);
    }),
  };
}

async function selectComboboxOption(user: ReturnType<typeof userEvent.setup>, name: RegExp, optionName: string) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function fillCreateFormBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: /legal company name/i }), "New Customer");
  await user.type(screen.getByRole("textbox", { name: /primary contact email/i }), "ops@example.com");
  await user.type(screen.getByRole("textbox", { name: /assigned sales/i }), "Sally Seller");
  await selectComboboxOption(user, /customer region/i, "APAC");
}

describe("CustomerForm customer depots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerRefresh.mockReset();
    routerPush.mockReset();
    mockedRevalidateCustomerViews.mockResolvedValue(undefined);
  });

  it("renders Customer Depots above certificates on create/edit/view", async () => {
    mockedCreateClient.mockReturnValue(buildBrowserClientMock() as never);
    const { rerender } = render(<CustomerForm mode="create" />);

    await waitFor(() => {
      expect(screen.getByText("Customer Depots")).toBeInTheDocument();
    });

    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings.indexOf("Customer Depots")).toBeLessThan(headings.indexOf("List of Certificates"));
    expect(screen.getByRole("button", { name: /add depot/i })).toBeInTheDocument();

    rerender(<CustomerForm mode="edit" initialCustomer={baseCustomer} />);
    expect(screen.getByRole("button", { name: /add depot/i })).toBeInTheDocument();

    rerender(<CustomerForm mode="view" initialCustomer={baseCustomer} />);
    expect(screen.queryByRole("button", { name: /add depot/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("adds a draft depot row with Active default and lets the draft row be removed", async () => {
    const user = userEvent.setup();
    mockedCreateClient.mockReturnValue(buildBrowserClientMock() as never);
    render(<CustomerForm mode="create" />);

    await user.click(await screen.findByRole("button", { name: /add depot/i }));

    expect(screen.getByRole("combobox", { name: /depot 1 status/i })).toHaveTextContent("Active");
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.getByText("No customer depots added.")).toBeInTheDocument();
  });

  it("requires city code, depot name, depot address, and depot tel once a depot row exists", async () => {
    const user = userEvent.setup();
    mockedCreateClient.mockReturnValue(buildBrowserClientMock() as never);
    render(<CustomerForm mode="create" />);

    await user.click(await screen.findByRole("button", { name: /add depot/i }));
    await user.click(screen.getByRole("button", { name: /create customer/i }));

    await waitFor(() => {
      expect(screen.getByText("City Code is required")).toBeInTheDocument();
      expect(screen.getByText("Depot Name is required")).toBeInTheDocument();
      expect(screen.getByText("Depot Address is required")).toBeInTheDocument();
      expect(screen.getByText("Depot Tel is required")).toBeInTheDocument();
    });
  });

  it("inserts new customer_depot rows during edit saves", async () => {
    const user = userEvent.setup();
    const browserClient = buildBrowserClientMock();
    mockedCreateClient.mockReturnValue(browserClient as never);
    render(<CustomerForm mode="edit" initialCustomer={{ ...baseCustomer, customer_depots: [] }} />);

    await user.click(screen.getByRole("button", { name: /add depot/i }));
    await selectComboboxOption(user, /depot 1 city code/i, "CNSHA · Shanghai");
    await user.type(screen.getByRole("textbox", { name: /depot 1 depot name/i }), "Shanghai Main Depot");
    await user.type(screen.getByRole("textbox", { name: /depot 1 depot address/i }), "1 Bund Rd");
    await user.type(screen.getByRole("textbox", { name: /depot 1 depot tel/i }), "12345678");
    await user.type(screen.getByRole("textbox", { name: /depot 1 contact email/i }), "depot@example.com");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockedRevalidateCustomerViews).toHaveBeenCalledWith("uuid-cust-1");
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Changes saved successfully." })
      );
    });

    expect(browserClient.__captures.customerDepotInsert).toEqual([
      expect.objectContaining({
        customer_id: "uuid-cust-1",
        city_code: "CNSHA",
        depot_name: "Shanghai Main Depot",
        depot_address: "1 Bund Rd",
        depot_tel: "12345678",
        contact_email: "depot@example.com",
        status: "ACTIVE",
      }),
    ]);
  });

  it("updates saved depot rows, hides remove on persisted rows, and keeps inactive rows after active ones", async () => {
    const user = userEvent.setup();
    const browserClient = buildBrowserClientMock();
    const customer = {
      ...baseCustomer,
      customer_depots: [
        createCustomerDepotRow({
          id: "inactive-row",
          city_code: "CNSHK",
          city_name: "Shekou",
          depot_name: "Shekou Depot",
          status: "INACTIVE",
          is_default: false,
        }),
        createCustomerDepotRow({
          id: "active-row",
          city_code: "CNSHA",
          city_name: "Shanghai",
          depot_name: "Shanghai Main Depot",
          status: "ACTIVE",
          is_default: true,
        }),
      ],
    } satisfies Customer;

    mockedCreateClient.mockReturnValue(browserClient as never);
    render(<CustomerForm mode="edit" initialCustomer={customer} />);

    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /depot 1 city name/i })).toHaveValue("Shanghai");
    expect(screen.getByRole("textbox", { name: /depot 2 city name/i })).toHaveValue("Shekou");

    await selectComboboxOption(user, /depot 1 status/i, "Inactive");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(browserClient.__captures.customerDepotUpdates).toHaveLength(2);
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Changes saved successfully." })
      );
    });

    expect(browserClient.__captures.customerDepotUpdates[0]).toEqual(
      expect.objectContaining({
        id: "active-row",
        customerId: "uuid-cust-1",
        payload: expect.objectContaining({ status: "INACTIVE" }),
      })
    );
  });
});
