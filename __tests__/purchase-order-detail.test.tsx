import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { cancelPurchaseOrder, partialCancelPurchaseOrderItems, routerRefresh, toast } = vi.hoisted(
  () => ({
    cancelPurchaseOrder: vi.fn(),
    partialCancelPurchaseOrderItems: vi.fn(),
    routerRefresh: vi.fn(),
    toast: vi.fn(),
  })
);

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@/app/purchase/po-management/actions", () => ({
  cancelPurchaseOrder,
  partialCancelPurchaseOrderItems,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
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
    orderStatus: "RELEASED",
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
      uses_internal_container_numbering: false,
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
        color: "RAL1001",
        flp: false,
        lbx: true,
        lockingBarsCount: 4,
        ventsCount: 2,
        machineType: "Carrier PrimeLINE",
        yom: 2026,
        offlineDate: "2026-04-10",
        tareWeight: 2200,
        maximumWeight: 30480,
        payloadWeight: 28280,
        cscNumber: "CSC-ITEM-1",
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
        color: "RAL1001",
        flp: false,
        lbx: true,
        lockingBarsCount: 4,
        ventsCount: 2,
        machineType: "Carrier PrimeLINE",
        yom: 2026,
        offlineDate: "2026-04-10",
        tareWeight: 2350,
        maximumWeight: 30480,
        payloadWeight: 28130,
        cscNumber: "CSC-CONTAINER-1",
        purchasePrice: 2000,
        financialCost: 150,
        containerStatus: "IN_YARD",
        remark: null,
        createdAt: "2026-04-10T00:00:00Z",
        updatedAt: "2026-04-10T00:00:00Z",
        location: { id: "city-1", city_code: "SHA", city_name: "Shanghai" },
        depot: { id: "depot-1", depot_code: "DP01", depot_name: "Main Depot" },
        size: { id: "size-1", size_code: "20", size_name: "20ft" },
        type: { id: "type-1", type_code: "DV", type_description: "Dry Van" },
        condition: { id: "condition-1", condition_code: "CW", condition_name: "Cargo Worthy" },
      },
    ],
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
        color: "RAL1001",
        flp: false,
        lbx: true,
        lockingBarsCount: 3,
        ventsCount: 1,
        machineType: "Daikin LXE",
        yom: 2026,
        offlineDate: "2026-04-11",
        tareWeight: 2350,
        maximumWeight: 30480,
        payloadWeight: 28130,
        cscNumber: "CSC-CONTAINER-1",
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
    expect(
      screen.queryByText(
        "Review PO business details, item lines, material types, and finance sync status."
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Edit PO")).not.toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel Entire PO")).toBeInTheDocument();
    expect(screen.getByText("View Containers")).toBeInTheDocument();
    expect(screen.getByText("Purchase Order Details")).toBeInTheDocument();
    expect(screen.getByText("Material Vendors")).toBeInTheDocument();
    expect(screen.getByText("Purchase Order Items")).toBeInTheDocument();
    expect(screen.getByText("Settlement Details")).toBeInTheDocument();
    expect(screen.getByText("Vendor Bank Information")).toBeInTheDocument();
    expect(screen.getByText("A/P Overview")).toBeInTheDocument();
    expect(screen.getByText("Cancel Qty")).toBeInTheDocument();
    expect(screen.queryByText("Finance Sync")).not.toBeInTheDocument();
    expect(screen.getByText("Finance Status")).toBeInTheDocument();
    expect(screen.getByText("财务未同步")).toBeInTheDocument();
    expect(screen.getByText("Vendor Release Number")).toBeInTheDocument();
    expect(screen.getByText("Tare Weight")).toBeInTheDocument();
    expect(screen.getByText("Maximum Weight")).toBeInTheDocument();
    expect(screen.getAllByText("Payload Weight")).not.toHaveLength(0);
    expect(screen.getAllByText("CSC Number")).not.toHaveLength(0);
    expect(screen.getByText("Vents")).toBeInTheDocument();
    expect(screen.queryByText("Line No")).not.toBeInTheDocument();
    expect(screen.queryByText("Container Summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Container Number")).not.toBeInTheDocument();
    expect(screen.getByText("Estimated Offline Date")).toBeInTheDocument();
    expect(screen.queryByText("Estimated Offline Time")).not.toBeInTheDocument();
    expect(screen.queryByText("Inbound Status")).not.toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.queryByText("2,026")).not.toBeInTheDocument();
    expect(screen.getAllByText("No")).not.toHaveLength(0);
  });

  it("renders pending finance status in PO finance even when no finance record exists", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ financeRecord: null })} />);

    expect(screen.getByText("Finance Status")).toBeInTheDocument();
    expect(screen.getByText("财务未同步")).toBeInTheDocument();
    expect(screen.queryByText("Finance Sync")).not.toBeInTheDocument();
  });

  it("allows editing for submitted purchase orders", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ orderStatus: "SUBMITTED" })} />);

    expect(screen.getByText("Edit PO")).toBeInTheDocument();
  });

  it("allows editing for partial released purchase orders", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ orderStatus: "PARTIAL_RELEASED" })} />);

    expect(screen.getByText("Edit PO")).toBeInTheDocument();
  });

  it("hides editing for completed purchase orders", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ orderStatus: "COMPLETED" })} />);

    expect(screen.queryByText("Edit PO")).not.toBeInTheDocument();
  });

  it("hides editing for cancelled purchase orders", () => {
    render(<PurchaseOrderDetailView order={detailOrder({ orderStatus: "CANCELLED" })} />);

    expect(screen.queryByText("Edit PO")).not.toBeInTheDocument();
  });

  it("renders container detail rows with explicit boolean values and container-only fields", () => {
    render(<PurchaseItemContainersView data={containersDetail()} />);

    expect(screen.getByText("Container Details")).toBeInTheDocument();
    expect(screen.getByText("Purchase Price")).toBeInTheDocument();
    expect(screen.getAllByText("Payload Weight")).not.toHaveLength(0);
    expect(screen.getAllByText("CSC Number")).not.toHaveLength(0);
    expect(screen.getByText("Machine Type")).toBeInTheDocument();
    expect(screen.getByText("MSCU1234567")).toBeInTheDocument();
    expect(screen.getByText("CSC-CONTAINER-1")).toBeInTheDocument();
    expect(screen.getAllByText("No")).not.toHaveLength(0);
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });
});
