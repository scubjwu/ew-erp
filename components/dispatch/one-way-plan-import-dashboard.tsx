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
import {
  recomputeOneWayPlanImportPreviewRow,
  summarizeOneWayPlanImportRows,
} from "@/lib/one-way-plan-import-preview";
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

  function handleDepotSelection(rowIndex: number, depotId: string) {
    setPreview((current) => {
      if (!current) return current;
      const rows = current.rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const selected = row.depotCandidates.find((candidate) => candidate.id === depotId) ?? null;
        return recomputeOneWayPlanImportPreviewRow({
          ...row,
          depotCode: selected?.code ?? "",
          selectedDepotId: selected?.id ?? null,
          selectedDepotCode: selected?.code ?? null,
        });
      });
      const summary = summarizeOneWayPlanImportRows(rows);
      return {
        ...current,
        rows,
        ...summary,
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
            : result.importableRows > 0
              ? `${result.importableRows} valid rows can be imported now. ${result.invalidRows} rows still need fixes and will be skipped.`
              : `${result.invalidRows} rows have blocking issues. Check the Fix Needed and Depot columns to resolve them.`,
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
            ? `${result.insertedCount} one way plans were created, ${result.skippedCount} rows were skipped.`
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
          Upload a CMA Excel report, review validation results, and import valid rows in one batch.
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
              : preview.importableRows > 0
                ? `${preview.importableRows} valid rows can be imported now. ${preview.invalidRows} rows still need fixes and will be skipped.`
                : "No rows are currently importable. Fix the blocking issues below to continue."
            : "Upload a workbook to preview row-level validation results."}
          {preview?.invalidRows ? (
            <div className="mt-2 text-sm">
              Rows highlighted in red contain blocking errors. Fix Needed shows exactly what must be
              corrected before import, while valid rows can still be imported immediately.
            </div>
          ) : null}
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
                <TableHead className="min-w-[130px]">Import Status</TableHead>
                <TableHead className="min-w-[240px]">Fix Needed</TableHead>
                <TableHead className="min-w-[140px]">Offer Status</TableHead>
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
                <TableHead className="min-w-[320px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!preview ? (
                <TableRow>
                  <TableCell colSpan={29} className="h-24 text-center text-sm text-muted-foreground">
                    {loadingPreview ? "Building preview..." : "Upload a workbook to see preview rows."}
                  </TableCell>
                </TableRow>
              ) : preview.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={29} className="h-24 text-center text-sm text-muted-foreground">
                    No importable rows were found in this workbook.
                  </TableCell>
                </TableRow>
              ) : (
                preview.rows.map((row, index) => (
                  <TableRow key={`${row.sheetName}-${row.rowNo}`} className={rowClassName(row)}>
                    <TableCell>{row.rowNo}</TableCell>
                    <TableCell>
                      {row.skipReason ? "Will Skip" : row.isValid ? "Ready" : "Needs Fix"}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {row.blockingErrors.map((message) => (
                          <div key={message} className="text-xs font-medium text-destructive">
                            {message}
                          </div>
                        ))}
                        {row.fixHints.map((message) => (
                          <div key={message} className="text-xs text-amber-700">
                            {message}
                          </div>
                        ))}
                        {row.blockingErrors.length === 0 && row.fixHints.length === 0 ? (
                          <div className="text-xs text-muted-foreground">
                            {row.skipReason ? "No fix needed; duplicate row will be skipped." : "Valid"}
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{displayValue(row.status)}</TableCell>
                    <TableCell>{displayValue(row.offerId)}</TableCell>
                    <TableCell>{displayValue(row.statusDate)}</TableCell>
                    <TableCell>{displayValue(row.applyDate)}</TableCell>
                    <TableCell>{displayValue(row.availabilityDate)}</TableCell>
                    <TableCell>{displayValue(row.lessee)}</TableCell>
                    <TableCell>
                      {row.canChooseDepot ? (
                        <Select
                          value={row.selectedDepotId ?? ""}
                          onValueChange={(value) => handleDepotSelection(index, value)}
                        >
                          <SelectTrigger className="min-w-[170px]">
                            <SelectValue placeholder="Select depot" />
                          </SelectTrigger>
                          <SelectContent>
                            {row.depotCandidates.map((candidate) => (
                              <SelectItem key={candidate.id} value={candidate.id}>
                                {candidate.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : row.depotSelectionBlockedReason ? (
                        <div className="text-xs text-destructive">{row.depotSelectionBlockedReason}</div>
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
          disabled={!preview || preview.importableRows === 0 || loadingPreview || importing}
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
