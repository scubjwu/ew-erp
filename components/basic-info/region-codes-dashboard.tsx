"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getRegionCodeSuggestions,
  getRegionCodes,
  type RegionCodesPageResult,
} from "@/app/basic-info/regions/actions";
import { RegionCodeFormDialog } from "@/components/basic-info/region-code-form-dialog";
import { RegionCodeViewDialog } from "@/components/basic-info/region-code-view-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { RegionCode } from "@/types/region-code";

type SortField = "region_code" | "region_name" | "created_by" | "created_at";
type SortDirection = "asc" | "desc";

const SEARCH_DEBOUNCE_MS = 220;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadCsv(filename: string, rows: RegionCode[]) {
  const columns = ["Region Code", "Region Name", "Status", "Created By", "Created At"];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.region_code,
        row.region_name,
        row.status,
        row.created_by,
        row.created_at,
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

function RegionSearchField({
  value,
  onChange,
  onSelectSuggestion,
}: {
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
        const next = await getRegionCodeSuggestions({ q: trimmed, limit: 6 });
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
  }, [value]);

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
      <label className="mb-1.5 block text-xs font-medium">Region</label>
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
        placeholder="Fuzzy match region"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loadingSuggestions ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Matching regions...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No matching results
            </div>
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
                onMouseEnter={() => {
                  setHighlightedIndex(suggestions.indexOf(suggestion));
                }}
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

type RegionCodesDashboardProps = {
  initial: RegionCodesPageResult;
  pageSize: number;
};

export function RegionCodesDashboard({
  initial,
  pageSize,
}: RegionCodesDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftQuery, setDraftQuery] = useState(initial.filters.q);
  const [appliedQuery, setAppliedQuery] = useState(initial.filters.q);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionCode | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<RegionCode | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("region_code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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
      const next = await getRegionCodes({
        q: appliedQuery,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load regions",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, pageSize]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void fetchPage();
  }, [fetchPage]);

  async function refreshCurrentPage() {
    const next = await getRegionCodes({
      q: appliedQuery,
      page,
      pageSize,
    });
    setResult(next);
  }

  function applySearch() {
    setPage(1);
    setAppliedQuery(draftQuery.trim());
  }

  function resetSearch() {
    setDraftQuery("");
    setPage(1);
    setAppliedQuery("");
  }

  function openCreateDialog() {
    setEditingRegion(null);
    setDialogOpen(true);
  }

  function openEditDialog(region: RegionCode) {
    setEditingRegion(region);
    setDialogOpen(true);
  }

  function openViewDialog(region: RegionCode) {
    setActiveRegion(region);
    setViewDialogOpen(true);
  }

  function exportCurrentView() {
    downloadCsv(`region-codes-${new Date().toISOString().slice(0, 10)}.csv`, sortedRows);
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
      const left = a[sortBy];
      const right = b[sortBy];
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      const leftValue = typeof left === "string" ? left.toLowerCase() : left;
      const rightValue = typeof right === "string" ? right.toLowerCase() : right;
      if (leftValue < rightValue) return sortDirection === "asc" ? -1 : 1;
      if (leftValue > rightValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [result.rows, sortBy, sortDirection]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ArrowUpDown className="size-3.5 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="size-3.5" />
    ) : (
      <ArrowDown className="size-3.5" />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Region Codes
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain region master data. {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCurrentView}>
              <Download className="mr-2 size-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 size-3.5" />
              New Region
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
          <div className="grid items-end gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
            <RegionSearchField
              value={draftQuery}
              onChange={setDraftQuery}
              onSelectSuggestion={setDraftQuery}
            />
            <Button size="sm" type="submit" className="h-9 px-3">
              <Search className="mr-2 size-3.5" />
              Search
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={resetSearch}
              className="h-9 px-3"
            >
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
                <TableHead className="sticky left-0 top-0 z-30 min-w-[200px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => toggleSort("region_code")}
                    className="inline-flex items-center gap-1.5"
                  >
                    Region Code
                    <SortIcon field="region_code" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => toggleSort("region_name")}
                    className="inline-flex items-center gap-1.5"
                  >
                    Region Name
                    <SortIcon field="region_name" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-xs uppercase tracking-wide">
                  Status
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => toggleSort("created_by")}
                    className="inline-flex items-center gap-1.5"
                  >
                    Created By
                    <SortIcon field="created_by" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[160px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => toggleSort("created_at")}
                    className="inline-flex items-center gap-1.5"
                  >
                    Created At
                    <SortIcon field="created_at" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-right text-xs uppercase tracking-wide">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading regions...
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No region records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">
                      {row.region_code}
                    </TableCell>
                    <TableCell className="max-w-[220px] py-2">
                      <div className="line-clamp-2">{row.region_name}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={row.status === "ACTIVE" ? "outline" : "secondary"}
                        className="px-2 py-0 text-[11px]"
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 font-mono text-[11px]">
                      {row.created_by ?? "-"}
                    </TableCell>
                    <TableCell className="py-2 text-xs">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-3 text-xs font-medium">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-sky-600 transition hover:text-sky-500"
                          onClick={() => openViewDialog(row)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditDialog(row)}
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

      <RegionCodeFormDialog
        open={dialogOpen}
        mode={editingRegion ? "edit" : "create"}
        region={editingRegion}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <RegionCodeViewDialog
        open={viewDialogOpen}
        row={activeRegion}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setActiveRegion(null);
        }}
      />
    </div>
  );
}
