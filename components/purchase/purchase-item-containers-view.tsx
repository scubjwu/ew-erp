"use client";

import Link from "next/link";

import type { PurchaseOrderItemContainersDetail } from "@/types/purchase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

function formatCurrency(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBoolean(value: boolean | null | undefined) {
  if (value == null) return "-";
  return value ? "Yes" : "No";
}

function sizeTypeLabel(
  row: PurchaseOrderItemContainersDetail["item"] | PurchaseOrderItemContainersDetail["containers"][number]
) {
  const sizeCode = row.size?.size_code;
  const typeCode = row.type?.type_code;
  if (!sizeCode && !typeCode) return "-";
  return `${sizeCode ?? ""}${typeCode ?? ""}` || "-";
}

function conditionLabel(
  row: PurchaseOrderItemContainersDetail["item"] | PurchaseOrderItemContainersDetail["containers"][number]
) {
  if (!row.condition) return "-";
  return row.condition.condition_code;
}

export function PurchaseItemContainersView({
  data,
}: {
  data: PurchaseOrderItemContainersDetail;
}) {
  const { orderId, orderNo, purchaseType, item, containers } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Container Details</h1>
            <p className="text-sm text-muted-foreground">
              {orderNo} · {item.location?.city_code ?? "Unknown Location"} · {sizeTypeLabel(item)}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/purchase/po-management/${orderId}`}>Back to Purchase Order Detail</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PO Item Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Location
              </div>
              <div className="mt-1 text-sm">
                {item.location?.city_code ?? "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Depot
              </div>
              <div className="mt-1 text-sm">
                {item.depot ? `${item.depot.depot_code} · ${item.depot.depot_name}` : "-"}
              </div>
            </div>
            {purchaseType === "FACTORY_ORDER" ? (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Container Number Range
                </div>
                <div className="mt-1 text-sm">{item.containerNumberRange ?? "-"}</div>
              </div>
            ) : null}
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Size/Type
              </div>
              <div className="mt-1 text-sm">{sizeTypeLabel(item)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Condition
              </div>
              <div className="mt-1 text-sm">{conditionLabel(item)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Tare Weight
              </div>
              <div className="mt-1 text-sm">{formatNumber(item.tareWeight)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Maximum Weight
              </div>
              <div className="mt-1 text-sm">{formatNumber(item.maximumWeight)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Payload Weight
              </div>
              <div className="mt-1 text-sm">{formatNumber(item.payloadWeight)}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                CSC Number
              </div>
              <div className="mt-1 text-sm">{item.cscNumber ?? "-"}</div>
            </div>
            {purchaseType !== "FACTORY_ORDER" ? (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Vendor Release Number
                </div>
                <div className="mt-1 text-sm">{item.vendorReleaseNumber ?? "-"}</div>
              </div>
            ) : null}
            {purchaseType === "FACTORY_ORDER" ? (
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Estimated Offline Date
                </div>
                <div className="mt-1 text-sm">{formatDate(item.estimatedOfflineDate)}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Containers</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Container Number</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>FLP</TableHead>
                  <TableHead>LBX</TableHead>
                  <TableHead>Locking Bars</TableHead>
                  <TableHead>Vents</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>YOM</TableHead>
                  {purchaseType === "FACTORY_ORDER" ? (
                    <TableHead>Estimated Offline Date</TableHead>
                  ) : null}
                  <TableHead>Offline Date</TableHead>
                  <TableHead>Tare Weight</TableHead>
                  <TableHead>Maximum Weight</TableHead>
                  <TableHead>Payload Weight</TableHead>
                  <TableHead>CSC Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Purchase Price</TableHead>
                  <TableHead>Financial Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={purchaseType === "FACTORY_ORDER" ? 21 : 20}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No containers found for this PO item.
                    </TableCell>
                  </TableRow>
                ) : (
                  containers.map((container) => (
                    <TableRow key={container.id}>
                      <TableCell className="font-medium">
                        {container.containerNumber ?? "-"}
                      </TableCell>
                      <TableCell>
                        {container.location?.city_code ?? "-"}
                      </TableCell>
                      <TableCell>
                        {container.depot
                          ? `${container.depot.depot_code} · ${container.depot.depot_name}`
                          : "-"}
                      </TableCell>
                      <TableCell>{sizeTypeLabel(container)}</TableCell>
                      <TableCell>{conditionLabel(container)}</TableCell>
                      <TableCell>{container.color ?? "-"}</TableCell>
                      <TableCell>{formatBoolean(container.flp)}</TableCell>
                      <TableCell>{formatBoolean(container.lbx)}</TableCell>
                      <TableCell>{formatNumber(container.lockingBarsCount)}</TableCell>
                      <TableCell>{formatNumber(container.ventsCount)}</TableCell>
                      <TableCell>{container.machineType ?? "-"}</TableCell>
                      <TableCell>{formatNumber(container.yom)}</TableCell>
                      {purchaseType === "FACTORY_ORDER" ? (
                        <TableCell>{formatDate(container.estimatedOfflineDate)}</TableCell>
                      ) : null}
                      <TableCell>{formatDate(container.offlineDate)}</TableCell>
                      <TableCell>{formatNumber(container.tareWeight)}</TableCell>
                      <TableCell>{formatNumber(container.maximumWeight)}</TableCell>
                      <TableCell>{formatNumber(container.payloadWeight)}</TableCell>
                      <TableCell>{container.cscNumber ?? "-"}</TableCell>
                      <TableCell>{container.containerStatus ?? "-"}</TableCell>
                      <TableCell>{formatCurrency(container.purchasePrice)}</TableCell>
                      <TableCell>{formatCurrency(container.financialCost)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
