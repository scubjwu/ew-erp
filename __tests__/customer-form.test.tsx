/**
 * CRM customer form integration tests.
 * Run: `npm test` (requires Node >= 18 for Vitest / Vite).
 */
import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerForm } from "@/components/customers/customer-form";
import { toast } from "@/hooks/use-toast";
import {
  getEmailListValidationIssues,
  isValidEmailAddress,
} from "@/lib/emails";
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
    HelpCircle: Icon,
    Loader2: Icon,
    Search: Icon,
    Trash2: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Check: Icon,
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

const mockedToast = vi.mocked(toast);
const mockedCreateClient = vi.mocked(createBrowserClient);

type InsertCapture = { current: unknown };
type UpdateSpy = ReturnType<typeof vi.fn>;

function buildSupabaseMock(options: {
  /** Row returned from OCC `select('updated_at').single()` */
  occUpdatedAt: string;
  insertCapture?: InsertCapture;
  insertId?: string;
  savedRow?: Customer;
  updateSingleSpy?: UpdateSpy;
  /** Last payload passed to `.update(payload)` (for asserting save body). */
  updatePayloadCapture?: { current: unknown };
  /**
   * When true, `select('id').eq('company_name', …)` (and `.neq().limit()` in edit)
   * returns a row so `isCompanyNameTaken` / Check Availability sees a duplicate.
   */
  companyNameQueryReturnsDuplicate?: boolean;
}) {
  const insertCapture = options.insertCapture ?? { current: null };
  const updateSingleSpy =
    options.updateSingleSpy ??
    vi.fn().mockResolvedValue({
      data: options.savedRow ?? null,
      error: null,
    });

  const table = {
    select(columns?: string) {
      const c = String(columns ?? "");
      if (c.includes("updated_at")) {
        return {
          eq: (_col: string, _val: unknown) => ({
            single: async () => ({
              data: { updated_at: options.occUpdatedAt },
              error: null,
            }),
          }),
        };
      }
      return {
        eq: (col: string, _val: unknown) => {
          const isCompanyName =
            String(col) === "company_name" &&
            options.companyNameQueryReturnsDuplicate === true;
          const rows = isCompanyName ? [{ id: "other-customer-id" }] : [];
          return {
            neq: (_c: string, _v: unknown) => ({
              limit: async () => ({ data: rows, error: null }),
            }),
            limit: async () => ({ data: rows, error: null }),
          };
        },
      };
    },
    insert: (payload: unknown) => {
      insertCapture.current = payload;
      return {
        select: () => ({
          single: async () => ({
            data: { id: options.insertId ?? "new-customer-id" },
            error: null,
          }),
        }),
      };
    },
    update: (payload: unknown) => {
      if (options.updatePayloadCapture) {
        options.updatePayloadCapture.current = payload;
      }
      return {
        eq: (_col: string, _val: unknown) => ({
          select: (_cols?: string) => ({
            single: updateSingleSpy,
          }),
        }),
      };
    },
  };

  return {
    from: vi.fn(() => table),
    __insertCapture: insertCapture,
    __updateSingleSpy: updateSingleSpy,
  };
}

const baseEditCustomer: Customer = {
  id: "uuid-cust-1",
  customer_custom_id: "CABCDE",
  company_name: "Acme Ltd",
  customer_grade: "C",
  assigned_sales: "Bob Smith",
  status: "Normal",
  contact_phone: null,
  address: null,
  notes: null,
  finance_emails: ["fin@acme.test"],
  ops_emails: ["ops@acme.test"],
  purchasing_emails: ["buy@acme.test"],
  credit_limit: 5000,
  credit_term_days: 30,
  depot_info: { depots: [] },
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-06-01T12:00:00.000Z",
};

function savedRowFromUpdate(overrides: Partial<Customer> = {}): Customer {
  const { updated_at: updatedAtOverride, ...rest } = overrides;
  return {
    ...baseEditCustomer,
    ...rest,
    updated_at: updatedAtOverride ?? "2024-06-02T15:00:00.000Z",
  };
}

/** Expected DB shape after a full edit save (matches typed values in round-trip test). */
const ROUND_TRIP_UPDATED_AT = "2024-09-10T15:30:00.000Z";

const customerAfterFullEditRoundTrip: Customer = savedRowFromUpdate({
  customer_custom_id: "C1A2B3",
  company_name: "RoundTrip Industries",
  address: "200 Harbor Rd",
  notes: "Notes after round trip",
  customer_grade: "A",
  assigned_sales: "Sam Sales",
  status: "Blacklisted",
  contact_phone: "+1-800-555-0199",
  credit_limit: 8800,
  credit_term_days: 14,
  finance_emails: ["finance@round.trip"],
  ops_emails: ["ops@round.trip"],
  purchasing_emails: ["buy@round.trip"],
  depot_info: {
    depots: [
      {
        city_code: "SG",
        city_name: "Singapore",
        contact_person: "Lee",
        email: "depot@round.trip",
        phone: "",
        depot_name: "Port A",
        depot_address: "Bay 1",
        depot_tel: "",
      },
    ],
  },
  updated_at: ROUND_TRIP_UPDATED_AT,
});

function assertEditFormReflectsCustomer(expected: Customer) {
  expect(
    screen.getByRole("textbox", { name: /customer id/i })
  ).toHaveValue(expected.customer_custom_id ?? "");

  expect(screen.getByRole("textbox", { name: /company name/i })).toHaveValue(
    expected.company_name
  );

  expect(screen.getByRole("textbox", { name: /^address$/i })).toHaveValue(
    expected.address ?? ""
  );

  expect(screen.getByRole("textbox", { name: /^notes/i })).toHaveValue(
    expected.notes ?? ""
  );

  const [gradeTrigger, statusTrigger] = screen.getAllByRole("combobox");
  expect(gradeTrigger).toHaveTextContent(expected.customer_grade ?? "");
  expect(statusTrigger).toHaveTextContent(expected.status);

  expect(
    screen.getByRole("textbox", { name: /assigned sales/i })
  ).toHaveValue(expected.assigned_sales ?? "");

  expect(
    screen.getByRole("textbox", { name: /contact phone/i })
  ).toHaveValue(expected.contact_phone ?? "");

  expect(screen.getByRole("textbox", { name: /credit limit/i })).toHaveValue(
    String(expected.credit_limit)
  );

  expect(
    screen.getByRole("spinbutton", { name: /credit term/i })
  ).toHaveValue(expected.credit_term_days);

  expect(
    screen.getByRole("textbox", { name: /purchasing emails/i })
  ).toHaveValue(expected.purchasing_emails.join("\n"));

  expect(screen.getByRole("textbox", { name: /finance emails/i })).toHaveValue(
    expected.finance_emails.join("\n")
  );

  expect(
    screen.getByRole("textbox", { name: /operations emails/i })
  ).toHaveValue(expected.ops_emails.join("\n"));

  const depots = (expected.depot_info as { depots?: unknown[] } | null)
    ?.depots;
  if (depots?.length) {
    const row = depots[0] as {
      city_code: string;
      city_name: string;
      depot_name: string;
      contact_person: string;
      email: string;
      depot_address: string;
    };
    const table = screen.getByRole("table");
    const rowInputs = within(table).getAllByRole("textbox");
    expect(rowInputs[0]).toHaveValue(row.city_code);
    expect(rowInputs[1]).toHaveValue(row.city_name);
    expect(rowInputs[2]).toHaveValue(row.depot_name);
    expect(rowInputs[3]).toHaveValue(row.contact_person);
    expect(rowInputs[5]).toHaveValue(row.email);
    expect(rowInputs[7]).toHaveValue(row.depot_address);
  }
}

async function applyFullEditRoundTripChanges(
  u: ReturnType<typeof userEvent.setup>
) {
  const idInput = screen.getByRole("textbox", { name: /customer id/i });
  await u.clear(idInput);
  await u.type(idInput, "C1A2B3");

  const companyInput = screen.getByRole("textbox", { name: /company name/i });
  await u.clear(companyInput);
  await u.type(companyInput, "RoundTrip Industries");

  await u.type(
    screen.getByRole("textbox", { name: /^address$/i }),
    "200 Harbor Rd"
  );

  await u.type(
    screen.getByRole("textbox", { name: /^notes/i }),
    "Notes after round trip"
  );

  const [gradeTrigger, statusTrigger] = screen.getAllByRole("combobox");
  await u.click(gradeTrigger);
  await u.click(await screen.findByRole("option", { name: "A" }));

  await u.click(statusTrigger);
  await u.click(await screen.findByRole("option", { name: "Blacklisted" }));

  const salesInput = screen.getByRole("textbox", {
    name: /assigned sales/i,
  });
  await u.clear(salesInput);
  await u.type(salesInput, "Sam Sales");

  await u.type(
    screen.getByRole("textbox", { name: /contact phone/i }),
    "+1-800-555-0199"
  );

  const creditLimit = screen.getByRole("textbox", { name: /credit limit/i });
  await u.clear(creditLimit);
  await u.type(creditLimit, "8800");

  const creditTerm = screen.getByRole("spinbutton", {
    name: /credit term/i,
  });
  await u.clear(creditTerm);
  await u.type(creditTerm, "14");

  const purch = screen.getByRole("textbox", { name: /purchasing emails/i });
  await u.clear(purch);
  await u.type(purch, "buy@round.trip");

  const fin = screen.getByRole("textbox", { name: /finance emails/i });
  await u.clear(fin);
  await u.type(fin, "finance@round.trip");

  const ops = screen.getByRole("textbox", { name: /operations emails/i });
  await u.clear(ops);
  await u.type(ops, "ops@round.trip");

  await u.click(screen.getByRole("button", { name: /\+ add row/i }));

  const table = screen.getByRole("table");
  const rowInputs = within(table).getAllByRole("textbox");
  await u.type(rowInputs[0], "sg");
  await waitFor(() => {
    expect(rowInputs[0]).toHaveValue("SG");
  });
  await u.type(rowInputs[1], "Singapore");
  await u.type(rowInputs[2], "Port A");
  await u.type(rowInputs[3], "Lee");
  await u.type(rowInputs[5], "depot@round.trip");
  await u.type(rowInputs[7], "Bay 1");
}

describe("CustomerForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    routerRefresh.mockClear();
    routerPush.mockClear();
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("Initial state (create)", () => {
    it("keeps customer_custom_id read-only and credit defaults 0 / 3", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("CABCDE")).toBeDisabled();
      });

      expect(screen.getByRole("spinbutton", { name: /credit term/i })).toHaveValue(
        3
      );

      const limitInputs = screen.getAllByRole("textbox", { name: /credit limit/i });
      expect(limitInputs[0]).toHaveValue("0");
    });
  });

  describe("Validation", () => {
    it("shows toast when mandatory fields are missing on submit", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Please fill in all mandatory fields.",
          })
        );
      });
    });

    it("surfaces malformed purchasing emails", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      await user.type(screen.getByRole("textbox", { name: /company name/i }), "Co");
      await user.type(
        screen.getByRole("textbox", { name: /assigned sales/i }),
        "Rep"
      );
      await user.type(
        screen.getByRole("textbox", { name: /purchasing emails/i }),
        "not-an-email"
      );

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            /invalid email \(purchasing email\): not-an-email/i
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Company name availability check", () => {
    it("shows destructive toast when checking with an empty company name", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("CABCDE")).toBeInTheDocument();
      });

      await user.click(
        screen.getByRole("button", { name: /check availability/i })
      );

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            title: "Please enter a company name.",
          })
        );
      });
    });

    it("create: reports duplicate when another customer has the same name", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          companyNameQueryReturnsDuplicate: true,
        }) as never
      );

      render(<CustomerForm mode="create" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("CABCDE")).toBeInTheDocument();
      });

      await user.type(
        screen.getByRole("textbox", { name: /company name/i }),
        "TakenCo Inc"
      );

      await user.click(
        screen.getByRole("button", { name: /check availability/i })
      );

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            title: "Duplicate Found: TakenCo Inc is already registered.",
          })
        );
      });
    });

    it("create: reports available when no other customer uses the name", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("CABCDE")).toBeInTheDocument();
      });

      await user.type(
        screen.getByRole("textbox", { name: /company name/i }),
        "FreshCo Ltd"
      );

      await user.click(
        screen.getByRole("button", { name: /check availability/i })
      );

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Name Available: You can use this company name.",
          })
        );
      });
    });

    it("edit: treats current record's own name as available (excludes id)", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("textbox", { name: /company name/i })
        ).toHaveValue("Acme Ltd");
      });

      await user.click(
        screen.getByRole("button", { name: /check availability/i })
      );

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Name Available: You can use this company name.",
          })
        );
      });
    });

    it("edit: reports duplicate when another customer has the chosen name", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          companyNameQueryReturnsDuplicate: true,
        }) as never
      );

      render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("textbox", { name: /company name/i })
        ).toHaveValue("Acme Ltd");
      });

      const companyInput = screen.getByRole("textbox", {
        name: /company name/i,
      });
      await user.clear(companyInput);
      await user.type(companyInput, "Contested Name LLC");

      await user.click(
        screen.getByRole("button", { name: /check availability/i })
      );

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            title:
              "Duplicate Found: Contested Name LLC is already registered.",
          })
        );
      });
    });
  });

  describe("Email format validation (lib/rules)", () => {
    it("rejects tokens that are not emails (e.g. bare digits)", () => {
      expect(isValidEmailAddress("1")).toBe(false);
      expect(isValidEmailAddress("not-an-email")).toBe(false);
      expect(isValidEmailAddress("a@b.co")).toBe(true);
    });

    it("getEmailListValidationIssues requires at least one email when minCount is 1", () => {
      const empty = getEmailListValidationIssues("", {
        minCount: 1,
        fieldLabel: "purchasing email",
      });
      expect(empty.some((m) => /at least one valid/i.test(m))).toBe(true);

      const onlyOne = getEmailListValidationIssues("1", {
        minCount: 1,
        fieldLabel: "purchasing email",
      });
      expect(
        onlyOne.some((m) =>
          /invalid email \(purchasing email\): 1/i.test(m)
        )
      ).toBe(true);
    });

    it("getEmailListValidationIssues flags any bad token when field is optional (minCount 0)", () => {
      const issues = getEmailListValidationIssues("good@x.co, 1", {
        minCount: 0,
        fieldLabel: "finance email",
      });
      expect(
        issues.some((m) => /invalid email \(finance email\): 1/i.test(m))
      ).toBe(true);
    });

    it("accepts empty optional lists", () => {
      expect(
        getEmailListValidationIssues("  \n  ", {
          minCount: 0,
          fieldLabel: "finance email",
        })
      ).toEqual([]);
    });
  });

  describe("Email format validation (form UI)", () => {
    async function fillCreateRequired(
      u: ReturnType<typeof userEvent.setup>,
      purchasing: string
    ) {
      await u.type(screen.getByRole("textbox", { name: /company name/i }), "Co");
      await u.type(
        screen.getByRole("textbox", { name: /assigned sales/i }),
        "Rep"
      );
      await u.type(
        screen.getByRole("textbox", { name: /purchasing emails/i }),
        purchasing
      );
    }

    it("rejects purchasing value '1' (not a valid email)", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);
      await fillCreateRequired(user, "1");

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email \(purchasing email\): 1/i)
        ).toBeInTheDocument();
      });
    });

    it("rejects invalid finance email when purchasing is valid", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);
      await fillCreateRequired(user, "buyer@valid.test");
      await user.type(
        screen.getByRole("textbox", { name: /finance emails/i }),
        "1"
      );

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email \(finance email\): 1/i)
        ).toBeInTheDocument();
      });
      expect(insertCap.current).toBeNull();
    });

    it("rejects invalid operations email when purchasing is valid", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);
      await fillCreateRequired(user, "buyer@valid.test");
      await user.type(
        screen.getByRole("textbox", { name: /operations emails/i }),
        "bad"
      );

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email \(operations email\): bad/i)
        ).toBeInTheDocument();
      });
      expect(insertCap.current).toBeNull();
    });

    it("rejects invalid depot row email", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);
      await fillCreateRequired(user, "buyer@valid.test");

      await user.click(screen.getByRole("button", { name: /\+ add row/i }));
      const table = screen.getByRole("table");
      const dataRow = table.querySelector("tbody tr");
      expect(dataRow).toBeTruthy();
      const rowInputs = within(dataRow as HTMLElement).getAllByRole("textbox");
      expect(rowInputs.length).toBeGreaterThanOrEqual(6);
      const emailInput = rowInputs[5];
      await user.clear(emailInput);
      await user.type(emailInput, "1");

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        const formError =
          screen.queryByText(/invalid email in depot row/i) != null;
        const guardToast = mockedToast.mock.calls.some(
          (call) =>
            call[0]?.title === "Invalid email addresses" &&
            String(call[0]?.description ?? "").includes("depot")
        );
        expect(formError || guardToast).toBe(true);
      });
      expect(insertCap.current).toBeNull();
    });
  });

  describe("Email fallback on submit (create)", () => {
    it("inherits purchasing emails when finance and ops are blank", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);

      await user.type(screen.getByRole("textbox", { name: /company name/i }), "Globex");
      await user.type(
        screen.getByRole("textbox", { name: /assigned sales/i }),
        "Sales"
      );
      await user.type(
        screen.getByRole("textbox", { name: /purchasing emails/i }),
        "buyer@globex.test"
      );

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(insertCap.current).toMatchObject({
          finance_emails: ["buyer@globex.test"],
          ops_emails: ["buyer@globex.test"],
          purchasing_emails: ["buyer@globex.test"],
        });
      });
    });
  });

  describe("Depot table", () => {
    it("adds a row, uppercases city_code, and deletes the row", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      await user.click(screen.getByRole("button", { name: /\+ add row/i }));

      const table = screen.getByRole("table");
      const rowInputs = within(table).getAllByRole("textbox");
      expect(rowInputs.length).toBeGreaterThan(0);

      await user.type(rowInputs[0], "sh");

      await waitFor(() => {
        expect(rowInputs[0]).toHaveValue("SH");
      });

      const deleteBtn = within(table).getByRole("button");
      await user.click(deleteBtn);

      expect(
        screen.getByText(/no depot information yet/i)
      ).toBeInTheDocument();
    });
  });

  describe("Edit load / API value coercion", () => {
    it("manual flow: grade C→A → save → leave → reopen edit → grade shows A (no invalid option)", async () => {
      const saved = savedRowFromUpdate({
        customer_grade: "A",
        updated_at: "2024-07-01T10:00:00.000Z",
      });
      const updateSpy = vi
        .fn()
        .mockResolvedValue({ data: saved, error: null });

      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          updateSingleSpy: updateSpy,
          savedRow: saved,
        }) as never
      );

      const { unmount } = render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await waitFor(() => {
        expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("C");
      });

      await user.click(screen.getAllByRole("combobox")[0]);
      await user.click(await screen.findByRole("option", { name: "A" }));

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Changes saved successfully." })
        );
      });

      unmount();

      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: saved.updated_at,
          updateSingleSpy: vi
            .fn()
            .mockResolvedValue({ data: saved, error: null }),
          savedRow: saved,
        }) as never
      );

      render(<CustomerForm mode="edit" initialCustomer={saved} />);

      await waitFor(() => {
        expect(screen.queryByText(/invalid option/i)).not.toBeInTheDocument();
      });

      expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("A");
    });

    it("maps null customer_grade and non-canonical status without enum/select errors", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      const row = {
        ...baseEditCustomer,
        customer_grade: null as unknown as string,
        status: "prepayment" as unknown as Customer["status"],
      };

      render(<CustomerForm mode="edit" initialCustomer={row} />);

      await waitFor(() => {
        expect(screen.queryByText(/invalid option/i)).not.toBeInTheDocument();
      });

      const [gradeTrigger, statusTrigger] = screen.getAllByRole("combobox");
      expect(gradeTrigger).toHaveTextContent("C");
      expect(statusTrigger).toHaveTextContent("Prepayment");
    });
  });

  describe("Edit round-trip: change → save → main → reopen", () => {
    it("every editable field keeps its updated value after save, unmount, and remount", async () => {
      const updatePayloadCapture: { current: unknown } = { current: null };
      const updateSpy = vi.fn().mockResolvedValue({
        data: customerAfterFullEditRoundTrip,
        error: null,
      });

      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          updateSingleSpy: updateSpy,
          savedRow: customerAfterFullEditRoundTrip,
          updatePayloadCapture: updatePayloadCapture,
        }) as never
      );

      const { unmount } = render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await waitFor(() => {
        expect(
          screen.getByRole("textbox", { name: /company name/i })
        ).toHaveValue("Acme Ltd");
      });

      await applyFullEditRoundTripChanges(user);

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Changes saved successfully." })
        );
      });

      const payload = updatePayloadCapture.current as Record<string, unknown>;
      expect(payload.company_name).toBe("RoundTrip Industries");
      expect(payload.customer_custom_id).toBe("C1A2B3");
      expect(payload.customer_grade).toBe("A");
      expect(payload.status).toBe("Blacklisted");
      expect(payload.assigned_sales).toBe("Sam Sales");
      expect(payload.contact_phone).toBe("+1-800-555-0199");
      expect(payload.address).toBe("200 Harbor Rd");
      expect(payload.notes).toBe("Notes after round trip");
      expect(payload.credit_limit).toBe(8800);
      expect(payload.credit_term_days).toBe(14);
      expect(payload.purchasing_emails).toEqual(["buy@round.trip"]);
      expect(payload.finance_emails).toEqual(["finance@round.trip"]);
      expect(payload.ops_emails).toEqual(["ops@round.trip"]);
      const depotPayload = payload.depot_info as {
        depots: Array<{ city_code: string; depot_name: string }>;
      };
      expect(depotPayload.depots[0]?.city_code).toBe("SG");
      expect(depotPayload.depots[0]?.depot_name).toBe("Port A");

      unmount();

      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: customerAfterFullEditRoundTrip.updated_at,
          updateSingleSpy: vi
            .fn()
            .mockResolvedValue({
              data: customerAfterFullEditRoundTrip,
              error: null,
            }),
          savedRow: customerAfterFullEditRoundTrip,
        }) as never
      );

      render(
        <CustomerForm
          key={`${customerAfterFullEditRoundTrip.id}:${customerAfterFullEditRoundTrip.updated_at}`}
          mode="edit"
          initialCustomer={customerAfterFullEditRoundTrip}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/invalid option/i)).not.toBeInTheDocument();
      });

      assertEditFormReflectsCustomer(customerAfterFullEditRoundTrip);
    });
  });

  describe("Concurrency (OCC)", () => {
    it('shows "Conflict detected" when DB updated_at is newer than baseline', async () => {
      const updateSpy = vi.fn();
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: "2099-01-01T00:00:00.000Z",
          updateSingleSpy: updateSpy,
        }) as never
      );

      render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Conflict detected",
          })
        );
      });

      expect(updateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Prepayment lock", () => {
    it("forces credit_limit to 0 and disables the field", async () => {
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({ occUpdatedAt: baseEditCustomer.updated_at }) as never
      );

      render(<CustomerForm mode="create" />);

      const comboboxes = screen.getAllByRole("combobox");
      const statusTrigger = comboboxes[1];
      await user.click(statusTrigger);
      await user.click(await screen.findByRole("option", { name: "Prepayment" }));

      const limitInput = screen.getByRole("textbox", { name: /credit limit/i });
      expect(limitInput).toHaveValue("0");
      expect(limitInput).toHaveAttribute("readonly");
    });
  });

  describe("Sanitization on submit", () => {
    it("trims company_name before insert payload", async () => {
      const insertCap: InsertCapture = { current: null };
      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          insertCapture: insertCap,
        }) as never
      );

      render(<CustomerForm mode="create" />);

      await user.type(
        screen.getByRole("textbox", { name: /company name/i }),
        "  Trimmed Co  "
      );
      await user.type(
        screen.getByRole("textbox", { name: /assigned sales/i }),
        "Rep"
      );
      await user.type(
        screen.getByRole("textbox", { name: /purchasing emails/i }),
        "a@b.co"
      );

      await user.click(screen.getByRole("button", { name: /create customer/i }));

      await waitFor(() => {
        expect(insertCap.current).toMatchObject({
          company_name: "Trimmed Co",
        });
      });
    });
  });

  describe("Successful edit (sanity)", () => {
    it("calls update when OCC passes", async () => {
      const updateSpy = vi
        .fn()
        .mockResolvedValue({ data: savedRowFromUpdate(), error: null });

      mockedCreateClient.mockReturnValue(
        buildSupabaseMock({
          occUpdatedAt: baseEditCustomer.updated_at,
          updateSingleSpy: updateSpy,
          savedRow: savedRowFromUpdate(),
        }) as never
      );

      render(
        <CustomerForm mode="edit" initialCustomer={baseEditCustomer} />
      );

      await user.click(screen.getByRole("button", { name: /save changes/i }));

      await waitFor(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(mockedToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Changes saved successfully." })
        );
      });
    });
  });
});
