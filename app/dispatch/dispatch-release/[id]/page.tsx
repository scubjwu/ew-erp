import { notFound } from "next/navigation";

import { getDispatchReleaseDetail } from "@/app/dispatch/actions";
import { DispatchReleaseDetailActions } from "@/components/dispatch/dispatch-release-detail-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

function isMissingDispatchReleaseError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("PGRST116") ||
    message.includes("JSON object requested, multiple (or no) rows returned") ||
    message.includes("0 rows")
  );
}

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function displayReleaseStatus(value: string | null | undefined) {
  switch (value) {
    case "CREATED":
    case "IN_TRANSIT":
      return "Submitted";
    case "ON_HOLD":
      return "On hold";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return displayValue(value);
  }
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function DispatchReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail;
  try {
    detail = await getDispatchReleaseDetail(id);
  } catch (error) {
    if (isMissingDispatchReleaseError(error)) {
      notFound();
    }
    throw error;
  }

  const vendorReleaseDocuments =
    detail.order.releaseSource === "VENDOR_REF"
      ? detail.attachments.filter((attachment) => attachment.inherited)
      : [];
  const otherAttachments =
    detail.order.releaseSource === "VENDOR_REF"
      ? detail.attachments.filter((attachment) => !attachment.inherited)
      : detail.attachments;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dispatch Release Detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Release Number {detail.order.orderNo}
          </p>
        </div>
        <DispatchReleaseDetailActions
          transferOrderId={detail.order.id}
          orderNo={detail.order.orderNo}
          status={detail.order.status}
          releaseQty={detail.order.releaseQty}
          pickedUpQty={detail.order.pickedUpQty}
        />
      </div>

      <Section title="Release Summary">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-medium">Release Number:</span> {displayValue(detail.order.orderNo)}</div>
          <div><span className="font-medium">Status:</span> {displayReleaseStatus(detail.order.status)}</div>
          <div><span className="font-medium">Release Source:</span> {displayValue(detail.order.releaseSource)}</div>
          <div><span className="font-medium">Vendor Release Number:</span> {displayValue(detail.order.vendorReleaseNumber)}</div>
          <div><span className="font-medium">Lessee:</span> {displayValue(detail.order.lesseeName)}</div>
          <div><span className="font-medium">Onhire Number:</span> {displayValue(detail.order.onhireNo)}</div>
          <div><span className="font-medium">Release Date:</span> {displayValue(detail.order.releaseDate)}</div>
          <div><span className="font-medium">POL:</span> {displayValue(detail.order.polLabel)}</div>
          <div><span className="font-medium">POD:</span> {displayValue(detail.order.podLabel)}</div>
          <div><span className="font-medium">Carrier:</span> {displayValue(detail.order.carrier)}</div>
          <div><span className="font-medium">Carrier Plan No:</span> {displayValue(detail.order.carrierPlanNo)}</div>
          <div><span className="font-medium">Dispatch Plan No:</span> {displayValue(detail.order.dispatchPlanNo)}</div>
          <div><span className="font-medium">Dispatch Arrange Date:</span> {displayValue(detail.order.dispatchArrangeDate)}</div>
          <div><span className="font-medium">Self Pickup Depot:</span> {displayValue(detail.order.selfPickupDepotLabel)}</div>
        </div>
      </Section>

      <Section title="Bucket / Quantity">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-medium">Region:</span> {displayValue(detail.order.sourceRegion)}</div>
          <div><span className="font-medium">City:</span> {displayValue(detail.order.sourceCity)}</div>
          <div><span className="font-medium">Depot:</span> {displayValue(detail.order.sourceDepot)}</div>
          <div><span className="font-medium">Size/Type:</span> {displayValue(detail.order.sizeType)}</div>
          <div><span className="font-medium">Condition:</span> {displayValue(detail.order.condition)}</div>
          <div><span className="font-medium">Color:</span> {displayValue(detail.order.color)}</div>
          <div><span className="font-medium">Machine Type:</span> {displayValue(detail.order.machineType)}</div>
          <div><span className="font-medium">Selection Mode:</span> {displayValue(detail.order.containerSelectionMode)}</div>
          <div><span className="font-medium">Release Qty:</span> {displayValue(detail.order.releaseQty)}</div>
          <div><span className="font-medium">Assigned Qty:</span> {displayValue(detail.order.assignedQty)}</div>
          <div><span className="font-medium">Unassigned Qty:</span> {displayValue(detail.order.unassignedQty)}</div>
          <div><span className="font-medium">PU:</span> {displayValue(detail.order.pickedUpQty)}</div>
          <div><span className="font-medium">NPU:</span> {displayValue(detail.order.nonPickedUpQty)}</div>
        </div>
      </Section>

      <Section title="Reasons / Remarks">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Hold Reason</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {displayValue(detail.order.holdReason)}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Cancel Reason</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {displayValue(detail.order.cancelReason)}
            </div>
          </div>
          <div className="rounded-lg border p-3 md:col-span-2">
            <div className="text-sm font-medium">Remarks</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {displayValue(detail.order.remark)}
            </div>
          </div>
        </div>
      </Section>

      <Section title="Cost / Revenue">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-medium">Header Currency:</span> {displayValue(detail.order.headerCurrency)}</div>
          <div><span className="font-medium">Pick Up Charge:</span> {displayValue(detail.order.pickupCharge)}</div>
          <div><span className="font-medium">DPP:</span> {displayValue(detail.order.dpp)}</div>
          <div><span className="font-medium">Free Days:</span> {displayValue(detail.order.freeDays)}</div>
          <div><span className="font-medium">RV:</span> {displayValue(detail.order.rv)}</div>
          <div><span className="font-medium">Daily Rent:</span> {displayValue(detail.order.dailyRent)}</div>
          <div><span className="font-medium">Trucking Cost Total Amount:</span> {displayValue(detail.order.truckingCostTotalInHeaderCurrency)}</div>
          <div><span className="font-medium">Handling Fee:</span> {displayValue(detail.order.handlingFee)}</div>
          <div><span className="font-medium">Repair Cost Total Amount:</span> {displayValue(detail.order.repairCostTotalInHeaderCurrency)}</div>
          <div><span className="font-medium">Repair Recovery Total Amount:</span> {displayValue(detail.order.damageClaimTotalInHeaderCurrency)}</div>
          <div><span className="font-medium">Total Cost:</span> {displayValue(detail.order.totalCost)}</div>
          <div><span className="font-medium">Total Revenue:</span> {displayValue(detail.order.totalRevenue)}</div>
        </div>
      </Section>

      <Section title="Container Items">
        <div className="mb-3 text-sm text-muted-foreground">
          Saved container numbers and picked up / delivery dates are locked and cannot be changed.
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Container Number</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Picked Up</TableHead>
                <TableHead>Picked Up / Delivery Date</TableHead>
                <TableHead className="text-right">Trucking Cost</TableHead>
                <TableHead>Trucking Currency</TableHead>
                <TableHead className="text-right">Repair Cost</TableHead>
                <TableHead>Repair Cost Currency</TableHead>
                <TableHead className="text-right">Repair Recovery</TableHead>
                <TableHead>Repair Recovery Currency</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-20 text-center text-sm text-muted-foreground">
                    No specified transfer items were created for this release.
                  </TableCell>
                </TableRow>
              ) : (
                detail.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.containerNumber}</TableCell>
                    <TableCell>{item.itemStatus}</TableCell>
                    <TableCell>{item.pickedUp ? "Yes" : "No"}</TableCell>
                    <TableCell>{displayValue(item.pickupDate)}</TableCell>
                    <TableCell className="text-right">{item.truckingCost.toFixed(2)}</TableCell>
                    <TableCell>{displayValue(item.truckingCostCurrency)}</TableCell>
                    <TableCell className="text-right">{item.repairCost.toFixed(2)}</TableCell>
                    <TableCell>{displayValue(item.repairCostCurrency)}</TableCell>
                    <TableCell className="text-right">{item.damageClaim.toFixed(2)}</TableCell>
                    <TableCell>{displayValue(item.damageClaimCurrency)}</TableCell>
                    <TableCell>{displayValue(item.remark)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Documents">
        <div className="space-y-2">
          {detail.order.releaseSource === "VENDOR_REF" ? (
            <div className="space-y-2">
              <div className="text-sm font-medium">Vendor Release Documents</div>
              {vendorReleaseDocuments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No Vendor Release documents were inherited for this release.
                </div>
              ) : (
                vendorReleaseDocuments.map((attachment, index) => (
                  <div key={attachment.id} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="font-medium">
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                        Vendor Release Document {index + 1}
                      </a>
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Inherited: Yes | Remark: {displayValue(attachment.remark)}
                    </div>
                  </div>
                ))
              )}
              {otherAttachments.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <div className="text-sm font-medium">Other Attachments</div>
                  {otherAttachments.map((attachment) => (
                    <div key={attachment.id} className="rounded-lg border px-3 py-2 text-sm">
                      <div className="font-medium">
                        <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                          Other Attachment
                        </a>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Inherited: {attachment.inherited ? "Yes" : "No"} | Remark: {displayValue(attachment.remark)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : otherAttachments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No release attachments.</div>
          ) : (
            otherAttachments.map((attachment) => (
              <div key={attachment.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="font-medium">
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                    Attachment
                  </a>
                </div>
                <div className="mt-1 text-muted-foreground">
                  Inherited: {attachment.inherited ? "Yes" : "No"} | Remark: {displayValue(attachment.remark)}
                </div>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Finance Summary">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.finance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                    No finance lines were generated.
                  </TableCell>
                </TableRow>
              ) : (
                detail.finance.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.kind}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell className="text-right">{row.amount.toFixed(2)}</TableCell>
                    <TableCell>{displayValue(row.occurDate)}</TableCell>
                    <TableCell>{displayValue(row.remark)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Section>
    </div>
  );
}
