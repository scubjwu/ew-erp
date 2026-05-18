"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  importOneWayPlanRows,
  previewOneWayPlanImport,
} from "@/app/dispatch/one-way-planning/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { OneWayPlanImportPreviewResult } from "@/types/one-way-planning";

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

export function OneWayPlanImportDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [preview, setPreview] = useState<OneWayPlanImportPreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);

  function rowClassName(row: OneWayPlanImportPreviewResult["rows"][number]) {
    if (!row.isValid) return "bg-red-50/60";
    if (row.skipReason) return "bg-amber-50/70";
    return "";
  }

  function buildValidationResult(row: OneWayPlanImportPreviewResult["rows"][number], depotSelected: boolean) {
    const depotMessage = row.canChooseDepot
      ? depotSelected
        ? "Valid"
        : "Select depot if available"
      : row.depotCandidates.length === 0 && row.pol
        ? "Depot can be assigned later"
        : "Valid";
    if (row.errors.length > 0) {
      return `${row.errors.join(" | ")} | ${depotMessage}`;
    }
    if (row.skipReason) {
      return `${row.skipReason} | ${depotMessage}`;
    }
    return depotMessage;
  }

  function handleDepotSelection(rowIndex: number, depotId: string) {
    setPreview((current) => {
      if (!current) return current;
      const rows = current.rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const selected = row.depotCandidates.find((candidate) => candidate.id === depotId) ?? null;
        return {
          ...row,
          depotCode: selected?.code ?? "",
          selectedDepotId: selected?.id ?? null,
          selectedDepotCode: selected?.code ?? null,
          validationResult: buildValidationResult(row, Boolean(selected)),
          prepared: row.prepared
            ? {
                ...row.prepared,
                depotId: selected?.id ?? null,
              }
            : null,
        };
      });
      const validRows = rows.filter((row) => row.isValid).length;
      return {
        ...current,
        rows,
        validRows,
        invalidRows: rows.length - validRows,
      };
    });
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;
    setSelectedFileName(file.name);
    setLoadingPreview(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await previewOneWayPlanImport(formData);
      setPreview(result);
      toast({
        title: "Import preview ready",
        description:
          result.invalidRows === 0
            ? result.duplicateRows > 0
              ? `${result.importableRows} new rows are ready to import. ${result.duplicateRows} duplicate rows will be skipped automatically.`
              : `${result.importableRows} rows are ready to import.`
            : `${result.invalidRows} rows need fixes before import.`,
      });
    } catch (error) {
      setPreview(null);
      toast({
        variant: "destructive",
        title: "Could not preview CMA report",
        description: getErrorMessage(error),
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleReupload() {
    setPreview(null);
    setSelectedFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const result = await importOneWayPlanRows(preview.rows);
      toast({
        title: "CMA report imported",
        description:
          result.skippedCount > 0
            ? `${result.insertedCount} one way plans were created, ${result.skippedCount} duplicate rows were skipped.`
            : `${result.insertedCount} one way plans were created.`,
      });
      handleReupload();
      router.push("/dispatch/one-way-planning");
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not import CMA report",
        description: getErrorMessage(error),
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import CMA Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CMA Excel report, review validation results, and import all valid rows in one batch.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            disabled={loadingPreview || importing}
            onChange={(event) => void handleFileChange(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-muted-foreground">
            Upload one `.xlsx` workbook. The importer skips the `Criteria` sheet automatically, and each data row becomes one one-way plan.
          </p>
          {selectedFileName ? (
            <div className="text-sm text-muted-foreground">Selected file: {selectedFileName}</div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{preview?.totalRows ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valid Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{preview?.validRows ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Duplicate Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{preview?.duplicateRows ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invalid Rows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{preview?.invalidRows ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validation Summary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {preview
            ? preview.invalidRows === 0
              ? preview.duplicateRows > 0
                ? `Validation passed. ${preview.importableRows} new rows will be imported and ${preview.duplicateRows} duplicate rows will be skipped automatically.`
                : "All rows passed validation. You can import the whole workbook now."
              : "At least one row failed validation. Import stays blocked until every row is valid."
            : "Upload a workbook to preview row-level validation results."}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview Table</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[80px]">Row No</TableHead>
                <TableHead className="min-w-[140px]">Status</TableHead>
                <TableHead className="min-w-[120px]">Offer ID</TableHead>
                <TableHead className="min-w-[120px]">Status Date</TableHead>
                <TableHead className="min-w-[120px]">Apply Date</TableHead>
                <TableHead className="min-w-[140px]">Availability Date</TableHead>
                <TableHead className="min-w-[180px]">Lessee</TableHead>
                <TableHead className="min-w-[120px]">Depot Code</TableHead>
                <TableHead className="min-w-[100px]">POL</TableHead>
                <TableHead className="min-w-[220px]">POD</TableHead>
                <TableHead className="min-w-[120px]">Size/Type</TableHead>
                <TableHead className="min-w-[120px]">Condition</TableHead>
                <TableHead className="min-w-[110px]">Color</TableHead>
                <TableHead className="min-w-[140px]">Machine Type</TableHead>
                <TableHead className="min-w-[90px] text-right">Quantity</TableHead>
                <TableHead className="min-w-[120px] text-right">Authorized Qty</TableHead>
                <TableHead className="min-w-[120px] text-right">Remaining Qty</TableHead>
                <TableHead className="min-w-[120px] text-right">Picked Up Qty</TableHead>
                <TableHead className="min-w-[140px] text-right">Non Picked Up Qty</TableHead>
                <TableHead className="min-w-[120px] text-right">Pick-up Charge</TableHead>
                <TableHead className="min-w-[100px] text-right">Free Days</TableHead>
                <TableHead className="min-w-[100px] text-right">Per Diem</TableHead>
                <TableHead className="min-w-[90px] text-right">DPP</TableHead>
                <TableHead className="min-w-[140px]">Shipper Request ID</TableHead>
                <TableHead className="min-w-[140px]">Onhire No</TableHead>
                <TableHead className="min-w-[180px]">Remarks</TableHead>
                <TableHead className="min-w-[320px]">Validation Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!preview ? (
                <TableRow>
                  <TableCell colSpan={27} className="h-24 text-center text-sm text-muted-foreground">
                    {loadingPreview ? "Building preview..." : "Upload a workbook to see preview rows."}
                  </TableCell>
                </TableRow>
              ) : preview.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={27} className="h-24 text-center text-sm text-muted-foreground">
                    No importable rows were found in this workbook.
                  </TableCell>
                </TableRow>
              ) : (
                preview.rows.map((row, index) => (
                  <TableRow key={`${row.sheetName}-${row.rowNo}`} className={rowClassName(row)}>
                    <TableCell>{row.rowNo}</TableCell>
                    <TableCell>{displayValue(row.status)}</TableCell>
                    <TableCell>{displayValue(row.offerId)}</TableCell>
                    <TableCell>{displayValue(row.statusDate)}</TableCell>
                    <TableCell>{displayValue(row.applyDate)}</TableCell>
                    <TableCell>{displayValue(row.availabilityDate)}</TableCell>
                    <TableCell>{displayValue(row.lessee)}</TableCell>
                    <TableCell>
                      {row.canChooseDepot ? (
                        <Select
                          value={row.selectedDepotId ?? "__EMPTY__"}
                          onValueChange={(value) =>
                            handleDepotSelection(index, value === "__EMPTY__" ? "" : value)
                          }
                        >
                          <SelectTrigger className="min-w-[170px]">
                            <SelectValue placeholder="Select depot" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__EMPTY__">Leave empty for now</SelectItem>
                            {row.depotCandidates.map((candidate) => (
                              <SelectItem key={candidate.id} value={candidate.id}>
                                {candidate.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        displayValue(row.depotCode)
                      )}
                    </TableCell>
                    <TableCell>{displayValue(row.pol)}</TableCell>
                    <TableCell>{displayValue(row.pod)}</TableCell>
                    <TableCell>{displayValue(row.sizeType)}</TableCell>
                    <TableCell>{displayValue(row.condition)}</TableCell>
                    <TableCell>{displayValue(row.color)}</TableCell>
                    <TableCell>{displayValue(row.machineType)}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.authorizedQty}</TableCell>
                    <TableCell className="text-right">{row.remainingQty}</TableCell>
                    <TableCell className="text-right">{row.pickedUpQty}</TableCell>
                    <TableCell className="text-right">{row.nonPickedUpQty}</TableCell>
                    <TableCell className="text-right">{row.pickupCharge}</TableCell>
                    <TableCell className="text-right">{row.freeDays}</TableCell>
                    <TableCell className="text-right">{row.perDiem}</TableCell>
                    <TableCell className="text-right">{row.dpp}</TableCell>
                    <TableCell>{displayValue(row.shipperRequestId)}</TableCell>
                    <TableCell>{displayValue(row.onhireNo)}</TableCell>
                    <TableCell>{displayValue(row.remarks)}</TableCell>
                    <TableCell>{displayValue(row.validationResult)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/dispatch/one-way-planning">Back</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loadingPreview || importing}
          onClick={handleReupload}
        >
          Re-upload
        </Button>
        <Button
          type="button"
          disabled={!preview || preview.invalidRows > 0 || loadingPreview || importing}
          onClick={() => void handleImport()}
        >
          {importing
            ? "Importing..."
            : preview?.duplicateRows
              ? `Import ${preview.importableRows} New Rows`
              : "Import"}
        </Button>
      </div>
    </div>
  );
}
