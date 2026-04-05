import React, { createContext, useContext, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

const { purchaseActions, toast, routerPush } = vi.hoisted(() => ({
  purchaseActions: {
    createPurchaseOrderDraft: vi.fn(),
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
  owners: [{ id: "owner-1", label: "O09298 · Reset Safe Owner" }],
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

describe("PurchaseOrderCreateForm", () => {
  it("renders factory-order defaults and toggles purchase-type fields", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrderCreateForm options={options} />);

    expect(screen.getByText(String(new Date().getFullYear()))).toBeInTheDocument();
    expect(screen.getAllByText("3 Locking Bars")).not.toHaveLength(0);
    expect(screen.getAllByText("FLP")).not.toHaveLength(0);
    expect(screen.getAllByText("LBX")).not.toHaveLength(0);
    expect(screen.getByText("Material Vendors")).toBeInTheDocument();
    expect(screen.getByText("Estimated Offline Time")).toBeInTheDocument();
    expect(screen.queryByText("Freeday")).not.toBeInTheDocument();
    expect(screen.getAllByDisplayValue("油漆")).not.toHaveLength(0);
    expect(screen.getAllByDisplayValue("密封胶")).not.toHaveLength(0);
    expect(screen.getAllByDisplayValue("胶条")).not.toHaveLength(0);

    await user.click(screen.getAllByRole("button", { name: /Factory Order/i })[0]);
    await user.click(screen.getByRole("button", { name: "Used Container" }));

    expect(screen.queryByText("Material Vendors")).not.toBeInTheDocument();
    expect(screen.queryByText("Estimated Offline Time")).not.toBeInTheDocument();
    expect(screen.getByText("Freeday")).toBeInTheDocument();
    expect(screen.getByText("Vendor Release Number")).toBeInTheDocument();
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

    await user.click(screen.getByRole("button", { name: /Select owner/i }));
    await user.click(screen.getByRole("button", { name: /O09298/i }));

    await user.click(screen.getByRole("button", { name: /Save Draft/i }));

    await waitFor(() => {
      expect(purchaseActions.createPurchaseOrderDraft).toHaveBeenCalledTimes(1);
      expect(routerPush).toHaveBeenCalledWith("/purchase/po-management/po-1");
      expect(purchaseActions.createPurchaseOrderDraft.mock.calls[0][0].orderNo).toBe(
        "PORES04051"
      );
    });
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

    const firstDataRow = screen.getByRole("row", {
      name: /Brand New.*FLP.*LBX.*3 Locking Bars/i,
    });
    const locationCell = within(firstDataRow).getAllByRole("cell")[0];
    const actionsCell = within(firstDataRow).getAllByRole("cell").at(-1);
    expect(actionsCell?.className).toContain("sticky");
    expect(actionsCell?.className).toContain("right-0");

    await user.click(within(locationCell).getByRole("button", { name: "-" }));
    const locationEditor = within(locationCell).getByRole("combobox");
    fireEvent.change(locationEditor, { target: { value: "AD" } });
    expect(screen.getByRole("option", { name: "ADWEN" })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}{Enter}");

    const ventsCell = within(firstDataRow).getAllByRole("cell")[8];
    await user.click(within(ventsCell).getByRole("button", { name: "-" }));
    const ventsEditor = within(ventsCell).getByRole("spinbutton");
    expect(ventsEditor.className).toContain("[appearance:textfield]");

    expect(screen.getAllByRole("button", { name: "FLP" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "LBX" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "-" }).length).toBeGreaterThan(0);
  });
});
