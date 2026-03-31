"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getFinancialCodeSuggestions,
  getFinancialCodes,
  type FinancialCodeSuggestionField,
  type FinancialCodesPageResult,
} from "@/app/basic-info/financial-codes/actions";
import { FinancialCodeFormDialog } from "@/components/basic-info/financial-code-form-dialog";
import { FinancialCodeViewDialog } from "@/components/basic-info/financial-code-view-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { FinancialCodeCategory, FinancialCodeRow } from "@/types/financial-code";

type Props = {
  initial: FinancialCodesPageResult;
  pageSize: number;
  defaultCategory: FinancialCodeCategory;
};

type SearchFilters = FinancialCodesPageResult["filters"];
type SortField = "code" | "name" | "description" | "status";
type SortDirection = "asc" | "desc";

const SEARCH_DEBOUNCE_MS = 220;

const EMPTY_FILTERS = (category: FinancialCodeCategory): SearchFilters => ({
  category,
  code: "",
  name: "",
  enabled: "",
});

function labelsForCategory(category: FinancialCodeCategory) {
  return category === "INCOME"
    ? {
        title: "Revenue Code",
        code: "Revenue Code",
        name: "Revenue Name",
      }
    : {
        title: "Expense Code",
        code: "Expense Code",
        name: "Expense Name",
      };
}

function downloadCsv(filename: string, rows: FinancialCodeRow[]) {
  const columns = ["Category", "Code", "Name", "Description", "Enabled"];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.category === "INCOME" ? "Income" : "Expense",
        row.code,
        row.name,
        row.description,
        row.status === "ACTIVE" ? "Enabled" : "Disabled",
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

function SuggestionInput({
  label,
  placeholder,
  category,
  field,
  value,
  onChange,
  onSelectSuggestion,
}: {
  label: string;
  placeholder: string;
  category: FinancialCodeCategory;
  field: FinancialCodeSuggestionField;
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (value: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setSuggestions([]);
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const next = await getFinancialCodeSuggestions({
          category,
          field,
          q: trimmed,
          limit: 6,
        });
        if (!active) return;
        setSuggestions(next);
        setOpen(next.length > 0);
        setHighlightedIndex(next.length > 0 ? 0 : -1);
      } catch {
        if (!active) return;
        setSuggestions([]);
        setOpen(false);
        setHighlightedIndex(-1);
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [category, field, value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-40 min-w-0">
      <label className="mb-1.5 block text-xs font-medium">{label}</label>
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open && event.target.value.trim()) setOpen(true);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) return;

          if (event.key === "ArrowDown") {
            event.preventDefault();
            setHighlightedIndex((current) =>
              current < suggestions.length - 1 ? current + 1 : 0
            );
            return;
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setHighlightedIndex((current) =>
              current > 0 ? current - 1 : suggestions.length - 1
            );
            return;
          }
          if (event.key === "Enter" && highlightedIndex >= 0) {
            event.preventDefault();
            onSelectSuggestion(suggestions[highlightedIndex]);
            setOpen(false);
            setHighlightedIndex(-1);
            return;
          }
          if (event.key === "Escape") {
            setOpen(false);
            setHighlightedIndex(-1);
          }
        }}
        className="h-9 text-sm"
        placeholder={placeholder}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loadingSuggestions ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Matching codes...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matching results</div>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="block w-full border-b border-border/60 px-3 py-2 text-left text-sm hover:bg-muted last:border-b-0 data-[active=true]:bg-muted"
                data-active={suggestion === suggestions[highlightedIndex]}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelectSuggestion(suggestion);
                  setOpen(false);
                  setHighlightedIndex(-1);
                }}
                onMouseEnter={() => setHighlightedIndex(suggestions.indexOf(suggestion))}
              >
                {suggestion}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FinancialCodeDashboard({
  initial,
  pageSize,
  defaultCategory,
}: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FinancialCodeRow | null>(null);
  const [activeRow, setActiveRow] = useState<FinancialCodeRow | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const skipInitialFetch = useRef(true);

  const labels = useMemo(() => labelsForCategory(appliedFilters.category), [appliedFilters.category]);
  const draftLabels = useMemo(() => labelsForCategory(draftFilters.category), [draftFilters.category]);

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
      const next = await getFinancialCodes({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load codes",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, pageSize]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void fetchPage();
  }, [fetchPage]);

  async function refreshCurrentPage() {
    const next = await getFinancialCodes({
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
    const next = EMPTY_FILTERS(defaultCategory);
    setDraftFilters(next);
    setAppliedFilters(next);
    setPage(1);
  }

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDirection("asc");
  }

  const sortedRows = useMemo(() => {
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const left = (a[sortBy] ?? "").toString().toLowerCase();
      const right = (b[sortBy] ?? "").toString().toLowerCase();
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [result.rows, sortBy, sortDirection]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown className="size-3.5 opacity-50" />;
    return sortDirection === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  }

  function exportCurrentView() {
    downloadCsv(`financial-codes-${new Date().toISOString().slice(0, 10)}.csv`, sortedRows);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{labels.title}</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain code master data. {rangeLabel}
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
              New Code
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[180px_minmax(0,0.9fr)_minmax(0,1fr)_160px_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Category</label>
            <Select
              value={draftFilters.category}
              onValueChange={(value) => {
                const nextCategory = value as FinancialCodeCategory;
                const nextFilters = EMPTY_FILTERS(nextCategory);
                setDraftFilters(nextFilters);
                setAppliedFilters(nextFilters);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Revenue</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SuggestionInput
            label={draftLabels.code}
            placeholder={`Fuzzy match ${draftLabels.code.toLowerCase()}`}
            category={draftFilters.category}
            field="code"
            value={draftFilters.code}
            onChange={(value) => setDraftFilters((current) => ({ ...current, code: value }))}
            onSelectSuggestion={(value) => setDraftFilters((current) => ({ ...current, code: value }))}
          />
          <SuggestionInput
            label={draftLabels.name}
            placeholder={`Fuzzy match ${draftLabels.name.toLowerCase()}`}
            category={draftFilters.category}
            field="name"
            value={draftFilters.name}
            onChange={(value) => setDraftFilters((current) => ({ ...current, name: value }))}
            onSelectSuggestion={(value) => setDraftFilters((current) => ({ ...current, name: value }))}
          />
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Enabled</label>
            <Select
              value={draftFilters.enabled || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  enabled: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select enabled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="ENABLED">Enabled</SelectItem>
                <SelectItem value="DISABLED">Disabled</SelectItem>
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
                <TableHead className="sticky left-0 top-0 z-30 min-w-[160px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("code")} className="inline-flex items-center gap-1.5">
                    {labels.code}
                    <SortIcon field="code" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[260px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("name")} className="inline-flex items-center gap-1.5">
                    {labels.name}
                    <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[260px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("description")} className="inline-flex items-center gap-1.5">
                    Description
                    <SortIcon field="description" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("status")} className="inline-flex items-center gap-1.5">
                    Enabled
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-right text-xs uppercase tracking-wide">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Loading codes...
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No code records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">{row.code}</TableCell>
                    <TableCell className="py-2">{row.name}</TableCell>
                    <TableCell className="max-w-[260px] py-2">
                      <div className="line-clamp-2">{row.description ?? "-"}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant={row.status === "ACTIVE" ? "outline" : "secondary"} className="px-2 py-0 text-[11px]">
                        {row.status === "ACTIVE" ? "Enabled" : "Disabled"}
                      </Badge>
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
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages || loading} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            Next
          </Button>
        </div>
      </div>

      <FinancialCodeFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        category={appliedFilters.category}
        row={editingRow}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <FinancialCodeViewDialog
        open={viewDialogOpen}
        category={activeRow?.category ?? appliedFilters.category}
        row={activeRow}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
