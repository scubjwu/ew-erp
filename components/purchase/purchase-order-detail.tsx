"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  cancelPurchaseOrder,
} from "@/app/purchase/po-management/actions";
import { getPurchaseOrderEditPermissions, type PurchaseOrderDetail } from "@/types/purchase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
} from "@/components/shared/page-standard/table-standard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US");
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return value.toLocaleString("en-US");
}

function formatPlainNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return String(value);
}

function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value == null) return "-";
  return value ? "Yes" : "No";
}

function financeStatusLabel(value: string | null | undefined) {
  if (!value || value === "PENDING") return "财务未同步";
  if (value === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  if (value === "PAID") return "PAID";
  if (value === "VOID") return "VOID";
  return String(value);
}

function companyLabel(
  ref?:
    | { company_name: string | null; legal_company_name: string | null }
    | { full_name: string | null; user_code: string | null }
    | null
) {
  if (!ref) return "-";
  if ("full_name" in ref) return ref.full_name ?? ref.user_code ?? "-";
  return ref.company_name ?? ref.legal_company_name ?? "-";
}

function codeLabel(
  ref?:
    | { vendor_code: string | null }
    | { container_owner_code: string | null }
    | { user_code: string | null }
    | null
) {
  if (!ref) return null;
  if ("vendor_code" in ref) return ref.vendor_code;
  if ("container_owner_code" in ref) return ref.container_owner_code;
  return ref.user_code;
}

function sizeTypeLabel(item: PurchaseOrderDetail["items"][number]) {
  const sizeCode = item.size?.size_code;
  const typeCode = item.type?.type_code;
  if (!sizeCode && !typeCode) return "-";
  return `${sizeCode ?? ""}${typeCode ?? ""}` || "-";
}

function conditionLabel(item: PurchaseOrderDetail["items"][number]) {
  if (!item.condition) return "-";
  return item.condition.condition_code;
}

function bankInfoRows(order: PurchaseOrderDetail) {
  const bank = order.vendorBankInformation ?? {};
  return [
    ["Bank Name", typeof bank.bank_name === "string" ? bank.bank_name : null],
    [
      "Account Name",
      typeof bank.bank_account_name === "string" ? bank.bank_account_name : null,
    ],
    [
      "Account Number",
      typeof bank.bank_account_number === "string" ? bank.bank_account_number : null,
    ],
    ["SWIFT", typeof bank.swift_code === "string" ? bank.swift_code : null],
    ["Bank Address", typeof bank.bank_address === "string" ? bank.bank_address : null],
    ["Remark", typeof bank.remark === "string" ? bank.remark : null],
  ] as const;
}

function formatContainerNumberRangeDisplay(value: string | null | undefined) {
  if (!value) return "-";

  const shorten = (part: string) => {
    const trimmed = part.trim();
    const match = trimmed.match(/^([A-Za-z]{4})(\d{6})\d+$/);
    if (!match) return trimmed;
    return `${match[1].toUpperCase()}${match[2]}`;
  };

  if (!value.includes(" - ")) return shorten(value);

  const [start, end] = value.split(" - ");
  if (!start || !end) return value;
  return `${shorten(start)} - ${shorten(end)}`;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function PurchaseOrderDetailView({ order }: { order: PurchaseOrderDetail }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const isFactoryOrder = order.purchaseType === "FACTORY_ORDER";
  const isNonFactoryOrder =
    order.purchaseType === "NEW_CONTAINER" || order.purchaseType === "USED_CONTAINER";

  const editPermissions = getPurchaseOrderEditPermissions(order.purchaseType, order.orderStatus);
  const canEdit = editPermissions.canEnterEdit || editPermissions.canEditPlannedPod;
  const canCancelWholeOrder =
    order.orderStatus !== "COMPLETED" && order.orderStatus !== "CANCELLED";

  async function handleCancelOrder() {
    setCancelling(true);
    try {
      await cancelPurchaseOrder(order.id);
      toast({
        title: "Purchase order cancelled",
        description: `${order.orderNo} is now CANCELLED.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel purchase order",
        description: getErrorMessage(error),
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Purchase Order Detail</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <Button asChild variant="outline">
                <Link href={`/purchase/po-management/${order.id}/edit`}>Edit PO</Link>
              </Button>
            ) : null}
            {canCancelWholeOrder ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleCancelOrder()}
                disabled={cancelling}
              >
                Cancel Entire PO
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/purchase/po-management">Back to PO Management</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Order No" value={order.orderNo} />
            <DetailField label="Purchase Type" value={order.purchaseType} />
            <DetailField
              label="Supplier"
              value={[codeLabel(order.supplier), companyLabel(order.supplier)].filter(Boolean).join(" · ") || "-"}
            />
            <DetailField
              label="Owner"
              value={[codeLabel(order.owner), companyLabel(order.owner)].filter(Boolean).join(" · ") || "-"}
            />
            <DetailField
              label="Buyer"
              value={[codeLabel(order.buyer), companyLabel(order.buyer)].filter(Boolean).join(" · ") || "-"}
            />
            <DetailField label="Purchase Date" value={formatDate(order.purchaseDate)} />
            {isFactoryOrder ? (
              <DetailField
                label="Estimated Offline Date"
                value={formatDate(order.estimatedOfflineTime)}
              />
            ) : null}
            {isFactoryOrder ? (
              <DetailField label="Contract Number" value={order.contractNumber ?? "-"} />
            ) : null}
            {isFactoryOrder ? (
              <DetailField label="Invoice Number" value={order.invoiceNumber ?? "-"} />
            ) : null}
            {isNonFactoryOrder ? (
              <DetailField label="Freeday" value={formatNumber(order.freeday)} />
            ) : null}
            <DetailField label="Order Status" value={order.orderStatus} />
            <DetailField label="Remarks" value={order.remark ?? "-"} />
          </CardContent>
        </Card>

        {order.materialTypes.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Material Vendors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {order.materialTypes.map((row) => (
                <div key={row.id} className="rounded-lg border p-3">
                  <div className="text-sm font-medium">{row.materialType}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {[row.materialVendorCodeSnapshot, row.materialVendorNameSnapshot]
                      .filter(Boolean)
                      .join(" · ") ||
                      row.materialVendor?.company_name ||
                      row.materialVendor?.legal_company_name ||
                      row.materialVendor?.vendor_code ||
                      "-"}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Items</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Depot</TableHead>
                  {order.purchaseType === "FACTORY_ORDER" ? (
                    <TableHead>Container Number Range</TableHead>
                  ) : null}
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>FLP</TableHead>
                  <TableHead>LBX</TableHead>
                  <TableHead>Locking Bars</TableHead>
                  <TableHead>Vents</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>YOM</TableHead>
                  {order.purchaseType !== "FACTORY_ORDER" ? (
                    <TableHead>Vendor Release Number</TableHead>
                  ) : null}
                  {order.purchaseType === "FACTORY_ORDER" ? (
                    <TableHead>Estimated Offline Date</TableHead>
                  ) : null}
                  <TableHead>Offline Date / Release Date</TableHead>
                  <TableHead>Planned POD</TableHead>
                  <TableHead>Tare Weight</TableHead>
                  <TableHead>Maximum Weight</TableHead>
                  <TableHead>Payload Weight</TableHead>
                  <TableHead>CSC Number</TableHead>
                  <TableHead>Planned Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Financial Cost</TableHead>
                  <TableHead>Settlement Price</TableHead>
                  <TableHead>Line Amount</TableHead>
                  <TableHead>Cancelled Qty</TableHead>
                  <TableHead>Remaining Qty</TableHead>
                  <TableHead className={ACTIONS_STICKY_HEAD_CLASS}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={order.purchaseType === "FACTORY_ORDER" ? 26 : 25}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No PO items found.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.location?.city_code ?? "-"}
                      </TableCell>
                      <TableCell>
                        {item.depot
                          ? `${item.depot.depot_code} · ${item.depot.depot_name}`
                          : "-"}
                      </TableCell>
                      {order.purchaseType === "FACTORY_ORDER" ? (
                        <TableCell>
                          {formatContainerNumberRangeDisplay(item.containerNumberRange)}
                        </TableCell>
                      ) : null}
                      <TableCell>{sizeTypeLabel(item)}</TableCell>
                      <TableCell>{conditionLabel(item)}</TableCell>
                      <TableCell>{item.color ?? "-"}</TableCell>
                      <TableCell>{formatBoolean(item.flp)}</TableCell>
                      <TableCell>{formatBoolean(item.lbx)}</TableCell>
                      <TableCell>{formatNumber(item.lockingBarsCount)}</TableCell>
                      <TableCell>{formatNumber(item.ventsCount)}</TableCell>
                      <TableCell>{item.machineType ?? "-"}</TableCell>
                      <TableCell>{formatPlainNumber(item.yom)}</TableCell>
                      {order.purchaseType !== "FACTORY_ORDER" ? (
                        <TableCell>{item.vendorReleaseNumber ?? "-"}</TableCell>
                      ) : null}
                      {order.purchaseType === "FACTORY_ORDER" ? (
                        <TableCell>{formatDate(item.estimatedOfflineDate)}</TableCell>
                      ) : null}
                      <TableCell>{formatDate(item.offlineDate)}</TableCell>
                      <TableCell>{item.plannedPod ?? "-"}</TableCell>
                      <TableCell>{formatNumber(item.tareWeight)}</TableCell>
                      <TableCell>{formatNumber(item.maximumWeight)}</TableCell>
                      <TableCell>{formatNumber(item.payloadWeight)}</TableCell>
                      <TableCell>{item.cscNumber ?? "-"}</TableCell>
                      <TableCell>{formatNumber(item.plannedQty)}</TableCell>
                      <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell>{formatCurrency(item.financialCost)}</TableCell>
                      <TableCell>{formatCurrency(item.settlementPrice)}</TableCell>
                      <TableCell>{formatCurrency(item.lineAmount)}</TableCell>
                      <TableCell>{formatNumber(item.cancelledQty)}</TableCell>
                      <TableCell>{formatNumber(item.remainingQty)}</TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link
                              href={`/purchase/po-management/${order.id}/items/${item.id}/containers`}
                            >
                              View Containers
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settlement Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-lg border p-4">
              <div className="mb-3 text-sm font-medium">Vendor Bank Information</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {bankInfoRows(order).map(([label, value]) => (
                  <DetailField key={label} label={label} value={value ?? "-"} />
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-3 text-sm font-medium">A/P Overview</div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DetailField
                  label="Finance Status"
                  value={financeStatusLabel(order.financeRecord?.financeStatus)}
                />
                <DetailField label="Payment Mode" value={order.paymentMode ?? "-"} />
                <DetailField label="Payment Account" value={order.paymentAccount ?? "-"} />
                <DetailField label="Due Date" value={formatDate(order.dueDate)} />
                <DetailField
                  label="Grand Total"
                  value={formatCurrency(order.grandTotal, order.settlementCurrency ?? "USD")}
                />
                <DetailField
                  label="Amount Paid"
                  value={formatCurrency(
                    order.totalAmountPaid,
                    order.settlementCurrency ?? "USD"
                  )}
                />
                <DetailField
                  label="Amount Unpaid"
                  value={formatCurrency(
                    order.totalAmountUnpaid,
                    order.settlementCurrency ?? "USD"
                  )}
                />
                <DetailField
                  label="Payment Term"
                  value={order.settlementPaymentTerm ?? "-"}
                />
                <DetailField
                  label="Credit Days"
                  value={formatNumber(order.settlementCreditDays)}
                />
                <DetailField
                  label="Advance Payment %"
                  value={
                    order.settlementAdvancePaymentPercentage == null
                      ? "-"
                      : `${order.settlementAdvancePaymentPercentage}%`
                  }
                />
                <DetailField
                  label="Balance Trigger"
                  value={order.settlementBalanceTriggerEvent ?? "-"}
                />
                <DetailField
                  label="Currency"
                  value={order.settlementCurrency ?? "-"}
                />
                <DetailField
                  label="Prepayment Pool"
                  value={order.settlementPrepaymentPool ? "Yes" : "No"}
                />
                <DetailField
                  label="Prepayment Threshold"
                  value={formatCurrency(
                    order.settlementPrepaymentThreshold,
                    order.settlementCurrency ?? "USD"
                  )}
                />
                <DetailField
                  label="Prepaid Balance"
                  value={formatCurrency(
                    order.settlementCurrentPrepaidBalance,
                    order.settlementCurrency ?? "USD"
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
