"use client";

import {
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
  exportPurchaseOrders,
  getPurchaseOrders,
  type PurchaseFilterOptions,
  type PurchaseManagementSortBy,
  type PurchaseManagementSortDirection,
  type PurchaseOrderManagementResult,
} from "@/app/purchase/po-management/actions";
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
import { applyQuickFilterDates } from "@/app/purchase/po-management/query-helpers";

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

const SORTABLE_COLUMNS: Array<{
  key: PurchaseManagementSortBy;
  label: string;
}> = [
  { key: "orderDate", label: "Order Date" },
  { key: "orderNo", label: "PO Number" },
  { key: "vendor", label: "Vendor" },
  { key: "location", label: "Location" },
  { key: "sizeType", label: "Size/Type" },
  { key: "condition", label: "Condition" },
  { key: "color", label: "Color" },
  { key: "plannedQty", label: "Planned Qty" },
  { key: "availableQty", label: "Available Qty" },
  { key: "remainingQty", label: "Remaining Qty" },
  { key: "cancelledQty", label: "Cancelled Qty" },
  { key: "prepaidBalance", label: "Prepaid Balance" },
];

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
  if (status === "CONFIRMED") return "default" as const;
  if (status === "CANCELLED") return "destructive" as const;
  if (status === "COMPLETED") return "secondary" as const;
  return "outline" as const;
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
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = result.page;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(result.totalCount / pageSize)),
    [pageSize, result.totalCount]
  );
  const start = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, result.totalCount);

  async function refresh(
    nextFilters: SearchFilters,
    nextPage = 1,
    nextSort = sort
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
    const nextDates = applyQuickFilterDates(value);
    const nextFilters = {
      ...draftFilters,
      quickFilter: value,
      orderDateFrom: nextDates?.orderDateFrom ?? "",
      orderDateTo: nextDates?.orderDateTo ?? "",
    };
    setDraftFilters(nextFilters);
    void refresh(nextFilters, 1);
  }

  function toggleSort(key: PurchaseManagementSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection:
        sort.sortBy === key && sort.sortDirection === "desc" ? "asc" : "desc",
    } as const;
    void refresh(appliedFilters, 1, nextSort);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">PO Management</h1>
              <p className="text-sm text-muted-foreground">
                Search and review purchase orders before create, edit, and detail flows land in later milestones.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
              <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                <Download className="size-4" />
                Export CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Quick Filter</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
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
              </CardContent>
            </Card>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium">Vendor</div>
                <Select
                  value={draftFilters.vendorId || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      vendorId: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vendors</SelectItem>
                    {filterOptions.vendors.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.vendor_code} · {option.company_name ?? option.legal_company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Location</div>
                <Select
                  value={draftFilters.locationCityId || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      locationCityId: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {filterOptions.locations.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.city_code} · {option.city_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Color</div>
                <Select
                  value={draftFilters.color || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      color: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All colors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All colors</SelectItem>
                    {filterOptions.colors.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Size/Type</div>
                <Select
                  value={draftFilters.sizeType || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      sizeType: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All size/types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All size/types</SelectItem>
                    {filterOptions.sizeTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Condition</div>
                <Select
                  value={draftFilters.conditionId || "all"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      conditionId: value === "all" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All conditions</SelectItem>
                    {filterOptions.conditions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.condition_code} · {option.condition_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Order Date From</div>
                <Input
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
                  type="date"
                  value={draftFilters.orderDateTo}
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
                  <SelectTrigger>
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

              <div className="flex items-end justify-start gap-2 xl:col-span-4 xl:justify-end">
                <Button onClick={() => void refresh(draftFilters, 1)} disabled={loading}>
                  <Search className="size-4" />
                  Search
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftFilters(EMPTY_FILTERS);
                    void refresh(EMPTY_FILTERS, 1, { sortBy: "orderDate", sortDirection: "desc" });
                  }}
                  disabled={loading}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Orders</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{result.summary.totalOrders}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Planned Qty</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{result.summary.totalPlannedQty}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Available Qty</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{result.summary.totalAvailableQty}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Remaining Qty</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{result.summary.totalRemainingQty}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Cancelled Qty</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{result.summary.totalCancelledQty}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Prepaid Balance</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {result.summary.prepaidBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardContent>
          </Card>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key}>
                      <SortButton
                        label={column.label}
                        sortKey={column.key}
                        activeSortBy={sort.sortBy}
                        activeDirection={sort.sortDirection}
                        onToggle={toggleSort}
                      />
                    </TableHead>
                  ))}
                  <TableHead className="w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-28 text-center text-sm text-muted-foreground">
                      {loading ? "Loading purchase orders..." : "No purchase orders found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.purchaseDate ?? "-"}</TableCell>
                      <TableCell className="font-medium">{row.orderNo}</TableCell>
                      <TableCell>{row.vendorLabel ?? "-"}</TableCell>
                      <TableCell>{row.locationLabel ?? "-"}</TableCell>
                      <TableCell>{row.sizeTypeLabel ?? "-"}</TableCell>
                      <TableCell>{row.conditionLabel ?? "-"}</TableCell>
                      <TableCell>{row.primaryColor ?? "-"}</TableCell>
                      <TableCell>{row.totalPlannedQty}</TableCell>
                      <TableCell>{row.totalAvailableQty}</TableCell>
                      <TableCell>{row.remainingQty}</TableCell>
                      <TableCell>{row.cancelledQty}</TableCell>
                      <TableCell>{row.prepaidBalance.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={statusVariant(row.orderStatus)}>{row.orderStatus}</Badge>
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/purchase/po-management/${row.id}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </Button>
                          <Button variant="link" className="h-auto px-0" disabled>
                            <Pencil className="size-4" />
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

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
