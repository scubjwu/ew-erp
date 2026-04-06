import React, { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { purchaseActions, toast, anchorClick } = vi.hoisted(() => ({
  purchaseActions: {
    exportPurchaseOrders: vi.fn(),
    getPurchaseOrders: vi.fn(),
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
    ChevronDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    Eye: Icon,
    Pencil: Icon,
    RotateCcw: Icon,
    Search: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void } | null>(null);

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
  SelectTrigger: ({
    children,
    ...props
  }: {
    children: ReactNode;
  } & Record<string, unknown>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
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

vi.mock("@/app/purchase/po-management/actions", () => purchaseActions);

import { PurchaseOrdersDashboard } from "@/components/purchase/purchase-orders-dashboard";

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

function purchaseResult(
  overrides?: Partial<Parameters<typeof PurchaseOrdersDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "po-1",
        orderNo: "PO-001",
        purchaseType: "FACTORY_ORDER",
        supplierId: "vendor-1",
        ownerId: null,
        buyerId: null,
        purchaseDate: "2026-04-10",
        estimatedOfflineTime: null,
        contractNumber: null,
        invoiceNumber: null,
        freeday: null,
        vendorReleaseNumber: null,
        vendorReleaseDate: null,
        remark: null,
        exchangeRate: 1,
        orderStatus: "RELEASED",
        inboundStatus: "PARTIAL",
        paymentMode: "PREPAYMENT",
        paymentAccount: null,
        dueDate: null,
        totalPlannedQty: 2,
        totalReceivedQty: 0,
        totalAvailableQty: 1,
        grandTotal: 2500,
        totalAmountPaid: 0,
        totalAmountUnpaid: 2500,
        settlementPaymentTerm: null,
        settlementCreditDays: null,
        settlementAdvancePaymentPercentage: null,
        settlementBalanceTriggerEvent: null,
        settlementCurrency: "USD",
        settlementPrepaymentPool: false,
        settlementPrepaymentThreshold: 0,
        settlementCurrentPrepaidBalance: 1200,
        vendorBankInformation: null,
        createdAt: "2026-04-10T00:00:00Z",
        updatedAt: "2026-04-10T00:00:00Z",
        supplier: null,
        owner: null,
        buyer: null,
        primaryLocation: "Shanghai",
        primarySizeCode: "20",
        primaryTypeCode: "DV",
        primaryConditionCode: "CW",
        primaryColor: "RAL1001",
        vendorLabel: "Vendor One",
        locationLabel: "SHA",
        sizeTypeLabel: "20DV",
        conditionLabel: "CW",
        prepaidBalance: 1200,
        cancelledQty: 0,
        remainingQty: 1,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      vendorId: "",
      locationCityId: "",
      color: "",
      sizeType: "",
      conditionId: "",
      orderDateFrom: "",
      orderDateTo: "",
      orderStatus: "",
      quickFilter: "",
    },
    summary: {
      totalOrders: 1,
      totalPlannedQty: 2,
      totalAvailableQty: 1,
      totalRemainingQty: 1,
      totalCancelledQty: 0,
      prepaidBalance: 1200,
    },
    sort: {
      sortBy: "activityAt",
      sortDirection: "desc",
    },
    ...overrides,
  };
}

const filterOptions = {
  vendors: [
    {
      value: "VENDOR1",
      label: "VENDOR1",
      secondaryLabel: "Vendor One",
      searchText: "VENDOR1 Vendor One",
    },
  ],
  locations: [
    {
      value: "ADWEN",
      label: "ADWEN",
      secondaryLabel: "Wien",
      searchText: "ADWEN Wien",
    },
    {
      value: "USLAX",
      label: "USLAX",
      secondaryLabel: "Los Angeles/Long Beach",
      searchText: "USLAX Los Angeles Long Beach",
    },
  ],
  sizeTypes: [
    {
      value: "20GP",
      label: "20GP",
      searchText: "20 GP 20GP",
    },
    {
      value: "40HC",
      label: "40HC",
      searchText: "40 HC 40HC",
    },
  ],
  conditions: [
    {
      value: "CW",
      label: "CW",
      searchText: "CW",
    },
  ],
  colors: [
    { value: "RAL1001", label: "RAL1001", searchText: "RAL1001" },
    { value: "RAL5002", label: "RAL5002", searchText: "RAL5002" },
  ],
  statuses: ["DRAFT", "SUBMITTED", "IN_PRODUCTION", "RELEASED", "COMPLETED", "CANCELLED"] as const,
};

describe("PurchaseOrdersDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
    purchaseActions.getPurchaseOrders.mockImplementation(
      async (params: {
        sortBy?: string;
        sortDirection?: string;
        page?: number;
        vendorId?: string;
        locationCityId?: string;
        color?: string;
        sizeType?: string;
        conditionId?: string;
        orderDateFrom?: string;
        orderDateTo?: string;
        orderStatus?: string;
        quickFilter?: string;
      }) =>
        purchaseResult({
          page: params.page ?? 1,
          filters: {
            vendorId: params.vendorId ?? "",
            locationCityId: params.locationCityId ?? "",
            color: params.color ?? "",
            sizeType: params.sizeType ?? "",
            conditionId: params.conditionId ?? "",
            orderDateFrom: params.orderDateFrom ?? "",
            orderDateTo: params.orderDateTo ?? "",
            orderStatus: params.orderStatus ?? "",
            quickFilter: (params.quickFilter ?? "") as "" | "today" | "last7" | "last30" | "thisMonth" | "lastMonth",
          },
          sort: {
            sortBy: (params.sortBy ?? "activityAt") as
              | "activityAt"
              | "orderDate"
              | "orderNo"
              | "status"
              | "vendor"
              | "location"
              | "sizeType"
              | "condition"
              | "color"
              | "plannedQty"
              | "availableQty"
              | "remainingQty"
              | "cancelledQty"
              | "prepaidBalance",
            sortDirection: (params.sortDirection ?? "desc") as "asc" | "desc",
          },
        })
    );
    purchaseActions.exportPurchaseOrders.mockResolvedValue(purchaseResult().rows);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fills visible date fields when applying a quick filter without collapsing filters", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: "Today" }));

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          quickFilter: "today",
          orderDateFrom: expect.any(String),
          orderDateTo: expect.any(String),
        })
      )
    );
    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByText("Quick Filter")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Last 30 Days" })).toBeInTheDocument();
  });

  it("toggles off the active quick filter and clears only the date filters", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult({
          filters: {
            vendorId: "VENDOR1",
            locationCityId: "",
            color: "",
            sizeType: "",
            conditionId: "",
            orderDateFrom: "",
            orderDateTo: "",
            orderStatus: "",
            quickFilter: "",
          },
        })}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const todayButton = screen.getByRole("button", { name: "Today" });

    await user.click(todayButton);

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vendorId: "VENDOR1",
          quickFilter: "today",
          orderDateFrom: expect.any(String),
          orderDateTo: expect.any(String),
        })
      )
    );

    await user.click(todayButton);

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vendorId: "VENDOR1",
          quickFilter: "",
          orderDateFrom: "",
          orderDateTo: "",
        })
      )
    );

    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("submits search from the keyboard when pressing Enter inside a filter field", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const fromInput = document.querySelector('input[name="orderDateFrom"]') as HTMLInputElement;
    await user.click(fromInput);
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
        })
      )
    );
  });

  it("submits search when pressing Enter in Order Date To and PO Status", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const toInput = document.querySelector('input[name="orderDateTo"]') as HTMLInputElement;
    await user.type(toInput, "2026-04-30");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          orderDateTo: "2026-04-30",
        })
      )
    );

    await user.click(screen.getByRole("button", { name: /Search Filters/i }));

    vi.clearAllMocks();
    purchaseActions.getPurchaseOrders.mockImplementation(
      async (params: {
        sortBy?: string;
        sortDirection?: string;
        page?: number;
        vendorId?: string;
        locationCityId?: string;
        color?: string;
        sizeType?: string;
        conditionId?: string;
        orderDateFrom?: string;
        orderDateTo?: string;
        orderStatus?: string;
        quickFilter?: string;
      }) =>
        purchaseResult({
          page: params.page ?? 1,
          filters: {
            vendorId: params.vendorId ?? "",
            locationCityId: params.locationCityId ?? "",
            color: params.color ?? "",
            sizeType: params.sizeType ?? "",
            conditionId: params.conditionId ?? "",
            orderDateFrom: params.orderDateFrom ?? "",
            orderDateTo: params.orderDateTo ?? "",
            orderStatus: params.orderStatus ?? "",
            quickFilter: (params.quickFilter ?? "") as "" | "today" | "last7" | "last30" | "thisMonth" | "lastMonth",
          },
          sort: {
            sortBy: (params.sortBy ?? "activityAt") as
              | "activityAt"
              | "orderDate"
              | "orderNo"
              | "status"
              | "vendor"
              | "location"
              | "sizeType"
              | "condition"
              | "color"
              | "plannedQty"
              | "availableQty"
              | "remainingQty"
              | "cancelledQty"
              | "prepaidBalance",
            sortDirection: (params.sortDirection ?? "desc") as "asc" | "desc",
          },
        })
    );

    const statusTrigger = screen.getByText("All statuses").closest("button");
    expect(statusTrigger).toBeTruthy();
    await user.click(statusTrigger!);
    await user.click(screen.getByRole("button", { name: "RELEASED" }));
    const orderStatusInput = document.querySelector('input[name="orderStatus"]') as HTMLInputElement;
    expect(orderStatusInput.value).toBe("RELEASED");
    const confirmedTrigger = orderStatusInput.nextElementSibling as HTMLButtonElement | null;
    expect(confirmedTrigger).toBeTruthy();
    confirmedTrigger!.focus();
    fireEvent.keyDown(confirmedTrigger!, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          orderStatus: "RELEASED",
        })
      )
    );
  });

  it("collapses the search area after search and reopens from the header toggle", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByPlaceholderText("Vendor code or name")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() => expect(purchaseActions.getPurchaseOrders).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );
    expect(screen.queryByPlaceholderText("Vendor code or name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Search Filters/i }));

    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByPlaceholderText("Vendor code or name")).toBeInTheDocument();
  });

  it("shows a compact active filter summary when collapsed after search", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult({
          filters: {
            vendorId: "VENDOR1",
            locationCityId: "ADWEN",
            color: "",
            sizeType: "20GP",
            conditionId: "",
            orderDateFrom: "",
            orderDateTo: "",
            orderStatus: "RELEASED",
            quickFilter: "last30",
          },
        })}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    expect(screen.queryByText(/Vendor: VENDOR1/)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );

    const summary = screen.getByText((content, node) => {
      return (
        node?.tagName === "DIV" &&
        content.includes("Vendor: VENDOR1") &&
        content.includes("Location: ADWEN") &&
        content.includes("Size/Type: 20GP") &&
        content.includes("Last 30 Days") &&
        content.includes("Status: RELEASED")
      );
    });

    expect(summary).toBeInTheDocument();
    expect(summary).not.toHaveTextContent("Date:");
  });

  it("shows a manual date summary when no quick filter is active", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult({
          filters: {
            vendorId: "",
            locationCityId: "",
            color: "",
            sizeType: "",
            conditionId: "",
            orderDateFrom: "2026-04-01",
            orderDateTo: "2026-04-30",
            orderStatus: "",
            quickFilter: "",
          },
        })}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );

    expect(
      screen.getByText((content, node) => {
        return node?.tagName === "DIV" && content.includes("Date: 2026-04-01 to 2026-04-30");
      })
    ).toBeInTheDocument();
  });

  it("keeps reset visible in the header and reset does not collapse the search area", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
        "aria-expanded",
        "false"
      )
    );

    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByPlaceholderText("Vendor code or name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Reset/i }));

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenLastCalledWith(
        expect.objectContaining({
          vendorId: "",
          locationCityId: "",
          color: "",
          sizeType: "",
          conditionId: "",
          orderDateFrom: "",
          orderDateTo: "",
          orderStatus: "",
          quickFilter: "",
          sortBy: "activityAt",
          sortDirection: "desc",
          page: 1,
          pageSize: 10,
        })
      )
    );
    expect(screen.getByRole("button", { name: /Search Filters/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByPlaceholderText("Vendor code or name")).toBeInTheDocument();
  });

  it("exposes a location sort control and requests sorted data", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: "Location" }));

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "location",
          sortDirection: "desc",
          page: 1,
        })
      )
    );
  });

  it("exposes a status sort control and requests sorted data", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: "Status" }));

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "status",
          sortDirection: "desc",
          page: 1,
        })
      )
    );
  });

  it("exports using the current applied sort", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.click(screen.getByRole("button", { name: "Location" }));
    await waitFor(() => expect(purchaseActions.getPurchaseOrders).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));

    await waitFor(() =>
      expect(purchaseActions.exportPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "location",
          sortDirection: "desc",
        })
      )
    );
    expect(anchorClick).toHaveBeenCalled();
  });

  it("renders status in its own column, keeps qty centered, prepaid balance right-aligned, and actions sticky on the right", () => {
    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const dataRow = screen.getAllByRole("row")[1];
    const cells = Array.from(dataRow.querySelectorAll("td")).map((cell) =>
      cell.textContent?.replace(/\s+/g, " ").trim() ?? ""
    );

    expect(cells).toEqual([
      "2026-04-10",
      "PO-001",
      "Vendor One",
      "SHA",
      "20DV",
      "CW",
      "RAL1001",
      "2",
      "1",
      "1",
      "0",
      "1200.00",
      "RELEASED",
      "ViewEdit",
    ]);

    const prepaidBalanceCell = dataRow.querySelectorAll("td")[11];
    expect(prepaidBalanceCell).toHaveClass("text-right");
    expect(dataRow.querySelectorAll("td")[0]).not.toHaveClass("sticky");
    expect(dataRow.querySelectorAll("td")[1]).not.toHaveClass("sticky");
    expect(dataRow.querySelectorAll("td")[7]).toHaveClass("text-center");
    expect(dataRow.querySelectorAll("td")[8]).toHaveClass("text-center");
    expect(dataRow.querySelectorAll("td")[9]).toHaveClass("text-center");
    expect(dataRow.querySelectorAll("td")[10]).toHaveClass("text-center");
    expect(dataRow.querySelectorAll("td")[13]).toHaveClass("sticky", "right-0", "border-l", "bg-card");
    expect(within(dataRow).getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/purchase/po-management/po-1/edit"
    );

    const headCells = screen.getAllByRole("columnheader");
    expect(headCells.at(-1)).toHaveClass("sticky", "right-0", "border-l", "bg-card");
  });

  it("shows matching location options and allows keyboard selection", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    const locationInput = screen.getByRole("combobox", { name: "Location" });
    await user.type(locationInput, "a");

    expect(screen.getByRole("option", { name: /ADWEN/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /USLAX/i })).toBeInTheDocument();

    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(locationInput).toHaveValue("ADWEN")
    );
  });

  it("requires selecting an autocomplete option before search uses that filter", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.type(screen.getByRole("combobox", { name: "Location" }), "a");
    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          locationCityId: "",
        })
      )
    );
  });

  it("submits selected autocomplete filters and exposes RAL color options", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrdersDashboard
        initial={purchaseResult()}
        pageSize={10}
        filterOptions={filterOptions}
      />
    );

    await user.type(screen.getByRole("combobox", { name: "Vendor" }), "ven");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByRole("combobox", { name: "Location" }), "a");
    await user.keyboard("{Enter}");
    await user.type(screen.getByRole("combobox", { name: "Size/Type" }), "gp");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByRole("combobox", { name: "Condition" }), "cw");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.type(screen.getByRole("combobox", { name: "Color" }), "ral5");

    expect(screen.getByRole("option", { name: /RAL5002/i })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getAllByRole("button", { name: /^Search$/i })[0]);

    await waitFor(() =>
      expect(purchaseActions.getPurchaseOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: "VENDOR1",
          locationCityId: "ADWEN",
          sizeType: "20GP",
          conditionId: "CW",
          color: "RAL5002",
        })
      )
    );
  });
});
