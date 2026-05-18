"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Download, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { exportDepotInventory, getDepotInventory } from "@/app/depot-inventory/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Badge } from "@/components/ui/badge";
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
import type {
  DepotInventoryContainerRow,
  DepotInventoryDaysBucket,
  DepotInventoryFilterOptions,
  DepotInventoryQuery,
  DepotInventoryRangeRow,
  DepotInventoryResult,
  DepotInventoryStatus,
} from "@/types/depot-inventory";

type Props = {
  initial: DepotInventoryResult;
  filterOptions: DepotInventoryFilterOptions;
};

type DepotInventoryModeKey = "container" | "po_item" | "po_item_effective_date";

const PAGE_SIZE = 20;

const EMPTY_FILTERS: DepotInventoryQuery = {
  region: "",
  location: "",
  depot: "",
  status: "",
  flpValue: "",
  lbxValue: "",
  eodValue: "",
  machineType: "",
  purchaseType: "",
  supplier: "",
  purchaseOrderNo: "",
  releaseNumber: "",
  sizeType: "",
  condition: "",
  color: "",
  containerNumber: "",
  containerNumberStart: "",
  containerNumberEnd: "",
  estimatedOfflineDateStart: "",
  estimatedOfflineDateEnd: "",
  offlineDateStart: "",
  offlineDateEnd: "",
  daysInDepot: "",
  viewMode: "detail",
  rangeGrouping: "po_item",
  page: 1,
  pageSize: PAGE_SIZE,
};

const STATUS_OPTIONS = [
  { value: "__all__", label: "Purchased + In Yard" },
  { value: "PURCHASED", label: "Purchased" },
  { value: "IN_YARD", label: "In Yard" },
] as const;

const PURCHASE_TYPE_OPTIONS = [
  { value: "__all__", label: "All Purchase Types" },
  { value: "FACTORY_ORDER", label: "Factory Order" },
  { value: "USED_CONTAINER", label: "Used Container" },
  { value: "NEW_CONTAINER", label: "New Container" },
] as const;

const DAYS_BUCKET_OPTIONS: Array<{ value: DepotInventoryDaysBucket | "__all__"; label: string }> = [
  { value: "__all__", label: "All Days" },
  { value: "0_7", label: "0-7 days" },
  { value: "8_15", label: "8-15 days" },
  { value: "16_30", label: "16-30 days" },
  { value: "31_60", label: "31-60 days" },
  { value: "61_plus", label: "61+ days" },
];

const STICKY_FIRST_HEAD_CLASS =
  "sticky left-0 top-0 z-30 min-w-[180px] bg-card py-2 text-xs uppercase tracking-wide";
const STICKY_FIRST_CELL_CLASS = "sticky left-0 z-20 bg-card font-medium";

function formatDate(value: string | null | undefined) {
  return value || "-";
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

function statusVariant(status: string) {
  return status === "IN_YARD" ? "default" : "outline";
}

function modeKeyFromFilters(filters: DepotInventoryQuery): DepotInventoryModeKey {
  if (filters.viewMode === "detail") return "container";
  return filters.rangeGrouping === "po_item_effective_date" ? "po_item_effective_date" : "po_item";
}

function appliedFilterSummary(filters: DepotInventoryQuery) {
  const parts: string[] = [];
  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.location) parts.push(`Location: ${filters.location}`);
  if (filters.depot) parts.push(`Depot: ${filters.depot}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);
  if (filters.purchaseType) parts.push(`Purchase Type: ${filters.purchaseType}`);
  if (filters.supplier) parts.push(`Vendor: ${filters.supplier}`);
  if (filters.purchaseOrderNo) parts.push(`PO: ${filters.purchaseOrderNo}`);
  if (filters.releaseNumber) parts.push(`Release: ${filters.releaseNumber}`);
  if (filters.sizeType) parts.push(`Size/Type: ${filters.sizeType}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  if (filters.color) parts.push(`Color: ${filters.color}`);
  if (filters.containerNumber) parts.push(`Container: ${filters.containerNumber}`);
  if (filters.estimatedOfflineDateStart) parts.push(`Est. Offline Start: ${filters.estimatedOfflineDateStart}`);
  if (filters.estimatedOfflineDateEnd) parts.push(`Est. Offline End: ${filters.estimatedOfflineDateEnd}`);
  if (filters.offlineDateStart) parts.push(`Offline Start: ${filters.offlineDateStart}`);
  if (filters.offlineDateEnd) parts.push(`Offline End: ${filters.offlineDateEnd}`);
  if (filters.daysInDepot) {
    const label = DAYS_BUCKET_OPTIONS.find((option) => option.value === filters.daysInDepot)?.label;
    parts.push(`Days in Depot: ${label ?? filters.daysInDepot}`);
  }
  return parts.join(" | ");
}

export function DepotInventoryDashboard({ initial, filterOptions }: Props) {
  const [draftFilters, setDraftFilters] = useState<DepotInventoryQuery>(initial.filters);
  const [result, setResult] = useState<DepotInventoryResult>(initial);
  const [loading, setLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [detailPurchaseType, setDetailPurchaseType] = useState(initial.filters.purchaseType);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const showingStart = result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const showingEnd = result.totalCount === 0 ? 0 : Math.min(result.totalCount, result.page * result.pageSize);
  const activeFiltersSummary = useMemo(() => appliedFilterSummary(result.filters), [result.filters]);
  const currentModeKey = modeKeyFromFilters(result.filters);
  const isRangeView = draftFilters.viewMode === "range";

  async function runSearch(next: DepotInventoryQuery) {
    setLoading(true);
    try {
      const data = await getDepotInventory(next);
      setResult(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load depot inventory",
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
    const next: DepotInventoryQuery = {
      ...EMPTY_FILTERS,
      viewMode: draftFilters.viewMode,
      rangeGrouping: draftFilters.rangeGrouping,
      pageSize: draftFilters.pageSize,
      purchaseType: draftFilters.viewMode === "range" ? "FACTORY_ORDER" : detailPurchaseType,
    };
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

  async function handleModeChange(mode: DepotInventoryModeKey) {
    const next: DepotInventoryQuery =
      mode === "container"
        ? {
            ...draftFilters,
            viewMode: "detail",
            rangeGrouping: "po_item",
            purchaseType: detailPurchaseType,
            page: 1,
          }
        : {
            ...draftFilters,
            viewMode: "range",
            rangeGrouping: mode === "po_item" ? "po_item" : "po_item_effective_date",
            purchaseType: "FACTORY_ORDER",
            page: 1,
          };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handleExport() {
    try {
      const exportResult = await exportDepotInventory({
        ...draftFilters,
        page: 1,
        pageSize: 5000,
      });
      const rows = exportResult.rows as Array<DepotInventoryContainerRow | DepotInventoryRangeRow>;
      if (rows.length === 0) {
        toast({ title: "No rows to export" });
        return;
      }

      const exportRows =
        exportResult.filters.viewMode === "range"
          ? (rows as DepotInventoryRangeRow[]).map((row) => ({
              "Container Number Range": row.containerNumberRange,
              "Size/Type": row.sizeType,
              Condition: row.condition,
              "Color Code": row.colorCode,
              YOM: row.yom,
              "FLP/LB/EOD": row.flpLbeod,
              "Machine Type": row.machineType,
              Status: row.status,
              "City / Location": row.location,
              Depot: row.depot,
              Owner: row.owner,
              "Planned POD": row.plannedPod,
              "Purchase Type": row.purchaseType,
              "Purchase Order No": row.purchaseOrderNo,
              "Estimated Offline Date": row.estimatedOfflineDate,
              "Offline Date / Release Date": row.offlineDate,
            }))
          : (rows as DepotInventoryContainerRow[]).map((row) => {
              const base: Record<string, string | number | null> = {
                "Container Number": row.containerNumber,
                "Size/Type": row.sizeType,
                Condition: row.condition,
                "Color Code": row.colorCode,
                YOM: row.yom,
                "FLP/LB/EOD": row.flpLbeod,
                "Machine Type": row.machineType,
                Status: row.status,
                "City / Location": row.location,
                Depot: row.depot,
                Owner: row.owner,
                "Planned POD": row.plannedPod,
                "Purchase Type": row.purchaseType,
                "Purchase Order No": row.purchaseOrderNo,
                "Estimated Offline Date": row.estimatedOfflineDate,
                "Offline Date / Release Date": row.offlineDate,
                "Gate In Date": row.gateInDate,
                "Days in Depot": row.daysInDepot,
                "Depot Cost": row.depotCost,
              };

              if (exportResult.canViewPurchasePrice) {
                base["Purchase Price"] = row.purchasePrice;
              }

              return base;
            });

      downloadCsv(
        `depot-inventory-${exportResult.filters.viewMode}-${new Date().toISOString().slice(0, 10)}.csv`,
        exportRows
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export depot inventory",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Depot Inventory</h1>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <Button asChild variant="outline">
                <Link href="/depot-inventory/summary-for-dispatch">Summary for Dispatch</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/depot-inventory/sales-availability">Sales Availability</Link>
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
            <div className="space-y-2 border-b pb-3">
              <div className="text-sm font-medium">View Mode</div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={currentModeKey === "container" ? "default" : "outline"}
                  onClick={() => void handleModeChange("container")}
                  disabled={loading}
                >
                  View by Container Number
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={currentModeKey === "po_item" ? "default" : "outline"}
                  onClick={() => void handleModeChange("po_item")}
                  disabled={loading}
                >
                  View by PO Item
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={currentModeKey === "po_item_effective_date" ? "default" : "outline"}
                  onClick={() => void handleModeChange("po_item_effective_date")}
                  disabled={loading}
                >
                  View by PO Item & Effective Date
                </Button>
              </div>
            </div>

            <div className="mt-3 flex w-full items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left"
                  onClick={() => setFiltersCollapsed((current) => !current)}
                  aria-expanded={!filtersCollapsed}
                  aria-controls="depot-inventory-search-filters"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReset()}
                  disabled={loading}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            {!filtersCollapsed ? (
              <div id="depot-inventory-search-filters" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                value={draftFilters.location}
                inputValue={draftFilters.location}
                onInputChange={(value) => setDraftFilters((current) => ({ ...current, location: value }))}
                onSelect={(option) =>
                  setDraftFilters((current) => ({ ...current, location: option?.value ?? "" }))
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Days in Depot</label>
                <Select
                  value={draftFilters.daysInDepot || "__all__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      daysInDepot: value === "__all__" ? "" : (value as DepotInventoryDaysBucket),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select days bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_BUCKET_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SearchableAutocompleteInput
                label="Container Number"
                placeholder="Fuzzy match container number"
                options={filterOptions.containerNumbers}
                value={draftFilters.containerNumber}
                inputValue={draftFilters.containerNumber}
                onInputChange={(value) =>
                  setDraftFilters((current) => ({ ...current, containerNumber: value }))
                }
                onSelect={(option) =>
                  setDraftFilters((current) => ({ ...current, containerNumber: option?.value ?? "" }))
                }
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Container Number Range Start</label>
                <Input
                  value={draftFilters.containerNumberStart}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      containerNumberStart: event.target.value,
                    }))
                  }
                  placeholder="Start container number"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Container Number Range End</label>
                <Input
                  value={draftFilters.containerNumberEnd}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      containerNumberEnd: event.target.value,
                    }))
                  }
                  placeholder="End container number"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={draftFilters.status || "__all__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      status: value === "__all__" ? "" : (value as DepotInventoryStatus),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

              <SearchableAutocompleteInput
                label="Vendor"
                placeholder="Fuzzy match vendor"
                options={filterOptions.suppliers}
                value={draftFilters.supplier}
                inputValue={draftFilters.supplier}
                onInputChange={(value) => setDraftFilters((current) => ({ ...current, supplier: value }))}
                onSelect={(option) =>
                  setDraftFilters((current) => ({ ...current, supplier: option?.value ?? "" }))
                }
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Purchase Type</label>
                <Select
                  value={(draftFilters.viewMode === "range" ? "FACTORY_ORDER" : draftFilters.purchaseType) || "__all__"}
                  disabled={draftFilters.viewMode === "range"}
                  onValueChange={(value) => {
                    const purchaseType = value === "__all__" ? "" : value;
                    setDetailPurchaseType(purchaseType);
                    setDraftFilters((current) => ({
                      ...current,
                      purchaseType,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purchase type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURCHASE_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <SearchableAutocompleteInput
                label="Purchase Order No"
                placeholder="Fuzzy match PO number"
                options={filterOptions.purchaseOrders}
                value={draftFilters.purchaseOrderNo}
                inputValue={draftFilters.purchaseOrderNo}
                onInputChange={(value) =>
                  setDraftFilters((current) => ({ ...current, purchaseOrderNo: value }))
                }
                onSelect={(option) =>
                  setDraftFilters((current) => ({ ...current, purchaseOrderNo: option?.value ?? "" }))
                }
              />
              <SearchableAutocompleteInput
                label="Release(from PO item)"
                placeholder="Fuzzy match release"
                options={filterOptions.releases}
                value={draftFilters.releaseNumber}
                inputValue={draftFilters.releaseNumber}
                onInputChange={(value) => setDraftFilters((current) => ({ ...current, releaseNumber: value }))}
                onSelect={(option) =>
                  setDraftFilters((current) => ({ ...current, releaseNumber: option?.value ?? "" }))
                }
              />

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Estimated Offline Date Start</label>
                <Input
                  type="date"
                  value={draftFilters.estimatedOfflineDateStart}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      estimatedOfflineDateStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Estimated Offline Date End</label>
                <Input
                  type="date"
                  value={draftFilters.estimatedOfflineDateEnd}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      estimatedOfflineDateEnd: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Offline Date / Release Date Start</label>
                <Input
                  type="date"
                  value={draftFilters.offlineDateStart}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      offlineDateStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Offline Date / Release Date End</label>
                <Input
                  type="date"
                  value={draftFilters.offlineDateEnd}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      offlineDateEnd: event.target.value,
                    }))
                  }
                />
              </div>
              </div>
            ) : null}
          </form>

          {isRangeView ? (
            <div className="mt-4 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              Range views show Factory Order rows only. `View by PO Item` groups by purchase order item. `View by PO Item & Effective Date` further groups by offline date, or estimated offline date when offline date is blank.
            </div>
          ) : null}
        </div>

        <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle>
              {result.filters.viewMode === "range" ? "Range Summary" : "Container Detail"}
            </CardTitle>
            <div className="flex items-center gap-2 self-start">
              <span className="text-sm text-muted-foreground">Page Size</span>
              <Select
                value={String(result.pageSize)}
                onValueChange={(value) => void handlePageSizeChange(Number(value))}
              >
                <SelectTrigger className="h-9 w-24">
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
              {result.filters.viewMode === "range" ? (
                <TableRow>
                  <TableHead className={STICKY_FIRST_HEAD_CLASS}>Container Number Range</TableHead>
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color Code</TableHead>
                  <TableHead>YOM</TableHead>
                  <TableHead>FLP/LB/EOD</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City / Location</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Planned POD</TableHead>
                  <TableHead>Purchase Type</TableHead>
                  <TableHead>Purchase Order No</TableHead>
                  <TableHead>Estimated Offline Date</TableHead>
                  <TableHead>Offline Date / Release Date</TableHead>
                </TableRow>
              ) : (
                <TableRow>
                  <TableHead className={STICKY_FIRST_HEAD_CLASS}>Container Number</TableHead>
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color Code</TableHead>
                  <TableHead>YOM</TableHead>
                  <TableHead>FLP/LB/EOD</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>City / Location</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Planned POD</TableHead>
                  <TableHead>Purchase Type</TableHead>
                  <TableHead>Purchase Order No</TableHead>
                  <TableHead>Estimated Offline Date</TableHead>
                  <TableHead>Offline Date / Release Date</TableHead>
                  <TableHead>Gate In Date</TableHead>
                  <TableHead>Days in Depot</TableHead>
                  <TableHead>Depot Cost</TableHead>
                  {result.canViewPurchasePrice ? <TableHead>Purchase Price</TableHead> : null}
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={result.filters.viewMode === "range" ? 16 : result.canViewPurchasePrice ? 20 : 19}
                    className="h-24 text-center text-sm text-muted-foreground"
                  >
                    No depot inventory rows found.
                  </TableCell>
                </TableRow>
              ) : result.filters.viewMode === "range" ? (
                (result.rows as DepotInventoryRangeRow[]).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className={STICKY_FIRST_CELL_CLASS}>{row.containerNumberRange}</TableCell>
                    <TableCell>{row.sizeType}</TableCell>
                    <TableCell>{row.condition}</TableCell>
                    <TableCell>{row.colorCode}</TableCell>
                    <TableCell>{row.yom || "-"}</TableCell>
                    <TableCell>{row.flpLbeod}</TableCell>
                    <TableCell>{row.machineType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell>{row.depot}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.plannedPod}</TableCell>
                    <TableCell>{row.purchaseType}</TableCell>
                    <TableCell>{row.purchaseOrderNo}</TableCell>
                    <TableCell>{formatDate(row.estimatedOfflineDate)}</TableCell>
                    <TableCell>{formatDate(row.offlineDate)}</TableCell>
                  </TableRow>
                ))
              ) : (
                (result.rows as DepotInventoryContainerRow[]).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className={STICKY_FIRST_CELL_CLASS}>{row.containerNumber ?? "-"}</TableCell>
                    <TableCell>{row.sizeType}</TableCell>
                    <TableCell>{row.condition}</TableCell>
                    <TableCell>{row.colorCode}</TableCell>
                    <TableCell>{row.yom?.toLocaleString("en-US") ?? "-"}</TableCell>
                    <TableCell>{row.flpLbeod}</TableCell>
                    <TableCell>{row.machineType}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{row.location}</TableCell>
                    <TableCell>{row.depot}</TableCell>
                    <TableCell>{row.owner}</TableCell>
                    <TableCell>{row.plannedPod}</TableCell>
                    <TableCell>{row.purchaseType}</TableCell>
                    <TableCell>{row.purchaseOrderNo}</TableCell>
                    <TableCell>{formatDate(row.estimatedOfflineDate)}</TableCell>
                    <TableCell>{formatDate(row.offlineDate)}</TableCell>
                    <TableCell>{formatDate(row.gateInDate)}</TableCell>
                    <TableCell>{row.daysInDepot ?? "-"}</TableCell>
                    <TableCell>{formatCurrency(row.depotCost)}</TableCell>
                    {result.canViewPurchasePrice ? (
                      <TableCell>{formatCurrency(row.purchasePrice)}</TableCell>
                    ) : null}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <StandardTablePagination
          summary={`Showing ${showingStart}-${showingEnd} of ${result.totalCount} ${
            result.filters.viewMode === "range" ? "groups" : "containers"
          }`}
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
