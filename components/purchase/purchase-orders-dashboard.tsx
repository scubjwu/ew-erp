"use client";

import {
  ChevronDown,
  ChevronUp,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Pencil,
  RotateCcw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getPurchaseOrderEditPermissions,
  type PurchaseOrderStatus,
  type PurchaseType,
} from "@/types/purchase";
import {
  exportPurchaseOrders,
  getPurchaseOrders,
  type PurchaseAutocompleteOption,
  type PurchaseFilterOptions,
  type PurchaseManagementSortBy,
  type PurchaseManagementSortDirection,
  type PurchaseOrderManagementResult,
} from "@/app/purchase/po-management/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
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
import { applyQuickFilterDates } from "@/app/purchase/po-management/query-helpers";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
} from "@/components/shared/page-standard/table-standard";

type Props = {
  initial: PurchaseOrderManagementResult;
  pageSize: number;
  filterOptions: PurchaseFilterOptions;
};

type SearchFilters = PurchaseOrderManagementResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  vendorId: "",
  locationCityId: "",
  color: "",
  sizeType: "",
  conditionId: "",
  orderDateFrom: "",
  orderDateTo: "",
  orderStatus: "",
  quickFilter: "",
};

const QUICK_FILTERS: Array<{
  value: SearchFilters["quickFilter"];
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
];

const QUICK_FILTER_LABELS = new Map(
  QUICK_FILTERS.map((filter) => [filter.value, filter.label] as const)
);

const SORTABLE_COLUMNS: Array<{
  key: PurchaseManagementSortBy;
  label: string;
  align?: "left" | "center" | "right";
  widthClass?: string;
}> = [
  { key: "orderDate", label: "Order Date", widthClass: "w-[120px] min-w-[120px]" },
  { key: "orderNo", label: "PO Number", widthClass: "w-[180px] min-w-[180px]" },
  { key: "vendor", label: "Vendor", widthClass: "min-w-[200px]" },
  { key: "location", label: "Location", widthClass: "min-w-[120px]" },
  { key: "sizeType", label: "Size/Type", widthClass: "min-w-[120px]" },
  { key: "condition", label: "Condition", widthClass: "min-w-[140px]" },
  { key: "color", label: "Color", widthClass: "min-w-[120px]" },
  { key: "plannedQty", label: "Planned Qty", align: "center", widthClass: "min-w-[110px]" },
  { key: "availableQty", label: "Available Qty", align: "center", widthClass: "min-w-[120px]" },
  { key: "remainingQty", label: "Remaining Qty", align: "center", widthClass: "min-w-[120px]" },
  { key: "cancelledQty", label: "Cancelled Qty", align: "center", widthClass: "min-w-[120px]" },
  { key: "prepaidBalance", label: "Prepaid Balance", align: "right", widthClass: "min-w-[160px]" },
];

type AutocompleteInputState = {
  vendorId: string;
  locationCityId: string;
  color: string;
  sizeType: string;
  conditionId: string;
};

function findOptionByValue(options: PurchaseAutocompleteOption[], value: string) {
  return options.find((option) => option.value === value) ?? null;
}

function buildAutocompleteInputState(
  filters: SearchFilters,
  filterOptions: PurchaseFilterOptions
): AutocompleteInputState {
  return {
    vendorId: findOptionByValue(filterOptions.vendors, filters.vendorId)?.label ?? "",
    locationCityId: findOptionByValue(filterOptions.locations, filters.locationCityId)?.label ?? "",
    color: findOptionByValue(filterOptions.colors, filters.color)?.label ?? "",
    sizeType: findOptionByValue(filterOptions.sizeTypes, filters.sizeType)?.label ?? "",
    conditionId: findOptionByValue(filterOptions.conditions, filters.conditionId)?.label ?? "",
  };
}

function appliedFilterSummary(
  filters: SearchFilters,
  filterOptions: PurchaseFilterOptions
) {
  const parts: string[] = [];

  const vendor = findOptionByValue(filterOptions.vendors, filters.vendorId);
  if (vendor?.label) parts.push(`Vendor: ${vendor.label}`);

  const location = findOptionByValue(filterOptions.locations, filters.locationCityId);
  if (location?.label) parts.push(`Location: ${location.label}`);

  const color = findOptionByValue(filterOptions.colors, filters.color);
  if (color?.label) parts.push(`Color: ${color.label}`);

  const sizeType = findOptionByValue(filterOptions.sizeTypes, filters.sizeType);
  if (sizeType?.label) parts.push(`Size/Type: ${sizeType.label}`);

  const condition = findOptionByValue(filterOptions.conditions, filters.conditionId);
  if (condition?.label) parts.push(`Condition: ${condition.label}`);

  const quickFilterLabel = QUICK_FILTER_LABELS.get(filters.quickFilter);
  if (quickFilterLabel) {
    parts.push(quickFilterLabel);
  } else if (filters.orderDateFrom || filters.orderDateTo) {
    if (filters.orderDateFrom && filters.orderDateTo) {
      parts.push(`Date: ${filters.orderDateFrom} to ${filters.orderDateTo}`);
    } else if (filters.orderDateFrom) {
      parts.push(`Date From: ${filters.orderDateFrom}`);
    } else if (filters.orderDateTo) {
      parts.push(`Date To: ${filters.orderDateTo}`);
    }
  }

  if (filters.orderStatus) parts.push(`Status: ${filters.orderStatus}`);

  return parts.join(" | ");
}

function downloadCsv(filename: string, rows: PurchaseOrderManagementResult["rows"]) {
  const columns = [
    "Order Date",
    "PO Number",
    "Vendor",
    "Location",
    "Size/Type",
    "Condition",
    "Color",
    "Planned Qty",
    "Available Qty",
    "Remaining Qty",
    "Cancelled Qty",
    "Prepaid Balance",
    "Status",
  ];

  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.purchaseDate,
        row.orderNo,
        row.vendorLabel,
        row.locationLabel,
        row.sizeTypeLabel,
        row.conditionLabel,
        row.primaryColor,
        row.totalPlannedQty,
        row.totalAvailableQty,
        row.remainingQty,
        row.cancelledQty,
        row.prepaidBalance,
        row.orderStatus,
      ]
        .map(escape)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function statusVariant(status: string) {
  if (status === "RELEASED") return "default" as const;
  if (status === "IN_PRODUCTION") return "secondary" as const;
  if (status === "CANCELLED") return "destructive" as const;
  if (status === "COMPLETED") return "secondary" as const;
  return "outline" as const;
}

function canEditPurchaseOrder(purchaseType: PurchaseType, status: PurchaseOrderStatus) {
  return getPurchaseOrderEditPermissions(purchaseType, status).canEnterEdit;
}

function SortButton({
  label,
  sortKey,
  activeSortBy,
  activeDirection,
  onToggle,
}: {
  label: string;
  sortKey: PurchaseManagementSortBy;
  activeSortBy: PurchaseManagementSortBy;
  activeDirection: PurchaseManagementSortDirection;
  onToggle: (key: PurchaseManagementSortBy) => void;
}) {
  const active = activeSortBy === sortKey;
  const Icon = !active ? ArrowUpDown : activeDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-foreground transition hover:text-primary"
      onClick={() => onToggle(sortKey)}
    >
      <span>{label}</span>
      <Icon className="size-3.5" />
    </button>
  );
}

export function PurchaseOrdersDashboard({ initial, pageSize, filterOptions }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [autocompleteInputs, setAutocompleteInputs] = useState<AutocompleteInputState>(() =>
    buildAutocompleteInputState(initial.filters, filterOptions)
  );
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  const page = result.page;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(result.totalCount / pageSize)),
    [pageSize, result.totalCount]
  );
  const activeFilterSummary = useMemo(
    () => appliedFilterSummary(appliedFilters, filterOptions),
    [appliedFilters, filterOptions]
  );
  const start = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, result.totalCount);

  async function refresh(
    nextFilters: SearchFilters,
    nextPage = 1,
    nextSort = sort,
    options?: { collapseOnSuccess?: boolean }
  ) {
    setLoading(true);
    try {
      const next = await getPurchaseOrders({
        ...nextFilters,
        sortBy: nextSort.sortBy,
        sortDirection: nextSort.sortDirection,
        page: nextPage,
        pageSize,
      });
      setResult(next);
      setAppliedFilters(next.filters);
      setSort(next.sort);
      setFiltersCollapsed(options?.collapseOnSuccess ?? true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load purchase orders",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportPurchaseOrders({
        ...appliedFilters,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export purchase orders",
        description: getErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  }

  function applyQuickFilter(value: SearchFilters["quickFilter"]) {
    const toggledOff = draftFilters.quickFilter === value;
    const nextQuickFilter = toggledOff ? "" : value;
    const nextDates = applyQuickFilterDates(nextQuickFilter);
    const nextFilters = {
      ...draftFilters,
      quickFilter: nextQuickFilter,
      orderDateFrom: nextDates?.orderDateFrom ?? "",
      orderDateTo: nextDates?.orderDateTo ?? "",
    };
    setDraftFilters(nextFilters);
    void refresh(nextFilters, 1, sort, { collapseOnSuccess: false });
  }

  function toggleSort(key: PurchaseManagementSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection:
        sort.sortBy === key && sort.sortDirection === "desc" ? "asc" : "desc",
    } as const;
    void refresh(appliedFilters, 1, nextSort);
  }

  function handleSearchSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void refresh(draftFilters, 1);
  }

  function clearAutocompleteField(field: keyof AutocompleteInputState) {
    setAutocompleteInputs((current) => ({
      ...current,
      [field]: "",
    }));
    setDraftFilters((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function updateAutocompleteInput(field: keyof AutocompleteInputState, value: string) {
    setAutocompleteInputs((current) => ({
      ...current,
      [field]: value,
    }));
    setDraftFilters((current) => ({
      ...current,
      [field]: "",
    }));
  }

  function selectAutocompleteOption(
    field: keyof AutocompleteInputState,
    option: PurchaseAutocompleteOption | null
  ) {
    setAutocompleteInputs((current) => ({
      ...current,
      [field]: option?.label ?? "",
    }));
    setDraftFilters((current) => ({
      ...current,
      [field]: option?.value ?? "",
    }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">PO Management</h1>
              <p className="text-sm text-muted-foreground">
                Search, create, and review purchase orders across draft and confirmed workflows.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <Button asChild>
                <Link href="/purchase/po-management/new">Create PO</Link>
              </Button>
              <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <form className="rounded-xl border bg-muted/20 px-4 py-3" onSubmit={handleSearchSubmit}>
            <div className="space-y-2 border-b pb-3">
              <div className="text-sm font-medium">Quick Filter</div>
              <div className="flex flex-wrap gap-2">
                {QUICK_FILTERS.map((filter) => (
                    <Button
                      key={filter.value}
                      type="button"
                    variant={draftFilters.quickFilter === filter.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => applyQuickFilter(filter.value)}
                    disabled={loading}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex w-full items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-2 text-left"
                  onClick={() => setFiltersCollapsed((current) => !current)}
                  aria-expanded={!filtersCollapsed}
                  aria-controls="purchase-search-filters"
                >
                  <div className="text-sm font-semibold">Search Filters</div>
                  {filtersCollapsed ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  )}
                </button>
                {filtersCollapsed && activeFilterSummary ? (
                  <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                    {activeFilterSummary}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                >
                  <Search className="size-4" />
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={(event) => {
                    setDraftFilters(EMPTY_FILTERS);
                    setAutocompleteInputs(buildAutocompleteInputState(EMPTY_FILTERS, filterOptions));
                    void refresh(
                      EMPTY_FILTERS,
                      1,
                      { sortBy: "activityAt", sortDirection: "desc" },
                      { collapseOnSuccess: false }
                    );
                  }}
                  disabled={loading}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>

            {!filtersCollapsed ? (
              <div id="purchase-search-filters" className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SearchableAutocompleteInput
                    label="Vendor"
                    placeholder="Vendor code or name"
                    options={filterOptions.vendors}
                    value={draftFilters.vendorId}
                    inputValue={autocompleteInputs.vendorId}
                    onInputChange={(value) => updateAutocompleteInput("vendorId", value)}
                    onSelect={(option) => selectAutocompleteOption("vendorId", option)}
                    onClear={() => clearAutocompleteField("vendorId")}
                    emptyMessage="No matching vendors."
                    disabled={loading}
                  />

                  <SearchableAutocompleteInput
                    label="Location"
                    placeholder="City code or name"
                    options={filterOptions.locations}
                    value={draftFilters.locationCityId}
                    inputValue={autocompleteInputs.locationCityId}
                    onInputChange={(value) => updateAutocompleteInput("locationCityId", value)}
                    onSelect={(option) => selectAutocompleteOption("locationCityId", option)}
                    onClear={() => clearAutocompleteField("locationCityId")}
                    emptyMessage="No matching locations."
                    disabled={loading}
                  />

                  <SearchableAutocompleteInput
                    label="Color"
                    placeholder="RAL color code"
                    options={filterOptions.colors}
                    value={draftFilters.color}
                    inputValue={autocompleteInputs.color}
                    onInputChange={(value) => updateAutocompleteInput("color", value)}
                    onSelect={(option) => selectAutocompleteOption("color", option)}
                    onClear={() => clearAutocompleteField("color")}
                    emptyMessage="No matching RAL colors."
                    disabled={loading}
                  />

                  <SearchableAutocompleteInput
                    label="Size/Type"
                    placeholder="20, GP, HC..."
                    options={filterOptions.sizeTypes}
                    value={draftFilters.sizeType}
                    inputValue={autocompleteInputs.sizeType}
                    onInputChange={(value) => updateAutocompleteInput("sizeType", value)}
                    onSelect={(option) => selectAutocompleteOption("sizeType", option)}
                    onClear={() => clearAutocompleteField("sizeType")}
                    emptyMessage="No matching size/types."
                    disabled={loading}
                  />

                  <SearchableAutocompleteInput
                    label="Condition"
                    placeholder="Condition code"
                    options={filterOptions.conditions}
                    value={draftFilters.conditionId}
                    inputValue={autocompleteInputs.conditionId}
                    onInputChange={(value) => updateAutocompleteInput("conditionId", value)}
                    onSelect={(option) => selectAutocompleteOption("conditionId", option)}
                    onClear={() => clearAutocompleteField("conditionId")}
                    emptyMessage="No matching conditions."
                    disabled={loading}
                  />

                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">Order Date From</div>
                    <Input
                      name="orderDateFrom"
                      type="date"
                      value={draftFilters.orderDateFrom}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderDateFrom: event.target.value,
                          quickFilter: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">Order Date To</div>
                    <Input
                      name="orderDateTo"
                      type="date"
                      value={draftFilters.orderDateTo}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleSearchSubmit();
                        }
                      }}
                      onChange={(event) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderDateTo: event.target.value,
                          quickFilter: "",
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">PO Status</div>
                    <Select
                      value={draftFilters.orderStatus || "all"}
                      onValueChange={(value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          orderStatus: value === "all" ? "" : value,
                        }))
                      }
                    >
                      <input type="hidden" name="orderStatus" value={draftFilters.orderStatus} readOnly />
                      <SelectTrigger
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleSearchSubmit();
                          }
                        }}
                      >
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {filterOptions.statuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : null}
          </form>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <div className="flex min-w-max gap-0 px-1">
            {[
              { label: "Total Orders", value: result.summary.totalOrders },
              { label: "Planned Qty", value: result.summary.totalPlannedQty },
              { label: "Available Qty", value: result.summary.totalAvailableQty },
              { label: "Remaining Qty", value: result.summary.totalRemainingQty },
              { label: "Cancelled Qty", value: result.summary.totalCancelledQty },
              {
                label: "Prepaid Balance",
                value: result.summary.prepaidBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
              },
            ].map((item) => (
              <div key={item.label} className="flex min-w-[150px] flex-1 flex-col gap-1 px-3 py-2.5">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </div>
                <div className="text-2xl font-semibold leading-none">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <Table className="min-w-[1880px] table-fixed border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: "120px" }} />
                <col style={{ width: "180px" }} />
                <col style={{ width: "200px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "150px" }} />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      className={[
                        column.align === "right"
                          ? "text-right"
                          : column.align === "center"
                            ? "text-center"
                            : "",
                        column.widthClass ?? "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <SortButton
                        label={column.label}
                        sortKey={column.key}
                        activeSortBy={sort.sortBy}
                        activeDirection={sort.sortDirection}
                        onToggle={toggleSort}
                      />
                    </TableHead>
                  ))}
                  <TableHead>
                    <SortButton
                      label="Status"
                      sortKey="status"
                      activeSortBy={sort.sortBy}
                      activeDirection={sort.sortDirection}
                      onToggle={toggleSort}
                    />
                  </TableHead>
                  <TableHead className={ACTIONS_STICKY_HEAD_CLASS}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 2} className="h-28 text-center text-sm text-muted-foreground">
                      {loading ? "Loading purchase orders..." : "No purchase orders found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="w-[120px] min-w-[120px]">
                        {row.purchaseDate ?? "-"}
                      </TableCell>
                      <TableCell className="w-[180px] min-w-[180px] font-medium">
                        {row.orderNo}
                      </TableCell>
                      <TableCell className="min-w-[200px]">{row.vendorLabel ?? "-"}</TableCell>
                      <TableCell className="min-w-[120px]">{row.locationLabel ?? "-"}</TableCell>
                      <TableCell className="min-w-[120px]">{row.sizeTypeLabel ?? "-"}</TableCell>
                      <TableCell className="min-w-[140px]">{row.conditionLabel ?? "-"}</TableCell>
                      <TableCell className="min-w-[120px]">{row.primaryColor ?? "-"}</TableCell>
                      <TableCell className="min-w-[110px] text-center">{row.totalPlannedQty}</TableCell>
                      <TableCell className="min-w-[120px] text-center">{row.totalAvailableQty}</TableCell>
                      <TableCell className="min-w-[120px] text-center">{row.remainingQty}</TableCell>
                      <TableCell className="min-w-[120px] text-center">{row.cancelledQty}</TableCell>
                      <TableCell className="min-w-[160px] text-right">{row.prepaidBalance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.orderStatus)}>{row.orderStatus}</Badge>
                      </TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/purchase/po-management/${row.id}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </Button>
                          {canEditPurchaseOrder(row.purchaseType, row.orderStatus) ? (
                            <Button asChild variant="link" className="h-auto px-0">
                              <Link href={`/purchase/po-management/${row.id}/edit`}>
                                <Pencil className="size-4" />
                                Edit
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-muted-foreground">
              Showing {start}-{end} of {result.totalCount} purchase orders
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void refresh(appliedFilters, page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void refresh(appliedFilters, page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
