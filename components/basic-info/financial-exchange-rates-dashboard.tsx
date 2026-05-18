"use client";

import { Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getFinancialExchangeRates,
  setFinancialExchangeRateStatus,
  type FinancialExchangeRatePageResult,
} from "@/app/basic-info/financial-exchange-rates/actions";
import { FinancialExchangeRateFormDialog } from "@/components/basic-info/financial-exchange-rate-form-dialog";
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
import {
  FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS,
  type FinancialExchangeRateRow,
} from "@/types/dispatch-finance";

type Props = {
  initial: FinancialExchangeRatePageResult;
  pageSize: number;
};

type SearchFilters = FinancialExchangeRatePageResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  rateDate: "",
  fromCurrency: "",
  toCurrency: "",
  status: "",
};

export function FinancialExchangeRatesDashboard({ initial, pageSize }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancialExchangeRateRow | null>(null);
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
      const next = await getFinancialExchangeRates({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load financial exchange rates",
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
    const next = await getFinancialExchangeRates({
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

  async function toggleStatus(row: FinancialExchangeRateRow) {
    try {
      await setFinancialExchangeRateStatus(row.id, !row.isActive);
      await refreshCurrentPage();
      toast({
        title: row.isActive
          ? "Financial exchange rate disabled"
          : "Financial exchange rate enabled",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update status",
        description: getErrorMessage(error),
      });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="relative z-20 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Financial Exchange Rates</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Maintain effective-from financial exchange rates. {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setEditingRow(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-3.5" />
              New Exchange Rate
            </Button>
          </div>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="grid items-end gap-2 xl:grid-cols-[180px_180px_180px_180px]">
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium">Start From</label>
              <input
                type="date"
                value={draftFilters.rateDate}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    rateDate: event.target.value,
                  }))
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium">From Currency</label>
              <Select
                value={draftFilters.fromCurrency || "__all__"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    fromCurrency: value === "__all__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Currencies</SelectItem>
                  {FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <label className="mb-1.5 block text-xs font-medium">To Currency</label>
              <Select
                value={draftFilters.toCurrency || "__all__"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    toCurrency: value === "__all__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Currencies</SelectItem>
                  {FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Enabled</SelectItem>
                  <SelectItem value="INACTIVE">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button size="sm" type="submit" className="h-9 px-3">
              <Search className="mr-2 size-3.5" />
              Search
            </Button>
            <Button size="sm" type="button" variant="outline" onClick={resetSearch} className="h-9 px-3">
              <RotateCcw className="mr-2 size-3.5" />
              Reset
            </Button>
          </div>
        </form>
      </div>

      <div className="relative z-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="max-h-[calc(100dvh-270px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Start From</TableHead>
                <TableHead>From Currency</TableHead>
                <TableHead>To Currency</TableHead>
                <TableHead className="text-right">Exchange Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                    Loading financial exchange rates...
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                    No financial exchange rates found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.rateDate}</TableCell>
                    <TableCell>{row.fromCurrency}</TableCell>
                    <TableCell>{row.toCurrency}</TableCell>
                    <TableCell className="text-right">{row.exchangeRate.toFixed(8)}</TableCell>
                    <TableCell>
                      <Badge variant={row.isActive ? "default" : "secondary"}>
                        {row.isActive ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.remark || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingRow(row);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-2 size-3.5" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleStatus(row)}
                        >
                          {row.isActive ? "Disable" : "Enable"}
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
            Page {page} of {totalPages} ({result.totalCount} total rates)
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <FinancialExchangeRateFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        row={editingRow}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRow(null);
        }}
        onSaved={refreshCurrentPage}
      />
    </div>
  );
}
