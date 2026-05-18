"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronUp, Download, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  exportDepotDispatchSummary,
  getDepotDispatchSummary,
  getVendorReleaseSelectorRows,
} from "@/app/depot-inventory/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  DepotDispatchSummaryQuery,
  DepotDispatchSummaryResult,
  DepotInventoryFilterOptions,
  DepotDispatchSummaryRow,
  VendorReleaseSelectorRow,
} from "@/types/depot-inventory";

type Props = {
  initial: DepotDispatchSummaryResult;
  filterOptions: DepotInventoryFilterOptions;
};

const PAGE_SIZE = 20;
const STICKY_RIGHT_HEAD_CLASS = "sticky right-0 z-30 bg-card";
const STICKY_RIGHT_CELL_CLASS = "sticky right-0 z-20 bg-card";

const EMPTY_FILTERS: DepotDispatchSummaryQuery = {
  region: "",
  city: "",
  depot: "",
  owner: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  page: 1,
  pageSize: PAGE_SIZE,
};

function downloadCsv(filename: string, rows: Array<Record<string, string | number | null | undefined>>) {
  const headers = Object.keys(rows[0] ?? {});
  const csvEscape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join(
    "\n"
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatDate(value: string | null | undefined) {
  return value || "-";
}

function formatVendorReleaseLabel(row: VendorReleaseSelectorRow) {
  return row.vendorReleaseNumber;
}

function appliedFilterSummary(filters: DepotDispatchSummaryQuery) {
  const parts: string[] = [];
  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.city) parts.push(`City: ${filters.city}`);
  if (filters.depot) parts.push(`Depot: ${filters.depot}`);
  if (filters.owner) parts.push(`Owner: ${filters.owner}`);
  if (filters.sizeType) parts.push(`Size/Type: ${filters.sizeType}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  if (filters.color) parts.push(`Color: ${filters.color}`);
  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);
  return parts.join(" | ");
}

function summaryViewHref(row: {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
}) {
  const params = new URLSearchParams({
    viewMode: "detail",
    page: "1",
    region: row.region === "-" ? "" : row.region,
    location: row.city === "-" ? "" : row.city,
    depot: row.depot === "-" ? "" : row.depot,
    sizeType: row.sizeType === "-" ? "" : row.sizeType,
    condition: row.condition === "-" ? "" : row.condition,
    color: row.color === "-" ? "" : row.color,
    machineType: row.machineType === "-" ? "" : row.machineType,
  });
  return `/depot-inventory?${params.toString()}`;
}

function dispatchReleaseHref(
  row: Pick<
    DepotDispatchSummaryRow,
    "id" | "region" | "city" | "depot" | "sizeType" | "condition" | "color" | "machineType"
  >,
  releaseSource: "INTERNAL_FACTORY" | "INTERNAL_DEPOT" | "VENDOR_REF",
  source?: Pick<VendorReleaseSelectorRow, "purchaseOrderId" | "purchaseOrderItemId" | "vendorReleaseNumber">
) {
  const params = new URLSearchParams({
    bucketId: row.id,
    region: row.region === "-" ? "" : row.region,
    city: row.city === "-" ? "" : row.city,
    depot: row.depot === "-" ? "" : row.depot,
    sizeType: row.sizeType === "-" ? "" : row.sizeType,
    condition: row.condition === "-" ? "" : row.condition,
    color: row.color === "-" ? "" : row.color,
    machineType: row.machineType === "-" ? "" : row.machineType,
    releaseSource,
  });
  if (source) {
    params.set("sourcePurchaseOrderId", source.purchaseOrderId);
    params.set("sourcePurchaseOrderItemId", source.purchaseOrderItemId);
    params.set("vendorReleaseNumber", source.vendorReleaseNumber);
  }
  return `/dispatch/dispatch-release/create?${params.toString()}`;
}

export function DepotDispatchSummaryDashboard({ initial, filterOptions }: Props) {
  const router = useRouter();
  const [draftFilters, setDraftFilters] = useState<DepotDispatchSummaryQuery>(initial.filters);
  const [result, setResult] = useState<DepotDispatchSummaryResult>(initial);
  const [loading, setLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [sourceSelectorRow, setSourceSelectorRow] = useState<DepotDispatchSummaryRow | null>(null);
  const [vendorSelectorRow, setVendorSelectorRow] = useState<DepotDispatchSummaryRow | null>(null);
  const [vendorRows, setVendorRows] = useState<VendorReleaseSelectorRow[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [selectedVendorRelease, setSelectedVendorRelease] = useState<string>("");

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const showingStart = result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const showingEnd = result.totalCount === 0 ? 0 : Math.min(result.totalCount, result.page * result.pageSize);
  const activeFiltersSummary = useMemo(() => appliedFilterSummary(result.filters), [result.filters]);

  async function runSearch(next: DepotDispatchSummaryQuery) {
    setLoading(true);
    try {
      const data = await getDepotDispatchSummary(next);
      setResult(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load summary for dispatch",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    const next = { ...draftFilters, page: 1 };
    setDraftFilters(next);
    await runSearch(next);
    setFiltersCollapsed(true);
  }

  async function handleReset() {
    const next = { ...EMPTY_FILTERS, pageSize: draftFilters.pageSize };
    setDraftFilters(next);
    await runSearch(next);
    setFiltersCollapsed(false);
  }

  async function handlePageChange(nextPage: number) {
    const next = { ...draftFilters, page: nextPage };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handlePageSizeChange(nextPageSize: number) {
    const next = { ...draftFilters, page: 1, pageSize: nextPageSize };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handleExport() {
    try {
      const exportResult = await exportDepotDispatchSummary({
        ...draftFilters,
        page: 1,
        pageSize: 5000,
      });
      if (exportResult.rows.length === 0) {
        toast({ title: "No rows to export" });
        return;
      }

      downloadCsv(
        `summary-for-dispatch-${new Date().toISOString().slice(0, 10)}.csv`,
        exportResult.rows.map((row) => ({
          Region: row.region,
          City: row.city,
          Depot: row.depot,
          "Size/Type": row.sizeType,
          Condition: row.condition,
          Color: row.color,
          "Machine Type": row.machineType,
          "Depot Inventory": row.depotInventoryQty,
          "Pending Outbound Qty": row.pendingOutboundQty,
          "Available Depot Qty": row.availableDepotQty,
          "Planned Dispatch Qty": row.plannedDispatchQty,
          "Plannable Depot Qty": row.plannableDepotQty,
          "Pending Offline/Release Qty": row.pendingOfflineQty,
          "Total Plannable Qty": row.totalPlannableQty,
          "Total Available Qty": row.totalAvailableQty,
          "Earliest Est Offline Date": row.earliestEstimatedOfflineDate,
          "Earliest Freeday Expiry Date": row.earliestFreedayExpiryDate,
          "Shortage Alert": row.shortageAlert ? "Alert" : "",
        }))
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export summary for dispatch",
        description: getErrorMessage(error),
      });
    }
  }

  function handleReleaseClick(row: DepotDispatchSummaryRow) {
    if (row.hasFactoryOrder && !row.hasNewOrUsedPurchase) {
      router.push(dispatchReleaseHref(row, "INTERNAL_FACTORY"));
      return;
    }
    setSelectedVendorRelease("");
    setSourceSelectorRow(row);
  }

  function handleSelectDepotInventory() {
    if (!sourceSelectorRow) return;
    router.push(dispatchReleaseHref(sourceSelectorRow, "INTERNAL_DEPOT"));
  }

  async function handleSelectVendorReference() {
    if (!sourceSelectorRow) return;
    setVendorLoading(true);
    setSelectedVendorRelease("");
    try {
      const rows = await getVendorReleaseSelectorRows({
        city: sourceSelectorRow.city,
        depot: sourceSelectorRow.depot,
        sizeType: sourceSelectorRow.sizeType,
        condition: sourceSelectorRow.condition,
        color: sourceSelectorRow.color,
        machineType: sourceSelectorRow.machineType,
      });
      setVendorRows(rows);
      setVendorSelectorRow(sourceSelectorRow);
      setSourceSelectorRow(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load vendor release rows",
        description: getErrorMessage(error),
      });
    } finally {
      setVendorLoading(false);
    }
  }

  function handleContinueVendorRelease() {
    if (!vendorSelectorRow || !selectedVendorRelease) return;
    const selected = vendorRows.find((row) => row.purchaseOrderItemId === selectedVendorRelease);
    if (!selected) return;
    router.push(dispatchReleaseHref(vendorSelectorRow, "VENDOR_REF", selected));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Summary for Dispatch</h1>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <Button asChild variant="outline">
                <Link href="/depot-inventory">Back to Depot Inventory</Link>
              </Button>
              <Button variant="outline" onClick={handleExport} disabled={loading}>
                <Download className="size-4" />
                Export
              </Button>
            </div>
          </div>

          <form
            className="rounded-xl border bg-muted/20 px-4 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSearch();
            }}
          >
            <div className="mt-1 flex w-full items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left"
                  onClick={() => setFiltersCollapsed((current) => !current)}
                  aria-expanded={!filtersCollapsed}
                  aria-controls="dispatch-summary-search-filters"
                >
                  <div className="text-sm font-semibold">Search Filters</div>
                  {filtersCollapsed ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  )}
                </button>
                {filtersCollapsed && activeFiltersSummary ? (
                  <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {activeFiltersSummary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={loading}>
                  <Search className="size-4" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleReset()} disabled={loading}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            {!filtersCollapsed ? (
              <div id="dispatch-summary-search-filters" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SearchableAutocompleteInput
                  label="Region"
                  placeholder="Fuzzy match region"
                  options={filterOptions.regions}
                  value={draftFilters.region}
                  inputValue={draftFilters.region}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, region: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, region: option?.value ?? "" }))
                  }
                />
                <SearchableAutocompleteInput
                  label="City"
                  placeholder="Fuzzy match city"
                  options={filterOptions.locations}
                  value={draftFilters.city}
                  inputValue={draftFilters.city}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, city: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, city: option?.value ?? "" }))
                  }
                />
                <SearchableAutocompleteInput
                  label="Depot"
                  placeholder="Fuzzy match depot"
                  options={filterOptions.depots}
                  value={draftFilters.depot}
                  inputValue={draftFilters.depot}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, depot: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, depot: option?.value ?? "" }))
                  }
                />
                <SearchableAutocompleteInput
                  label="Owner"
                  placeholder="Fuzzy match owner"
                  options={filterOptions.owners}
                  value={draftFilters.owner}
                  inputValue={draftFilters.owner}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, owner: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, owner: option?.value ?? "" }))
                  }
                />
                <SearchableAutocompleteInput
                  label="Size/Type"
                  placeholder="Fuzzy match size/type"
                  options={filterOptions.sizeTypes}
                  value={draftFilters.sizeType}
                  inputValue={draftFilters.sizeType}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, sizeType: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, sizeType: option?.value ?? "" }))
                  }
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Condition</label>
                  <Select
                    value={draftFilters.condition || "__all__"}
                    onValueChange={(value) =>
                      setDraftFilters((current) => ({
                        ...current,
                        condition: value === "__all__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Conditions</SelectItem>
                      {filterOptions.conditionCodes.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <SearchableAutocompleteInput
                  label="Color"
                  placeholder="Fuzzy match color"
                  options={filterOptions.colors}
                  value={draftFilters.color}
                  inputValue={draftFilters.color}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, color: value }))}
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, color: option?.value ?? "" }))
                  }
                />
                <SearchableAutocompleteInput
                  label="Machine Type"
                  placeholder="Fuzzy match machine type"
                  options={filterOptions.machineTypes}
                  value={draftFilters.machineType}
                  inputValue={draftFilters.machineType}
                  onInputChange={(value) =>
                    setDraftFilters((current) => ({ ...current, machineType: value }))
                  }
                  onSelect={(option) =>
                    setDraftFilters((current) => ({ ...current, machineType: option?.value ?? "" }))
                  }
                />
              </div>
            ) : null}
          </form>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle className="text-lg">Summary for Dispatch</CardTitle>
              <div className="flex items-center gap-2 self-start">
                <span className="text-sm text-muted-foreground">Page Size</span>
                <Select value={String(result.pageSize)} onValueChange={(value) => void handlePageSizeChange(Number(value))}>
                  <SelectTrigger className="h-8 w-24 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-12 px-3 text-xs">Region</TableHead>
                  <TableHead className="h-12 px-3 text-xs">City</TableHead>
                  <TableHead className="h-12 px-3 text-xs">Depot</TableHead>
                  <TableHead className="h-12 px-3 text-xs">Size/Type</TableHead>
                  <TableHead className="h-12 px-3 text-xs">Condition</TableHead>
                  <TableHead className="h-12 px-3 text-xs">Color</TableHead>
                  <TableHead className="h-12 px-3 text-xs">Machine Type</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Depot Inventory</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Pending Outbound Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Available Depot Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Planned Dispatch Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Plannable Depot Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Pending Offline/Release Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Total Plannable Qty</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Total Available Qty</TableHead>
                  <TableHead className="h-12 px-3 text-center text-xs">Earliest Est Offline Date</TableHead>
                  <TableHead className="h-12 px-3 text-center text-xs">Earliest Freeday Expiry Date</TableHead>
                  <TableHead className="h-12 px-3 text-center text-xs">Shortage Alert</TableHead>
                  <TableHead className={`h-12 px-3 text-center text-xs ${STICKY_RIGHT_HEAD_CLASS}`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={19} className="h-24 text-center text-sm text-muted-foreground">
                      No summary rows found.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-3 text-sm">{row.region}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.city}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.depot}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.sizeType}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.condition}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.color}</TableCell>
                      <TableCell className="px-3 py-3 text-sm">{row.machineType}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.depotInventoryQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.pendingOutboundQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.availableDepotQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.plannedDispatchQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.plannableDepotQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.pendingOfflineQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.totalPlannableQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.totalAvailableQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm">{formatDate(row.earliestEstimatedOfflineDate)}</TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm">{formatDate(row.earliestFreedayExpiryDate)}</TableCell>
                      <TableCell className="px-3 py-3 text-center text-sm">
                        {row.shortageAlert ? <Badge variant="destructive">Alert</Badge> : "-"}
                      </TableCell>
                      <TableCell className={`px-3 py-3 text-center ${STICKY_RIGHT_CELL_CLASS}`}>
                        <div className="flex items-center justify-center gap-2">
                          <Button asChild size="sm" variant="outline" className="h-8 px-3 text-sm">
                            <Link href={summaryViewHref(row)}>View</Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-sm"
                            onClick={() => handleReleaseClick(row)}
                          >
                            Release
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <StandardTablePagination
            summary={`Showing ${showingStart}-${showingEnd} of ${result.totalCount} summary rows`}
            page={result.page}
            totalPages={totalPages}
            onPrevious={() => void handlePageChange(Math.max(1, result.page - 1))}
            onNext={() => void handlePageChange(Math.min(totalPages, result.page + 1))}
            previousDisabled={loading || result.page <= 1}
            nextDisabled={loading || result.page >= totalPages}
          />
        </Card>
      </div>

      <Dialog open={Boolean(sourceSelectorRow)} onOpenChange={(open) => !open && setSourceSelectorRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Release Source</DialogTitle>
            <DialogDescription>
              Choose whether this release comes from our depot inventory or references a vendor release.
            </DialogDescription>
          </DialogHeader>
          {sourceSelectorRow ? (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm md:grid-cols-2">
              <div><span className="font-medium">City:</span> {sourceSelectorRow.city}</div>
              <div><span className="font-medium">Depot:</span> {sourceSelectorRow.depot}</div>
              <div><span className="font-medium">Size/Type:</span> {sourceSelectorRow.sizeType}</div>
              <div><span className="font-medium">Condition:</span> {sourceSelectorRow.condition}</div>
              <div><span className="font-medium">Color:</span> {sourceSelectorRow.color}</div>
              <div><span className="font-medium">Machine Type:</span> {sourceSelectorRow.machineType}</div>
              <div><span className="font-medium">Available Depot Qty:</span> {sourceSelectorRow.availableDepotQty}</div>
              <div>
                <span className="font-medium">Source Mix:</span>{" "}
                {sourceSelectorRow.hasFactoryOrder && sourceSelectorRow.hasNewOrUsedPurchase
                  ? "Factory + New/Used"
                  : sourceSelectorRow.hasFactoryOrder
                    ? "Factory Only"
                    : "New/Used Only"}
              </div>
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setSourceSelectorRow(null)}>
              Cancel
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleSelectDepotInventory}>
                Depot Inventory
              </Button>
              <Button type="button" onClick={() => void handleSelectVendorReference()} disabled={vendorLoading}>
                Reference Vendor Release
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vendorSelectorRow)} onOpenChange={(open) => !open && setVendorSelectorRow(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Vendor Release Selector</DialogTitle>
            <DialogDescription>
              Select one vendor release source with remaining quantity greater than zero.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Vendor Release Number</TableHead>
                  <TableHead className="min-w-[140px]">Expiry Date</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead>PO Item</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Used Qty</TableHead>
                  <TableHead className="text-right">Remaining Qty</TableHead>
                  <TableHead className="text-center">Attachment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="h-24 text-center text-sm text-muted-foreground">
                      No vendor release rows found for this bucket.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorRows.map((row) => (
                    <TableRow
                      key={row.purchaseOrderItemId}
                      className={selectedVendorRelease === row.purchaseOrderItemId ? "bg-muted/40" : undefined}
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name="vendor-release-row"
                          checked={selectedVendorRelease === row.purchaseOrderItemId}
                          onChange={() => setSelectedVendorRelease(row.purchaseOrderItemId)}
                        />
                      </TableCell>
                      <TableCell>{formatVendorReleaseLabel(row)}</TableCell>
                      <TableCell className="min-w-[140px] whitespace-nowrap">{formatDate(row.expiryDate)}</TableCell>
                      <TableCell>{row.orderNo}</TableCell>
                      <TableCell>{row.lineNo}</TableCell>
                      <TableCell>{row.depotName}</TableCell>
                      <TableCell>{row.sizeType}</TableCell>
                      <TableCell>{row.condition}</TableCell>
                      <TableCell>{row.color}</TableCell>
                      <TableCell>{row.machineType}</TableCell>
                      <TableCell className="text-right">{row.sourceTotalQty}</TableCell>
                      <TableCell className="text-right">{row.vendorReleaseUsedQty}</TableCell>
                      <TableCell className="text-right">{row.remainingQty}</TableCell>
                      <TableCell className="text-center">
                        {row.hasVendorReleaseAttachment ? "Yes" : "No"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVendorSelectorRow(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleContinueVendorRelease} disabled={!selectedVendorRelease}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
