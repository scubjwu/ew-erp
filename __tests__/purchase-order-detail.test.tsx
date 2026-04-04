import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: ReactNode;
    href: string;
  } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    Eye: Icon,
    Pencil: Icon,
  };
});

import { PurchaseOrderDetailView } from "@/components/purchase/purchase-order-detail";
import { PurchaseItemContainersView } from "@/components/purchase/purchase-item-containers-view";

function detailOrder(overrides?: Record<string, unknown>) {
  return {
    id: "po-1",
    orderNo: "PO-001",
    purchaseType: "FACTORY_ORDER",
    supplierId: "vendor-1",
    ownerId: "owner-1",
    buyerId: "buyer-1",
    purchaseDate: "2026-04-10",
    estimatedOfflineTime: "2026-04-12T08:00:00Z",
    contractNumber: "CT-001",
    invoiceNumber: "INV-001",
    freeday: 7,
    vendorReleaseNumber: "REL-001",
    vendorReleaseDate: "2026-04-11",
    remark: "PO remark",
    exchangeRate: 1,
    orderStatus: "CONFIRMED",
    inboundStatus: "PARTIAL",
    paymentMode: "PREPAYMENT",
    paymentAccount: "Main Account",
    dueDate: "2026-05-01",
    totalPlannedQty: 2,
    totalReceivedQty: 1,
    totalAvailableQty: 1,
    grandTotal: 4300,
    totalAmountPaid: 1000,
    totalAmountUnpaid: 3300,
    settlementPaymentTerm: "Net 30",
    settlementCreditDays: 30,
    settlementAdvancePaymentPercentage: 10,
    settlementBalanceTriggerEvent: "After Offline",
    settlementCurrency: "USD",
    settlementPrepaymentPool: true,
    settlementPrepaymentThreshold: 1000,
    settlementCurrentPrepaidBalance: 5000,
    vendorBankInformation: {
      bank_name: "Test Bank",
      bank_account_name: "EW Test",
      bank_account_number: "123456",
      swift_code: "TESTUS00",
      bank_address: "Bank Street",
      remark: "Bank remark",
    },
    createdAt: "2026-04-10T00:00:00Z",
    updatedAt: "2026-04-10T00:00:00Z",
    supplier: {
      id: "vendor-1",
      vendor_code: "SABCDE",
      company_name: "Vendor One",
      legal_company_name: null,
    },
    owner: {
      id: "owner-1",
      container_owner_code: "O12345",
      company_name: "Owner One",
      legal_company_name: null,
    },
    buyer: {
      id: "buyer-1",
      user_code: "AB1234",
      full_name: "Buyer One",
    },
    items: [
      {
        id: "item-1",
        purchaseOrderId: "po-1",
        lineNo: 1,
        locationCityId: "city-1",
        depotId: "depot-1",
        containerSizeCodeId: "size-1",
        containerTypeCodeId: "type-1",
        containerConditionCodeId: "condition-1",
        color: "Blue",
        flp: false,
        lbx: true,
        lockingBarsCount: 4,
        ventsCount: 2,
        machineType: "Carrier PrimeLINE",
        yom: 2026,
        offlineDate: "2026-04-10",
        plannedQty: 2,
        unitPrice: 2000,
        financialCost: 150,
        settlementPrice: 2150,
        lineAmount: 4300,
        remark: "Item remark",
        createdAt: "2026-04-10T00:00:00Z",
        updatedAt: "2026-04-10T00:00:00Z",
        location: { id: "city-1", city_code: "SHA", city_name: "Shanghai" },
        depot: { id: "depot-1", depot_code: "DP01", depot_name: "Main Depot" },
        size: { id: "size-1", size_code: "20", size_name: "20ft" },
        type: { id: "type-1", type_code: "DV", type_description: "Dry Van" },
        condition: { id: "condition-1", condition_code: "CW", condition_name: "Cargo Worthy" },
      },
    ],
    containers: [],
    materialTypes: [
      {
        id: "mt-1",
        purchaseOrderId: "po-1",
        materialType: "地板",
        materialVendorId: "mv-1",
        materialVendorNameSnapshot: "Material Vendor",
        materialVendorCodeSnapshot: "MV0001",
        materialVendor: null,
        createdAt: "2026-04-10T00:00:00Z",
        updatedAt: "2026-04-10T00:00:00Z",
      },
    ],
    financeRecord: {
      id: "fr-1",
      purchaseOrderId: "po-1",
      orderNo: "PO-001",
      supplierId: "vendor-1",
      paymentMode: "PREPAYMENT",
      contractNumber: "CT-001",
      invoiceNumber: "INV-001",
      paymentAccount: "Main Account",
      dueDate: "2026-05-01",
      settlementPaymentTerm: "Net 30",
      settlementCreditDays: 30,
      settlementAdvancePaymentPercentage: 10,
      settlementBalanceTriggerEvent: "After Offline",
      settlementCurrency: "USD",
      settlementPrepaymentPool: true,
      settlementPrepaymentThreshold: 1000,
      settlementCurrentPrepaidBalance: 5000,
      vendorBankInformation: null,
      grandTotal: 4300,
      totalAmountPaid: 1000,
      totalAmountUnpaid: 3300,
      financeStatus: "PENDING",
      createdAt: "2026-04-10T00:00:00Z",
      updatedAt: "2026-04-10T00:00:00Z",
    },
    ...overrides,
  };
}

function containersDetail(overrides?: Record<string, unknown>) {
  return {
    orderId: "po-1",
    orderNo: "PO-001",
    item: detailOrder().items[0],
    containers: [
      {
        id: "container-1",
        purchaseOrderId: "po-1",
        purchaseOrderItemId: "item-1",
        containerNumber: "MSCU1234567",
        locationCityId: "city-1",
        depotId: "depot-1",
        containerSizeCodeId: "size-1",
        containerTypeCodeId: "type-1",
        containerConditionCodeId: "condition-1",
        color: "Blue",
        flp: false,
        lbx: true,
        lockingBarsCount: 3,
        ventsCount: 1,
        machineType: "Daikin LXE",
        yom: 2026,
        offlineDate: "2026-04-11",
        purchasePrice: 2050,
        financialCost: 175,
        containerStatus: "PICKED_UP",
        remark: "Container remark",
        createdAt: "2026-04-10T00:00:00Z",
        updatedAt: "2026-04-10T00:00:00Z",
        location: { id: "city-1", city_code: "SHA", city_name: "Shanghai" },
        depot: { id: "depot-1", depot_code: "DP01", depot_name: "Main Depot" },
        size: { id: "size-1", size_code: "20", size_name: "20ft" },
        type: { id: "type-1", type_code: "DV", type_description: "Dry Van" },
        condition: { id: "condition-1", condition_code: "CW", condition_name: "Cargo Worthy" },
      },
    ],
    ...overrides,
  };
}

describe("Purchase detail views", () => {
  it("renders PO detail at item level without a container-summary column or container table", () => {
    render(<PurchaseOrderDetailView order={detailOrder()} />);

    expect(screen.getByText("Purchase Order Detail")).toBeInTheDocument();
    expect(screen.getByText("PO-001")).toBeInTheDocument();
    expect(screen.getByText("View Containers")).toBeInTheDocument();
    expect(screen.getByText("Finance Sync")).toBeInTheDocument();
    expect(screen.getByText("Vendor Release Number")).toBeInTheDocument();
    expect(screen.getByText("Vents")).toBeInTheDocument();
    expect(screen.queryByText("Line No")).not.toBeInTheDocument();
    expect(screen.queryByText("Container Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Container Number")).not.toBeInTheDocument();
    expect(screen.getAllByText("No")).not.toHaveLength(0);
  });

  it("renders an explicit finance empty state when no finance record exists", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ financeRecord: null })} />);

    expect(
      screen.getByText("No finance sync record has been created for this PO yet.")
    ).toBeInTheDocument();
  });

  it("renders container detail rows with explicit boolean values and container-only fields", () => {
    render(<PurchaseItemContainersView data={containersDetail()} />);

    expect(screen.getByText("Container Details")).toBeInTheDocument();
    expect(screen.getByText("Purchase Price")).toBeInTheDocument();
    expect(screen.getByText("Machine Type")).toBeInTheDocument();
    expect(screen.getByText("MSCU1234567")).toBeInTheDocument();
    expect(screen.getAllByText("No")).not.toHaveLength(0);
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
