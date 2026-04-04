import React, { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
        orderStatus: "CONFIRMED",
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
        primaryColor: "Blue",
        vendorLabel: "Vendor One",
        locationLabel: "SHA · Shanghai",
        sizeTypeLabel: "20DV",
        conditionLabel: "CW · Cargo Worthy",
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
      sortBy: "orderDate",
      sortDirection: "desc",
    },
    ...overrides,
  };
}

const filterOptions = {
  vendors: [{ id: "vendor-1", vendor_code: "SABCDE", company_name: "Vendor One", legal_company_name: null }],
  locations: [{ id: "city-1", city_code: "SHA", city_name: "Shanghai" }],
  conditions: [{ id: "condition-1", condition_code: "CW", condition_name: "Cargo Worthy" }],
  colors: [{ value: "Blue" }],
  sizeTypes: [{ value: "size-1:type-1", sizeId: "size-1", typeId: "type-1", label: "20DV" }],
  statuses: ["DRAFT", "CONFIRMED", "PARTIAL_RECEIVED", "COMPLETED", "CANCELLED"] as const,
};

describe("PurchaseOrdersDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
    purchaseActions.getPurchaseOrders.mockImplementation(
      async (params: { sortBy?: string; sortDirection?: string; page?: number }) =>
        purchaseResult({
          page: params.page ?? 1,
          sort: {
            sortBy: (params.sortBy ?? "orderDate") as
              | "orderDate"
              | "orderNo"
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

  it("fills visible date fields when applying a quick filter", async () => {
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

    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    expect(dateInputs).toHaveLength(2);
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
});
