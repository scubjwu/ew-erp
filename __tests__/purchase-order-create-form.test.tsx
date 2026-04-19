import React, { createContext, useContext, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const { purchaseActions, toast, routerPush } = vi.hoisted(() => ({
  purchaseActions: {
    createPurchaseOrderDraft: vi.fn(),
    createPurchaseOrderSubmit: vi.fn(),
    updatePurchaseOrderDraft: vi.fn(),
    submitPurchaseOrderDraftUpdate: vi.fn(),
    updatePurchaseOrderPending: vi.fn(),
    submitPurchaseOrderPending: vi.fn(),
  },
  toast: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    Plus: Icon,
    Trash2: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/app/purchase/po-management/actions", async () => {
  const actual = await vi.importActual<typeof import("@/app/purchase/po-management/actions")>(
    "@/app/purchase/po-management/actions"
  );
  return {
    ...actual,
    createPurchaseOrderDraft: purchaseActions.createPurchaseOrderDraft,
    createPurchaseOrderSubmit: purchaseActions.createPurchaseOrderSubmit,
    updatePurchaseOrderDraft: purchaseActions.updatePurchaseOrderDraft,
    submitPurchaseOrderDraftUpdate: purchaseActions.submitPurchaseOrderDraftUpdate,
    updatePurchaseOrderPending: purchaseActions.updatePurchaseOrderPending,
    submitPurchaseOrderPending: purchaseActions.submitPurchaseOrderPending,
  };
});

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

import { PurchaseOrderCreateForm } from "@/components/purchase/purchase-order-create-form";
import { getPurchaseOrderEditPermissions } from "@/types/purchase";

const options = {
  suppliers: [
    {
      id: "vendor-1",
      value: "vendor-1",
      label: "S09298 · Reset Safe Vendor Alias",
      secondaryLabel: "Reset Safe Vendor",
      searchText: "S09298 Reset Safe Vendor Alias",
      vendorCode: "S09298",
      vendorName: "Reset Safe Vendor Alias",
      settlementPaymentTerm: "Net 30",
      settlementCreditDays: 30,
      settlementCreditLimit: 250000,
      settlementAdvancePaymentPercentage: 15,
      settlementBalanceTriggerEvent: "After Gate Out",
      settlementCurrency: "USD",
      settlementPrepaymentPool: true,
      settlementPrepaymentThreshold: 50000,
      settlementCurrentPrepaidBalance: 120000,
      vendorBankInformation: {
        bank_name: "Test Bank",
        bank_code: "TB001",
        bank_account_name: "Reset Safe Vendor Alias",
        bank_account_number: "1234567890",
        swift_code: "TESTUS00",
      },
    },
  ],
  owners: [
    {
      id: "owner-1",
      label: "O09298 · Reset Safe Owner",
      usesInternalContainerNumbering: false,
    },
  ],
  buyers: [{ id: "buyer-1", label: "SP0001 · Buyer One" }],
  locations: [{ id: "city-1", code: "ADWEN", name: "Wien" }],
  depots: [{ id: "depot-1", code: "DP01", name: "Main Depot", cityId: "city-1" }],
  sizeCodes: [{ id: "size-1", code: "20" }],
  typeCodes: [{ id: "type-1", code: "GP" }],
  conditions: [
    { id: "condition-brand-new", code: "Brand New" },
    { id: "condition-cw", code: "CW" },
  ],
  colors: ["RAL5002", "RAL1000"],
  materialVendors: [
    {
      id: "mv-1",
      vendorCode: "MV001",
      vendorName: "Paint Default",
      materialCategory: "油漆",
      isDefaultVendor: true,
    },
    {
      id: "mv-2",
      vendorCode: "MV002",
      vendorName: "Paint Alt",
      materialCategory: "油漆",
      isDefaultVendor: false,
    },
  ],
  existingOrderNumbers: ["PO-RES04041", "PO-RES04042"],
};

const optionsWithEligibleOwner = {
  ...options,
  owners: options.owners.map((owner) => ({
    ...owner,
    usesInternalContainerNumbering: true,
  })),
};

const initialSubmittedOrder = {
  id: "po-edit-1",
  orderNo: "PORES04051",
  purchaseType: "USED_CONTAINER",
  supplierId: "vendor-1",
  ownerId: "owner-1",
  buyerId: "buyer-1",
  purchaseDate: "2026-04-05",
  estimatedOfflineTime: null,
  contractNumber: null,
  invoiceNumber: null,
  freeday: null,
  vendorReleaseDate: "2026-04-20",
  remark: null,
  exchangeRate: 1,
  orderStatus: "SUBMITTED",
  inboundStatus: "NOT_STARTED",
  paymentMode: "PREPAYMENT",
  paymentAccount: null,
  dueDate: null,
  totalPlannedQty: 1,
  totalReceivedQty: 0,
  totalAvailableQty: 0,
  grandTotal: 100,
  totalAmountPaid: 0,
  totalAmountUnpaid: 100,
  settlementPaymentTerm: "Net 30",
  settlementCreditDays: 30,
  settlementCreditLimit: 250000,
  settlementAdvancePaymentPercentage: null,
  settlementBalanceTriggerEvent: "After Gate Out",
  settlementCurrency: "USD",
  settlementPrepaymentPool: true,
  settlementPrepaymentThreshold: 50000,
  settlementCurrentPrepaidBalance: 120000,
  vendorBankInformation: {
    bank_name: "Test Bank",
    bank_code: "TB001",
    bank_account_name: "Reset Safe Vendor Alias",
    bank_account_number: "1234567890",
    swift_code: "TESTUS00",
  },
  createdAt: "2026-04-05T00:00:00.000Z",
  updatedAt: "2026-04-05T00:00:00.000Z",
  supplier: { id: "vendor-1", vendor_code: "S09298", company_name: null, legal_company_name: "Reset Safe Vendor Alias" },
  owner: {
    id: "owner-1",
    container_owner_code: "O09298",
    company_name: null,
    legal_company_name: "Reset Safe Owner",
    uses_internal_container_numbering: false,
  },
  buyer: { id: "buyer-1", user_code: "SP0001", full_name: "Buyer One" },
  items: [
    {
      id: "item-1",
      purchaseOrderId: "po-edit-1",
      lineNo: 1,
      locationCityId: "city-1",
      depotId: "depot-1",
      containerSizeCodeId: "size-1",
      containerTypeCodeId: "type-1",
      containerConditionCodeId: "condition-cw",
      color: "RAL5002",
      flp: false,
      lbx: false,
      lockingBarsCount: null,
      ventsCount: 1,
      machineType: null,
      yom: 2026,
      estimatedOfflineDate: null,
      offlineDate: null,
      vendorReleaseNumber: null,
      tareWeight: 2200,
      maximumWeight: 30480,
      payloadWeight: 28280,
      cscNumber: "CSC-ITEM-1",
      plannedQty: 1,
      unitPrice: 100,
      financialCost: null,
      settlementPrice: 100,
      lineAmount: 100,
      remark: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
      location: { id: "city-1", city_code: "ADWEN", city_name: "Wien" },
      depot: { id: "depot-1", depot_code: "DP01", depot_name: "Main Depot" },
      size: { id: "size-1", size_code: "20", size_name: "20" },
      type: { id: "type-1", type_code: "GP", type_description: "GP" },
      condition: { id: "condition-cw", condition_code: "CW", condition_name: "Cargo Worthy" },
      cancelledQty: 0,
      remainingQty: 1,
    },
  ],
  containers: [
    {
      id: "container-1",
      purchaseOrderId: "po-edit-1",
      purchaseOrderItemId: "item-1",
      containerNumber: null,
      locationCityId: "city-1",
      depotId: "depot-1",
      containerSizeCodeId: "size-1",
      containerTypeCodeId: "type-1",
      containerConditionCodeId: "condition-cw",
      color: "RAL5002",
      flp: false,
      lbx: false,
      lockingBarsCount: null,
      ventsCount: 1,
      machineType: null,
      yom: 2026,
      estimatedOfflineDate: "2026-04-18",
      offlineDate: "2026-04-20",
      vendorReleaseNumber: "VRN-ITEM-2",
      tareWeight: 2350,
      maximumWeight: 30480,
      payloadWeight: 28130,
      cscNumber: "CSC-CONTAINER-1",
      purchasePrice: 100,
      financialCost: null,
      containerStatus: "PURCHASED",
      remark: null,
      createdAt: "2026-04-05T00:00:00.000Z",
      updatedAt: "2026-04-05T00:00:00.000Z",
      location: { id: "city-1", city_code: "ADWEN", city_name: "Wien" },
      depot: { id: "depot-1", depot_code: "DP01", depot_name: "Main Depot" },
      size: { id: "size-1", size_code: "20", size_name: "20" },
      type: { id: "type-1", type_code: "GP", type_description: "GP" },
      condition: { id: "condition-cw", condition_code: "CW", condition_name: "Cargo Worthy" },
    },
  ],
  materialTypes: [],
  financeRecord: null,
} as any;

describe("PurchaseOrderCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders factory-order defaults and toggles purchase-type fields", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    expect(screen.getByText(String(new Date().getFullYear()))).toBeInTheDocument();
    expect(screen.getAllByText("3 Locking Bars")).not.toHaveLength(0);
    expect(screen.getAllByText("FLP")).not.toHaveLength(0);
    expect(screen.getAllByText("LBX")).not.toHaveLength(0);
    expect(screen.getByText("Material Vendors")).toBeInTheDocument();
    expect(screen.getAllByText("Estimated Offline Date")).not.toHaveLength(0);
    expect(screen.queryByText("Freeday")).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("油漆")).not.toHaveLength(0);
    expect(screen.getAllByDisplayValue("密封胶")).not.toHaveLength(0);
    expect(screen.getAllByDisplayValue("胶条")).not.toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: /Factory Order/i })[0]);
    await user.click(screen.getByRole("button", { name: "Used Container" }));

    expect(screen.queryByText("Material Vendors")).not.toBeInTheDocument();
    expect(screen.queryByText("Estimated Offline Date")).not.toBeInTheDocument();
    expect(screen.queryByText("Contract Number")).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice Number")).not.toBeInTheDocument();
    expect(screen.getByText("Freeday")).toBeInTheDocument();
    expect(screen.getAllByText("Vendor Release Number")).not.toHaveLength(0);
  });

  it("shows payment-mode-specific finance fields", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    expect(screen.getAllByText("Payment Mode")).not.toHaveLength(0);
    expect(screen.getByText("Settlement Payment Term")).toBeInTheDocument();
    expect(screen.getByText("Settlement Currency")).toBeInTheDocument();
    expect(screen.getByText("Balance Trigger Event")).toBeInTheDocument();
    expect(screen.getByText("Prepayment Pool")).toBeInTheDocument();
    expect(screen.getByText("Prepayment Threshold")).toBeInTheDocument();
    expect(screen.getByText("Current Prepaid Balance")).toBeInTheDocument();
    expect(screen.queryByText("Advance Payment Percentage")).not.toBeInTheDocument();
    expect(screen.queryByText("Credit Days")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Prepayment/i })[0]);
    await user.click(screen.getByRole("button", { name: "Advance Payment" }));
    expect(screen.getByText("Advance Payment Percentage")).toBeInTheDocument();
    expect(screen.getByText("Prepayment Pool")).toBeInTheDocument();
    expect(screen.getByText("Prepayment Threshold")).toBeInTheDocument();
    expect(screen.getByText("Current Prepaid Balance")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Advance Payment/i })[0]);
    await user.click(screen.getByRole("button", { name: "Credit" }));
    expect(screen.getByText("Settlement Payment Term")).toBeInTheDocument();
    expect(screen.getByText("Credit Days")).toBeInTheDocument();
    expect(screen.getByText("Credit Limit")).toBeInTheDocument();
    expect(screen.getByText("Balance Trigger Event")).toBeInTheDocument();
    expect(screen.queryByText("Advance Payment Percentage")).not.toBeInTheDocument();
    expect(screen.queryByText("Prepayment Threshold")).not.toBeInTheDocument();
  });

  it("supports supplier autocomplete and draft save", async () => {
    const user = userEvent.setup();
    purchaseActions.createPurchaseOrderDraft.mockResolvedValue({
      orderId: "po-1",
      orderNo: "PORES04051",
    });

    render(<PurchaseOrderCreateForm options={options} />);

    const supplierInput = screen.getByRole("combobox", { name: "Supplier" });
    await user.type(supplierInput, "S09");
    expect(screen.getByRole("option", { name: /S09298/i })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByDisplayValue("Test Bank")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TB001")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Net 30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
    expect(screen.getByDisplayValue("After Gate Out")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Prepayment/i })[0]);
    await user.click(screen.getByRole("button", { name: "Credit" }));
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByDisplayValue("250000")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /Factory Order/i })[0]);
    await user.click(screen.getByRole("button", { name: "Used Container" }));

    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));
    await user.click(screen.getByRole("button", { name: /Unassigned/i }));
    await user.click(screen.getByRole("button", { name: /SP0001/i }));

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    expect(firstDataRow).toBeTruthy();
    const cells = within(firstDataRow!).getAllByRole("cell");

    await user.click(within(cells[0]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[0]).getByRole("combobox"), {
      target: { value: "AD" },
    });
    await user.click(screen.getByRole("option", { name: "ADWEN · Wien" }));

    await user.click(within(cells[1]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[1]).getByRole("combobox"), {
      target: { value: "DP" },
    });
    await user.click(screen.getByRole("option", { name: "DP01 · Main Depot" }));

    await user.click(within(cells[2]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[2]).getByRole("combobox"), {
      target: { value: "20" },
    });
    await user.click(screen.getByRole("option", { name: "20GP" }));

    await user.click(within(cells[11]).getByRole("button", { name: "-" }));
    await user.type(within(cells[11]).getByRole("spinbutton"), "2200{Enter}");

    await user.click(within(cells[12]).getByRole("button", { name: "-" }));
    await user.type(within(cells[12]).getByRole("spinbutton"), "30480{Enter}");

    await user.click(within(cells[14]).getByRole("button", { name: "-" }));
    await user.type(within(cells[14]).getByRole("textbox"), "CSC-ITEM-DRAFT{Enter}");

    await user.click(within(cells[15]).getByRole("button", { name: "0" }));
    await user.type(within(cells[15]).getByRole("spinbutton"), "2{Enter}");

    await user.click(within(cells[16]).getByRole("button", { name: "-" }));
    await user.type(within(cells[16]).getByRole("spinbutton"), "100{Enter}");

    await user.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(purchaseActions.createPurchaseOrderDraft).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith("/purchase/po-management/po-1");
      expect(purchaseActions.createPurchaseOrderDraft.mock.calls[0][0].orderNo).toMatch(
        /^PORES\d{5}$/
      );
    });
    const payload = purchaseActions.createPurchaseOrderDraft.mock.calls[0][0];
    expect(payload.items[0].tareWeight).toBe(2200);
    expect(payload.items[0].maximumWeight).toBe(30480);
    expect(payload.items[0].cscNumber).toBe("CSC-ITEM-DRAFT");
  });

  it("uses click-to-edit lookup cells and compact FLP/LBX options", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    const locationHeader = screen.getByText("Location");
    const actionsHeader = screen.getByText("Actions");
    expect(locationHeader.className).toContain("text-muted-foreground");
    expect(actionsHeader.className).toContain("sticky");
    expect(actionsHeader.className).toContain("right-0");
    expect(actionsHeader.className).toContain("text-muted-foreground");

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    expect(firstDataRow).toBeTruthy();
    const locationCell = within(firstDataRow!).getAllByRole("cell")[0];
    const actionsCell = within(firstDataRow!).getAllByRole("cell").at(-1);
    expect(actionsCell?.className).toContain("sticky");
    expect(actionsCell?.className).toContain("right-0");

    await user.click(within(locationCell).getByRole("button", { name: "-" }));
    const locationEditor = within(locationCell).getByRole("combobox");
    fireEvent.change(locationEditor, { target: { value: "AD" } });
    expect(screen.getByRole("option", { name: "ADWEN · Wien" })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}{Enter}");

    const ventsCell = within(firstDataRow).getAllByRole("cell")[8];
    await user.click(within(ventsCell).getByRole("button", { name: "-" }));
    const ventsEditor = within(ventsCell).getByRole("spinbutton");
    expect(ventsEditor.className).toContain("[appearance:textfield]");

    expect(screen.getAllByRole("button", { name: "FLP" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "LBX" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "-" }).length).toBeGreaterThan(0);
  });

  it("allows saving a draft without submit-only required fields", async () => {
    const user = userEvent.setup();
    purchaseActions.createPurchaseOrderDraft.mockResolvedValue({
      orderId: "po-draft",
      orderNo: "PO___00001",
    });
    render(<PurchaseOrderCreateForm options={options} />);

    await user.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(purchaseActions.createPurchaseOrderDraft).toHaveBeenCalledTimes(1);
    });
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Draft saved",
      })
    );
  });

  it("does not save a draft when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    await user.click(screen.getByRole("link", { name: /Cancel/i }));

    expect(purchaseActions.createPurchaseOrderDraft).not.toHaveBeenCalled();
  });

  it("rejects invalid manual container numbers", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    const supplierInput = screen.getByRole("combobox", { name: "Supplier" });
    await user.type(supplierInput, "S09");
    await user.keyboard("{ArrowDown}{Enter}");

    await user.click(screen.getAllByRole("button", { name: /Factory Order/i })[0]);
    await user.click(screen.getByRole("button", { name: "Used Container" }));
    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));
    await user.click(screen.getByRole("button", { name: /Unassigned/i }));
    await user.click(screen.getByRole("button", { name: /SP0001/i }));

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    const cells = within(firstDataRow!).getAllByRole("cell");

    await user.click(within(cells[15]).getByRole("button", { name: "0" }));
    await user.type(within(cells[15]).getByRole("spinbutton"), "1{Enter}");

    await user.click(within(cells.at(-1)!).getByRole("button", { name: /Edit Containers/i }));
    const containerNumberInput = screen.getByPlaceholderText("ABCD1234567");
    await user.type(containerNumberInput, "bad123");
    await user.click(screen.getByRole("button", { name: /Save Draft/i }));

    expect(purchaseActions.createPurchaseOrderDraft).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description: "Container Number must match 4 letters followed by 7 digits.",
      })
    );
  });

  it("keeps factory container numbers auto-generated for eligible owners", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={optionsWithEligibleOwner} />);

    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));

    expect(
      screen.getByText("Container numbers will be auto-generated on Submit for this owner.")
    ).toBeInTheDocument();

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    const cells = within(firstDataRow!).getAllByRole("cell");

    expect(within(cells[15]).getByText("-")).toBeInTheDocument();
    await user.click(within(cells[17]).getByRole("button", { name: "0" }));
    await user.type(within(cells[17]).getByRole("spinbutton"), "1{Enter}");
    await user.click(within(cells.at(-1)!).getByRole("button", { name: /Edit Containers/i }));

    expect(screen.getByText("Auto-generated")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("ABCD1234567")).not.toBeInTheDocument();
  });

  it("requires manual container numbers for factory orders when the owner is not eligible", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));

    expect(
      screen.getByText("This owner uses manual container numbering. Enter container numbers before Submit.")
    ).toBeInTheDocument();

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    const cells = within(firstDataRow!).getAllByRole("cell");

    expect(within(cells[15]).getByText("-")).toBeInTheDocument();
    await user.click(within(cells[17]).getByRole("button", { name: "0" }));
    await user.type(within(cells[17]).getByRole("spinbutton"), "1{Enter}");
    await user.click(within(cells.at(-1)!).getByRole("button", { name: /Edit Containers/i }));

    expect(screen.getByPlaceholderText("ABCD1234567")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Submit Order/i }));

    expect(purchaseActions.createPurchaseOrderSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
        description:
          "Container Number is required for factory orders when the owner uses manual numbering.",
      })
    );
  });

  it("submits with generated container payload and redirects to detail", async () => {
    const user = userEvent.setup();
    purchaseActions.createPurchaseOrderSubmit.mockResolvedValue({
      orderId: "po-submit",
      orderNo: "PORES04051",
      orderStatus: "SUBMITTED",
    });

    render(<PurchaseOrderCreateForm options={options} />);

    const supplierInput = screen.getByRole("combobox", { name: "Supplier" });
    await user.type(supplierInput, "S09");
    await user.keyboard("{ArrowDown}{Enter}");

    await user.click(screen.getAllByRole("button", { name: /Factory Order/i })[0]);
    await user.click(screen.getByRole("button", { name: "Used Container" }));
    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));
    await user.click(screen.getByRole("button", { name: /Unassigned/i }));
    await user.click(screen.getByRole("button", { name: /SP0001/i }));

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    const cells = within(firstDataRow!).getAllByRole("cell");

    await user.click(within(cells[0]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[0]).getByRole("combobox"), {
      target: { value: "AD" },
    });
    await user.click(screen.getByRole("option", { name: "ADWEN · Wien" }));

    await user.click(within(cells[1]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[1]).getByRole("combobox"), {
      target: { value: "DP" },
    });
    await user.click(screen.getByRole("option", { name: "DP01 · Main Depot" }));

    await user.click(within(cells[2]).getByRole("button", { name: "-" }));
    fireEvent.change(within(cells[2]).getByRole("combobox"), {
      target: { value: "20" },
    });
    await user.click(screen.getByRole("option", { name: "20GP" }));

    await user.click(within(cells[11]).getByRole("button", { name: "-" }));
    await user.type(within(cells[11]).getByRole("spinbutton"), "2200{Enter}");

    await user.click(within(cells[12]).getByRole("button", { name: "-" }));
    await user.type(within(cells[12]).getByRole("spinbutton"), "30480{Enter}");

    await user.click(within(cells[14]).getByRole("button", { name: "-" }));
    await user.type(within(cells[14]).getByRole("textbox"), "CSC-ITEM-SUBMIT{Enter}");

    await user.click(within(cells[15]).getByRole("button", { name: "0" }));
    await user.type(within(cells[15]).getByRole("spinbutton"), "2{Enter}");

    await user.click(within(cells[16]).getByRole("button", { name: "-" }));
    await user.type(within(cells[16]).getByRole("spinbutton"), "100{Enter}");

    await user.click(screen.getByRole("button", { name: /Submit Order/i }));

    await waitFor(() => {
      expect(purchaseActions.createPurchaseOrderSubmit).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith("/purchase/po-management/po-submit");
    });

    const payload = purchaseActions.createPurchaseOrderSubmit.mock.calls[0][0];
    expect(payload.items[0].itemKey).toBeTruthy();
    expect(payload.items[0].tareWeight).toBe(2200);
    expect(payload.items[0].maximumWeight).toBe(30480);
    expect(payload.items[0].cscNumber).toBe("CSC-ITEM-SUBMIT");
    expect(payload.containers).toHaveLength(2);
    expect(payload.containers[0].itemKey).toBe(payload.items[0].itemKey);
    expect(payload.containers[0]).not.toHaveProperty("payloadWeight");
  });

  it("allows submitted edit mode to change fields and submit changes", async () => {
    const user = userEvent.setup();
    purchaseActions.submitPurchaseOrderPending.mockResolvedValue({
      orderId: "po-edit-1",
      orderNo: "PORES04051",
      orderStatus: "SUBMITTED",
    });

    render(
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={initialSubmittedOrder}
        mode="edit"
        editPermissions={getPurchaseOrderEditPermissions(
          initialSubmittedOrder.purchaseType,
          initialSubmittedOrder.orderStatus
        )}
      />
    );

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    expect(firstDataRow).toBeTruthy();
    const cells = within(firstDataRow!).getAllByRole("cell");
    expect(screen.getByText("Cancel Qty")).toBeInTheDocument();

    await user.click(within(cells[2]).getByRole("button", { name: "20GP" }));
    fireEvent.change(within(cells[2]).getByRole("combobox"), {
      target: { value: "20" },
    });
    await user.click(screen.getByRole("option", { name: "20GP" }));

    await user.click(within(cells[4]).getByRole("button", { name: "RAL5002" }));
    fireEvent.change(within(cells[4]).getByRole("combobox"), {
      target: { value: "RAL1" },
    });
    await user.click(screen.getByRole("option", { name: "RAL1000" }));

    await user.click(within(cells[8]).getByRole("button", { name: "1" }));
    await user.clear(within(cells[8]).getByRole("spinbutton"));
    await user.type(within(cells[8]).getByRole("spinbutton"), "3{Enter}");

    await user.click(within(cells[11]).getByRole("button", { name: "2,200.00" }));
    await user.clear(within(cells[11]).getByRole("spinbutton"));
    await user.type(within(cells[11]).getByRole("spinbutton"), "2400{Enter}");

    await user.click(within(cells[12]).getByRole("button", { name: "30,480.00" }));
    await user.clear(within(cells[12]).getByRole("spinbutton"));
    await user.type(within(cells[12]).getByRole("spinbutton"), "30400{Enter}");

    await user.click(within(cells[14]).getByRole("button", { name: "CSC-ITEM-1" }));
    await user.clear(within(cells[14]).getByRole("textbox"));
    await user.type(within(cells[14]).getByRole("textbox"), "CSC-ITEM-UPDATED{Enter}");

    await user.click(within(cells[15]).getByRole("button", { name: "1" }));
    await user.clear(within(cells[15]).getByRole("spinbutton"));
    await user.type(within(cells[15]).getByRole("spinbutton"), "2{Enter}");

    await user.click(within(cells[18]).getByRole("spinbutton"));
    await user.clear(within(cells[18]).getByRole("spinbutton"));
    await user.type(within(cells[18]).getByRole("spinbutton"), "1");

    await user.click(within(cells[21]).getByRole("button", { name: "-" }));
    await user.clear(within(cells[21]).getByRole("textbox"));
    await user.type(within(cells[21]).getByRole("textbox"), "VRN-ITEM-UPDATED{Enter}");

    await user.click(within(cells[22]).getByRole("button", { name: "-" }));
    const offlineDateInput = cells[22]?.querySelector("input");
    expect(offlineDateInput).toBeTruthy();
    await user.type(offlineDateInput as HTMLInputElement, "2026-05-01{Enter}");

    expect(screen.queryByRole("button", { name: /Save Changes/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Submit Order/i }));

    await waitFor(() => {
      expect(purchaseActions.submitPurchaseOrderPending).toHaveBeenCalledTimes(1);
    });

    const payload = purchaseActions.submitPurchaseOrderPending.mock.calls[0][1];
    expect(payload.items[0].color).toBe("RAL1000");
    expect(payload.items[0].ventsCount).toBe(3);
    expect(payload.items[0].tareWeight).toBe(2400);
    expect(payload.items[0].maximumWeight).toBe(30400);
    expect(payload.items[0].cscNumber).toBe("CSC-ITEM-UPDATED");
    expect(payload.items[0].plannedQty).toBe(2);
    expect(payload.items[0].cancelQty).toBe(1);
    expect(payload.items[0].vendorReleaseNumber).toBe("VRN-ITEM-UPDATED");
    expect(payload.items[0].offlineDate).toBe("2026-05-01");
    expect(payload.containers[0].offlineDate).toBe("2026-05-01");
  });

  it("shows uncancelled totals in edit mode footer", () => {
    render(
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={{
          ...initialSubmittedOrder,
          items: [
            {
              ...initialSubmittedOrder.items[0],
              plannedQty: 20,
              unitPrice: 600,
              lineAmount: 12000,
              cancelledQty: 7,
              remainingQty: 13,
            },
          ],
        }}
        mode="edit"
        editPermissions={getPurchaseOrderEditPermissions(
          initialSubmittedOrder.purchaseType,
          initialSubmittedOrder.orderStatus
        )}
      />
    );

    expect(screen.getByText("Total Qty: 13")).toBeInTheDocument();
    expect(screen.getByText("Total Amount: 7,800.00")).toBeInTheDocument();
  });

  it("does not show cancel qty for draft edit mode", () => {
    render(
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={{
          ...initialSubmittedOrder,
          orderStatus: "DRAFT",
        }}
        mode="edit"
        editPermissions={getPurchaseOrderEditPermissions(
          initialSubmittedOrder.purchaseType,
          "DRAFT"
        )}
      />
    );

    expect(screen.queryByText("Cancel Qty")).not.toBeInTheDocument();
  });

  it("allows adding item lines when pending edit order has no existing items", async () => {
    const user = userEvent.setup();

    render(
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={{
          ...initialSubmittedOrder,
          items: [],
          containers: [],
        }}
        mode="edit"
        editPermissions={getPurchaseOrderEditPermissions(
          initialSubmittedOrder.purchaseType,
          initialSubmittedOrder.orderStatus
        )}
      />
    );

    const addLineButton = screen.getByRole("button", { name: /Add Line/i });
    expect(addLineButton).not.toBeDisabled();

    await user.click(addLineButton);

    const firstDataRow = screen
      .getAllByRole("row")
      .find((row) => within(row).queryAllByRole("cell").length >= 20);
    expect(firstDataRow).toBeTruthy();
  });

  it("keeps non-terminal edit orders unlocked for spreadsheet editing", () => {
    render(
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={initialSubmittedOrder}
        mode="edit"
        editPermissions={getPurchaseOrderEditPermissions(
          initialSubmittedOrder.purchaseType,
          initialSubmittedOrder.orderStatus
        )}
      />
    );

    expect(screen.getByRole("button", { name: /Add Line/i })).not.toBeDisabled();
  });
});
