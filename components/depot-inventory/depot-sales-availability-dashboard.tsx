"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Download, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  exportDepotSalesAvailability,
  getDepotSalesAvailability,
} from "@/app/depot-inventory/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DepotInventoryFilterOptions,
  DepotSalesAvailabilityQuery,
  DepotSalesAvailabilityResult,
} from "@/types/depot-inventory";

type Props = {
  initial: DepotSalesAvailabilityResult;
  filterOptions: DepotInventoryFilterOptions;
};

const PAGE_SIZE = 20;
const STICKY_RIGHT_HEAD_CLASS = "sticky right-0 z-30 bg-card";
const STICKY_RIGHT_CELL_CLASS = "sticky right-0 z-20 bg-card";

const EMPTY_FILTERS: DepotSalesAvailabilityQuery = {
  region: "",
  city: "",
  depot: "",
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

function appliedFilterSummary(filters: DepotSalesAvailabilityQuery) {
  const parts: string[] = [];
  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.city) parts.push(`City: ${filters.city}`);
  if (filters.depot) parts.push(`Depot: ${filters.depot}`);
  if (filters.sizeType) parts.push(`Size/Type: ${filters.sizeType}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  if (filters.color) parts.push(`Color: ${filters.color}`);
  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);
  return parts.join(" | ");
}

function salesViewHref(row: {
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  flpLbeod: string;
}) {
  const [flp = "No", lbx = "No", eod = "No"] = row.flpLbeod.split("/").map((value) => value.trim());
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
    flpValue: flp === "FLP" ? "yes" : "no",
    lbxValue: lbx === "LBX" ? "yes" : "no",
    eodValue: eod === "Yes" ? "yes" : "no",
  });
  return `/depot-inventory?${params.toString()}`;
}

export function DepotSalesAvailabilityDashboard({ initial, filterOptions }: Props) {
  const [draftFilters, setDraftFilters] = useState<DepotSalesAvailabilityQuery>(initial.filters);
  const [result, setResult] = useState<DepotSalesAvailabilityResult>(initial);
  const [loading, setLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const showingStart = result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const showingEnd =
    result.totalCount === 0 ? 0 : Math.min(result.totalCount, result.page * result.pageSize);
  const activeFiltersSummary = useMemo(() => appliedFilterSummary(result.filters), [result.filters]);

  async function runSearch(next: DepotSalesAvailabilityQuery) {
    setLoading(true);
    try {
      const data = await getDepotSalesAvailability(next);
      setResult(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load sales availability",
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
      const exportResult = await exportDepotSalesAvailability({
        ...draftFilters,
        page: 1,
        pageSize: 5000,
      });
      if (exportResult.rows.length === 0) {
        toast({ title: "No rows to export" });
        return;
      }

      downloadCsv(
        `sales-availability-${new Date().toISOString().slice(0, 10)}.csv`,
        exportResult.rows.map((row) => ({
          Region: row.region,
          City: row.city,
          Depot: row.depot,
          "Size/Type": row.sizeType,
          Condition: row.condition,
          Color: row.color,
          "Machine Type": row.machineType,
          "FLP/LB/EOD": row.flpLbeod,
          Total: row.totalQty,
          Reserved: row.reservedQty,
          Invoiced: row.invoicedQty,
          Available: row.availableQty,
        }))
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export sales availability",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Sales Availability</h1>
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
                  aria-controls="sales-availability-search-filters"
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
              <div id="sales-availability-search-filters" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <SearchableAutocompleteInput
                  label="Region"
                  placeholder="Fuzzy match region"
                  options={filterOptions.regions}
                  value={draftFilters.region}
                  inputValue={draftFilters.region}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, region: value }))}
                  onSelect={(option) => setDraftFilters((current) => ({ ...current, region: option?.value ?? "" }))}
                />
                <SearchableAutocompleteInput
                  label="City"
                  placeholder="Fuzzy match city"
                  options={filterOptions.locations}
                  value={draftFilters.city}
                  inputValue={draftFilters.city}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, city: value }))}
                  onSelect={(option) => setDraftFilters((current) => ({ ...current, city: option?.value ?? "" }))}
                />
                <SearchableAutocompleteInput
                  label="Depot"
                  placeholder="Fuzzy match depot"
                  options={filterOptions.depots}
                  value={draftFilters.depot}
                  inputValue={draftFilters.depot}
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, depot: value }))}
                  onSelect={(option) => setDraftFilters((current) => ({ ...current, depot: option?.value ?? "" }))}
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
                  onInputChange={(value) => setDraftFilters((current) => ({ ...current, machineType: value }))}
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
              <CardTitle className="text-lg">Sales Availability</CardTitle>
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
                  <TableHead className="h-12 px-3 text-xs">FLP/LB/EOD</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Total</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Reserved</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Invoiced</TableHead>
                  <TableHead className="h-12 px-3 text-right text-xs">Available</TableHead>
                  <TableHead className={`h-12 px-3 text-center text-xs ${STICKY_RIGHT_HEAD_CLASS}`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-sm text-muted-foreground">
                      No sales availability rows found.
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
                      <TableCell className="px-3 py-3 text-sm">{row.flpLbeod}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.totalQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.reservedQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.invoicedQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className="px-3 py-3 text-right text-sm tabular-nums">{row.availableQty.toLocaleString("en-US")}</TableCell>
                      <TableCell className={`px-3 py-3 text-center ${STICKY_RIGHT_CELL_CLASS}`}>
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline" disabled className="h-8 px-3 text-sm">
                            Reserve
                          </Button>
                          <Button size="sm" variant="outline" disabled className="h-8 px-3 text-sm">
                            Invoice
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-8 px-3 text-sm">
                            <Link href={salesViewHref(row)}>View</Link>
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
            summary={`Showing ${showingStart}-${showingEnd} of ${result.totalCount} sales rows`}
            page={result.page}
            totalPages={totalPages}
            onPrevious={() => void handlePageChange(Math.max(1, result.page - 1))}
            onNext={() => void handlePageChange(Math.min(totalPages, result.page + 1))}
            previousDisabled={loading || result.page <= 1}
            nextDisabled={loading || result.page >= totalPages}
          />
        </Card>
      </div>
    </div>
  );
}
