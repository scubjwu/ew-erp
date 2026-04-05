import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { materialVendorsActions, toast, anchorClick } = vi.hoisted(() => ({
  materialVendorsActions: {
    exportMaterialVendors: vi.fn(),
    getMaterialVendors: vi.fn(),
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
    Check: Icon,
    ArrowDown: Icon,
    ArrowUp: Icon,
    ArrowUpDown: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
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

vi.mock("@/app/partners/material-vendors/actions", () => materialVendorsActions);

import { ACTIONS_STICKY_CELL_CLASS } from "@/components/shared/page-standard/table-standard";
import { MaterialVendorsDashboard } from "@/components/material-vendors/material-vendors-dashboard";

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

function materialVendorResult(
  overrides?: Partial<Parameters<typeof MaterialVendorsDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "material-1",
        vendor_code: "DB0001",
        legal_company_name: "Material Vendor One",
        company_name: "Material Alias",
        primary_contact_person: "Bob",
        material_category: "地板",
        contact_email: "material@example.com",
        contact_tel: "234567",
        is_default_vendor: false,
        status: "Normal",
        pic_user_id: "user-1",
        pic_user: { id: "user-1", full_name: "Shiyun Pan" },
        address: "Address",
        country: "China",
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
        settlement_current_prepaid_balance: 1200,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      vendorCode: "",
      legalCompanyName: "",
      materialCategory: "",
      isDefaultVendor: "",
    },
    sort: {
      sortBy: "vendorCode",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  vendorCodes: [
    { value: "DB0001", label: "DB0001", secondaryLabel: "Material Vendor One", searchText: "DB0001 Material Vendor One" },
  ],
  legalCompanyNames: [
    { value: "Material Vendor One", label: "Material Vendor One", secondaryLabel: "Material Alias", searchText: "Material Vendor One Material Alias" },
  ],
};

describe("MaterialVendorsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports autocomplete-assisted free text search on enter", async () => {
    const user = userEvent.setup();
    materialVendorsActions.getMaterialVendors.mockResolvedValueOnce(
      materialVendorResult({
        filters: {
          vendorCode: "DB9999",
          legalCompanyName: "",
          materialCategory: "",
          isDefaultVendor: "",
        },
      })
    );

    render(
      <MaterialVendorsDashboard
        initial={materialVendorResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const input = screen.getByRole("combobox", { name: "Vendor Code" });
    await user.clear(input);
    await user.type(input, "DB9999{Enter}");

    await waitFor(() =>
      expect(materialVendorsActions.getMaterialVendors).toHaveBeenCalledWith({
        vendorCode: "DB9999",
        legalCompanyName: "",
        materialCategory: "",
        isDefaultVendor: "",
        sortBy: "vendorCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied filters and sort", async () => {
    const user = userEvent.setup();
    materialVendorsActions.getMaterialVendors.mockResolvedValueOnce(
      materialVendorResult({
        sort: { sortBy: "currentPrepaidBalance", sortDirection: "asc" },
      })
    );
    materialVendorsActions.exportMaterialVendors.mockResolvedValue(materialVendorResult().rows);

    render(
      <MaterialVendorsDashboard
        initial={materialVendorResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: /Current Prepaid Balance/i }));
    await waitFor(() =>
      expect(materialVendorsActions.getMaterialVendors).toHaveBeenCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        materialCategory: "",
        isDefaultVendor: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() =>
      expect(materialVendorsActions.exportMaterialVendors).toHaveBeenCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        materialCategory: "",
        isDefaultVendor: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "asc",
      })
    );
    expect(anchorClick).toHaveBeenCalled();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("1,200")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View/i }).closest("td")).toHaveClass(
      ACTIONS_STICKY_CELL_CLASS.split(" ")[0]
    );
  });
});
