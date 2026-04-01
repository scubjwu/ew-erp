"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getOperationPrices,
  type OperationPricesPageResult,
} from "@/app/basic-info/operation-prices/actions";
import { OperationPriceFormDialog } from "@/components/basic-info/operation-price-form-dialog";
import { OperationPriceViewDialog } from "@/components/basic-info/operation-price-view-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  OperationPriceOption,
  OperationPriceRow,
} from "@/types/operation-price-config";

type Props = {
  initial: OperationPricesPageResult;
  pageSize: number;
  sizeOptions: OperationPriceOption[];
  conditionOptions: OperationPriceOption[];
};

type SearchFilters = OperationPricesPageResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  sizeId: "",
  conditionId: "",
  status: "",
};

function formatPrice(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return String(value ?? "");
  return parsed.toFixed(2);
}

function downloadCsv(filename: string, rows: OperationPriceRow[]) {
  const columns = [
    "Size",
    "Condition",
    "Additional Price",
    "Currency",
    "Effective From",
    "Effective To",
    "Status",
    "Remark",
  ];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.container_size_codes?.size_code ?? "",
        row.container_condition_codes?.condition_name ?? "",
        formatPrice(row.addon_price),
        row.currency,
        row.effective_from,
        row.effective_to,
        row.status === "ACTIVE" ? "Enabled" : "Disabled",
        row.remark,
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

export function OperationPricesDashboard({
  initial,
  pageSize,
  sizeOptions,
  conditionOptions,
}: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<OperationPriceRow | null>(null);
  const [activeRow, setActiveRow] = useState<OperationPriceRow | null>(null);
  const skipInitialFetch = useRef(true);

  const totalPages = useMemo(() => {
    if (result.totalCount <= 0) return 1;
    return Math.max(1, Math.ceil(result.totalCount / pageSize));
  }, [pageSize, result.totalCount]);

  const rangeLabel = useMemo(() => {
    if (result.totalCount === 0) return "0 results";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, result.totalCount);
    return `${start}-${end} of ${result.totalCount}`;
  }, [page, pageSize, result.totalCount]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getOperationPrices({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load operation prices",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      if (initial.totalCount === 0) {
        void fetchPage();
      }
      return;
    }
    void fetchPage();
  }, [fetchPage, initial.totalCount]);

  async function refreshCurrentPage() {
    const next = await getOperationPrices({
      ...appliedFilters,
      page,
      pageSize,
    });
    setResult(next);
  }

  function applySearch() {
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  function resetSearch() {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
  }

  function exportCurrentView() {
    downloadCsv(
      `operation-prices-${new Date().toISOString().slice(0, 10)}.csv`,
      result.rows
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Operation Price Configs</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain operation price configs. {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCurrentView}>
              <Download className="mr-2 size-3.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingRow(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-3.5" />
              New Config
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[180px_220px_180px_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Size</label>
            <Select
              value={draftFilters.sizeId || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  sizeId: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sizes</SelectItem>
                {sizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Condition</label>
            <Select
              value={draftFilters.conditionId || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  conditionId: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Conditions</SelectItem>
                {conditionOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Status</label>
            <Select
              value={draftFilters.status || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Enabled</SelectItem>
                <SelectItem value="INACTIVE">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button size="sm" type="submit" className="h-9 px-3">
            <Search className="mr-2 size-3.5" />
            Search
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={resetSearch} className="h-9 px-3">
            <RotateCcw className="mr-2 size-3.5" />
            Reset
          </Button>
        </form>
      </div>

      <div className="relative z-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="max-h-[calc(100dvh-270px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="sticky left-0 top-0 z-30 min-w-[120px] bg-card py-2 text-xs uppercase tracking-wide">
                  Size
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[200px] bg-card py-2 text-xs uppercase tracking-wide">
                  Condition
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-xs uppercase tracking-wide">
                  Additional Price
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[100px] bg-card py-2 text-xs uppercase tracking-wide">
                  Currency
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-xs uppercase tracking-wide">
                  Effective From
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-xs uppercase tracking-wide">
                  Effective To
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[110px] bg-card py-2 text-xs uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  Remark
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-right text-xs uppercase tracking-wide">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Loading operation prices...
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    No operation price records found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">
                      {row.container_size_codes?.size_code ?? "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {row.container_condition_codes?.condition_name ?? "-"}
                    </TableCell>
                    <TableCell className="py-2">{formatPrice(row.addon_price)}</TableCell>
                    <TableCell className="py-2">{row.currency}</TableCell>
                    <TableCell className="py-2">{row.effective_from}</TableCell>
                    <TableCell className="py-2">{row.effective_to ?? "-"}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="px-2 py-0 text-[11px]">
                        {row.status === "ACTIVE" ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] py-2">
                      <div className="line-clamp-2">{row.remark ?? "-"}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveRow(row);
                            setViewDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-sky-600 transition hover:text-sky-500"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRow(row);
                            setDialogOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-amber-600 transition hover:text-amber-500"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <OperationPriceFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        row={editingRow}
        sizeOptions={sizeOptions}
        conditionOptions={conditionOptions}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <OperationPriceViewDialog
        open={viewDialogOpen}
        row={activeRow}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
