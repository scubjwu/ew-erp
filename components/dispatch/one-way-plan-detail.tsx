"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cancelOneWayPlan } from "@/app/dispatch/one-way-planning/actions";
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
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import type { OneWayPlanDetail } from "@/types/one-way-planning";

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatMoney(value: number) {
  return value.toFixed(2);
}

function buildCreateReleaseHref(detail: OneWayPlanDetail) {
  const params = new URLSearchParams({
    oneWayPlanId: detail.id,
    bucketId: detail.bucketId,
    region: detail.region === "-" ? "" : detail.region,
    city: detail.polCode === "-" ? "" : detail.polCode,
    depot: detail.depotCode === "-" ? "" : detail.depotCode,
    sizeType: detail.sizeType === "-" ? "" : detail.sizeType,
    condition: detail.condition === "-" ? "" : detail.condition,
    color: detail.color === "-" ? "" : detail.color,
    machineType: detail.machineType === "-" ? "" : detail.machineType,
  });
  return `/dispatch/dispatch-release/create?${params.toString()}`;
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

export function OneWayPlanDetailView({ detail }: { detail: OneWayPlanDetail }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const canCreateRelease =
    detail.conversionStatus === "OPEN" &&
    (detail.status === "SUBMITTED" || detail.status === "APPROVED") &&
    detail.depotCode !== "-";
  const canCancel =
    detail.conversionStatus === "OPEN" &&
    detail.status !== "CANCELLED" &&
    detail.status !== "COMPLETED";

  async function handleCancelPlan() {
    if (
      !window.confirm(
        `Cancel one way plan ${detail.planId}? This will remove its quantity from Planned Dispatch Qty.`
      )
    ) {
      return;
    }

    setCancelling(true);
    try {
      const result = await cancelOneWayPlan(detail.id);
      toast({
        title: "One way plan cancelled",
        description: `${result.planId} is now CANCELLED.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel one way plan",
        description: getErrorMessage(error),
      });
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">One Way Plan Detail</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan ID {detail.planId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dispatch/one-way-planning/${detail.id}/edit`}>Edit</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canCancel || cancelling}
            onClick={() => void handleCancelPlan()}
          >
            {cancelling ? "Cancelling..." : "Cancel"}
          </Button>
          {canCreateRelease ? (
            <Button asChild type="button" variant="outline">
              <Link href={buildCreateReleaseHref(detail)}>Create Release</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled
              title={
                detail.depotCode === "-"
                  ? "Assign a depot before creating a release."
                  : "Only open submitted or approved plans can create a release."
              }
            >
              Create Release
            </Button>
          )}
        </div>
      </div>

      <Section title="Plan Summary">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div><span className="font-medium">Plan ID:</span> {displayValue(detail.planId)}</div>
          <div><span className="font-medium">Status:</span> {displayValue(detail.status)}</div>
          <div><span className="font-medium">Lessee Request ID:</span> {displayValue(detail.shipperRequestId)}</div>
          <div><span className="font-medium">Apply Date:</span> {displayValue(detail.applyDate)}</div>
          <div><span className="font-medium">Arranged Dispatch Date:</span> {displayValue(detail.arrangedDispatchDate)}</div>

          <div><span className="font-medium">Lessee:</span> {displayValue(detail.lesseeLabel)}</div>
          <div><span className="font-medium">Onhire No:</span> {displayValue(detail.onhireNo)}</div>
          <div><span className="font-medium">POL:</span> {displayValue(detail.polCode)}</div>
          <div><span className="font-medium">Depot Code:</span> {displayValue(detail.depotCode)}</div>
          <div><span className="font-medium">Availability Date:</span> {displayValue(detail.availabilityDate)}</div>

          <div className="md:col-span-2 xl:col-span-5"><span className="font-medium">POD:</span> {displayValue(detail.pod)}</div>
          <div><span className="font-medium">Size/Type:</span> {displayValue(detail.sizeType)}</div>
          <div><span className="font-medium">Condition:</span> {displayValue(detail.condition)}</div>
          <div><span className="font-medium">Color:</span> {displayValue(detail.color)}</div>
          <div><span className="font-medium">Machine Type:</span> {displayValue(detail.machineType)}</div>
        </div>
      </Section>

      <Section title="Quantity Summary">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-medium">Quantity:</span> {formatNumber(detail.quantity)}</div>
          <div><span className="font-medium">Authorized Qty:</span> {formatNumber(detail.authorizedQty)}</div>
          <div><span className="font-medium">Remaining Qty:</span> {formatNumber(detail.remainingQty)}</div>
          <div><span className="font-medium">Picked Up Qty:</span> {formatNumber(detail.pickedUpQty)}</div>
          <div><span className="font-medium">Non Picked Up Qty:</span> {formatNumber(detail.nonPickedUpQty)}</div>
          <div><span className="font-medium">Matched Qty:</span> {formatNumber(detail.matchedQty)}</div>
          <div><span className="font-medium">Released Qty:</span> {formatNumber(detail.releasedQty)}</div>
          <div><span className="font-medium">Shortfall:</span> {formatNumber(detail.shortfall)}</div>
        </div>
      </Section>

      <Section title="Financial Terms">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div><span className="font-medium">Pick-up Charge:</span> {formatMoney(detail.pickupCharge)}</div>
          <div><span className="font-medium">Free Days:</span> {formatNumber(detail.freeDays)}</div>
          <div><span className="font-medium">Per Diem:</span> {formatMoney(detail.perDiem)}</div>
          <div><span className="font-medium">DPP:</span> {formatMoney(detail.dpp)}</div>
          <div><span className="font-medium">Carrier:</span> {displayValue(detail.carrier)}</div>
          <div><span className="font-medium">Currency:</span> {displayValue(detail.currency)}</div>
          <div><span className="font-medium">RV:</span> {formatMoney(detail.rv)}</div>
        </div>
      </Section>

      <Section title="Remarks">
        <div className="rounded-lg border p-3 text-sm text-muted-foreground">
          {displayValue(detail.remarks)}
        </div>
      </Section>

      <Section title="Release History">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release Number</TableHead>
                <TableHead>Release Status</TableHead>
                <TableHead>Release Date</TableHead>
                <TableHead>POD</TableHead>
                <TableHead className="text-right">Release Qty</TableHead>
                <TableHead className="text-right">PU</TableHead>
                <TableHead className="text-right">NPU</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.releaseHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-sm text-muted-foreground">
                    No dispatch releases are linked to this plan yet.
                  </TableCell>
                </TableRow>
              ) : (
                detail.releaseHistory.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{displayValue(row.releaseNumber)}</TableCell>
                    <TableCell>{displayValue(row.releaseStatus)}</TableCell>
                    <TableCell>{displayValue(row.releaseDate)}</TableCell>
                    <TableCell>{displayValue(row.pod)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.releaseQty)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.pu)}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.npu)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dispatch/dispatch-release/${row.id}`}>View Release</Link>
                      </Button>
                    </TableCell>
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
