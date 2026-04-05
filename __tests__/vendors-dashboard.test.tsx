import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { vendorsActions, toast, anchorClick } = vi.hoisted(() => ({
  vendorsActions: {
    exportVendors: vi.fn(),
    getVendors: vi.fn(),
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

vi.mock("@/app/partners/vendors/actions", () => vendorsActions);

import { VendorsDashboard } from "@/components/vendors/vendors-dashboard";

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

function vendorResult(
  overrides?: Partial<Parameters<typeof VendorsDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "vendor-1",
        vendor_code: "SABCDE",
        legal_company_name: "Vendor One",
        company_name: "Vendor Alias",
        address: "Address",
        region_id: "region-1",
        primary_contact_person: "Alice",
        contact_email: "vendor@example.com",
        contact_tel: "123456",
        status: "Normal",
        region: { id: "region-1", region_code: "CN", region_name: "China" },
        country: "China",
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
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 1500,
        remark: null,
        attachment_links: [],
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      vendorCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
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
    {
      value: "SABCDE",
      label: "SABCDE",
      secondaryLabel: "Vendor One",
      searchText: "SABCDE Vendor One",
    },
  ],
  legalCompanyNames: [
    {
      value: "Vendor One",
      label: "Vendor One",
      secondaryLabel: "Vendor Alias",
      searchText: "Vendor One Vendor Alias",
    },
  ],
  regions: [
    {
      value: "region-1",
      label: "CN",
      secondaryLabel: "China",
      searchText: "CN China",
    },
    {
      value: "region-2",
      label: "US",
      secondaryLabel: "United States",
      searchText: "US United States",
    },
  ],
};

describe("VendorsDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports autocomplete-assisted free text search on enter", async () => {
    const user = userEvent.setup();
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        filters: {
          vendorCode: "SZZ999",
          legalCompanyName: "",
          regionQuery: "",
          selectedRegionId: "",
        },
      })
    );

    render(
      <VendorsDashboard initial={vendorResult()} pageSize={10} filterOptions={filterOptions} />
    );

    const vendorCodeInput = screen.getByRole("combobox", { name: "Vendor Code" });
    await user.clear(vendorCodeInput);
    await user.type(vendorCodeInput, "SZZ999{Enter}");

    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenCalledWith({
        vendorCode: "SZZ999",
        legalCompanyName: "",
        regionQuery: "",
        selectedRegionId: "",
        sortBy: "vendorCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("uses selectedRegionId when a region candidate is chosen and clears it after editing", async () => {
    const user = userEvent.setup();
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        filters: {
          vendorCode: "",
          legalCompanyName: "",
          regionQuery: "CN",
          selectedRegionId: "region-1",
        },
      })
    );
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        filters: {
          vendorCode: "",
          legalCompanyName: "",
          regionQuery: "Chi",
          selectedRegionId: "",
        },
      })
    );

    render(
      <VendorsDashboard initial={vendorResult()} pageSize={10} filterOptions={filterOptions} />
    );

    const regionInput = screen.getByRole("combobox", { name: "Region" });
    await user.click(regionInput);
    await user.type(regionInput, "CN");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionQuery: "CN",
        selectedRegionId: "region-1",
        sortBy: "vendorCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.clear(regionInput);
    await user.type(regionInput, "Chi");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenLastCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionQuery: "Chi",
        selectedRegionId: "",
        sortBy: "vendorCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied filters plus current sort", async () => {
    const user = userEvent.setup();
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        sort: {
          sortBy: "currentPrepaidBalance",
          sortDirection: "asc",
        },
      })
    );
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        sort: {
          sortBy: "currentPrepaidBalance",
          sortDirection: "desc",
        },
      })
    );
    vendorsActions.exportVendors.mockResolvedValue(vendorResult().rows);

    render(
      <VendorsDashboard initial={vendorResult()} pageSize={10} filterOptions={filterOptions} />
    );

    await user.click(screen.getByRole("button", { name: /Current Prepaid Balance/i }));
    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionQuery: "",
        selectedRegionId: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Current Prepaid Balance/i }));
    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenLastCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionQuery: "",
        selectedRegionId: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "desc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() =>
      expect(vendorsActions.exportVendors).toHaveBeenCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionQuery: "",
        selectedRegionId: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "desc",
      })
    );
    expect(anchorClick).toHaveBeenCalled();
  });

  it("renders status and sticky actions columns with standardized classes", () => {
    render(
      <VendorsDashboard initial={vendorResult()} pageSize={10} filterOptions={filterOptions} />
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();

    const actionsHeader = screen.getByRole("columnheader", { name: "Actions" });
    expect(actionsHeader.className).toContain("sticky");
    expect(actionsHeader.className).toContain("right-0");

    const prepaidCell = screen.getByText("1500.00").closest("td");
    expect(prepaidCell?.className).toContain("text-right");
  });
});
