"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getSizeCodeSuggestions,
  getSizeCodes,
  type SizeCodesPageResult,
} from "@/app/basic-info/size-codes/actions";
import { SizeCodeFormDialog } from "@/components/basic-info/size-code-form-dialog";
import { SizeCodeViewDialog } from "@/components/basic-info/size-code-view-dialog";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
} from "@/components/shared/page-standard/table-standard";
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
import type { SizeCodeRow } from "@/types/size-code";

type Props = {
  initial: SizeCodesPageResult;
  pageSize: number;
};

type SearchFilters = SizeCodesPageResult["filters"];

const SEARCH_DEBOUNCE_MS = 220;

const EMPTY_FILTERS: SearchFilters = {
  code: "",
};

function downloadCsv(filename: string, rows: SizeCodeRow[]) {
  const columns = ["Size Code", "Size Name"];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) => [row.code, row.name].map(escape).join(",")),
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
  value,
  onChange,
  onSelectSuggestion,
}: {
  label: string;
  placeholder: string;
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
        const next = await getSizeCodeSuggestions({ q: trimmed, limit: 6 });
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
            <div className="px-3 py-2 text-sm text-muted-foreground">Matching size codes...</div>
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

export function SizeCodesDashboard({ initial, pageSize }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<SizeCodeRow | null>(null);
  const [activeRow, setActiveRow] = useState<SizeCodeRow | null>(null);
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
      const next = await getSizeCodes({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load size codes",
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
    const next = await getSizeCodes({
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
    downloadCsv(`size-codes-${new Date().toISOString().slice(0, 10)}.csv`, result.rows);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="relative z-20 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Size Codes</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Maintain container size master data. {rangeLabel}
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
              New Size Code
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
          <div className="grid items-end gap-2 xl:grid-cols-[minmax(0,420px)]">
            <SuggestionInput
              label="Size Code"
              placeholder="Fuzzy match size code"
              value={draftFilters.code}
              onChange={(value) => setDraftFilters({ code: value })}
              onSelectSuggestion={(value) => setDraftFilters({ code: value })}
            />
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
                <TableHead className="sticky left-0 top-0 z-30 min-w-[180px] bg-card py-2 text-xs uppercase tracking-wide">
                  Size Code
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  Size Name
                </TableHead>
                <TableHead className={`${ACTIONS_STICKY_HEAD_CLASS} top-0 py-2 text-right text-xs uppercase tracking-wide`}>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Loading size codes...
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No size code records found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">
                      {row.code}
                    </TableCell>
                    <TableCell className="py-2">{row.name}</TableCell>
                    <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
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
        <div className="text-sm text-muted-foreground">Page {page} of {totalPages}</div>
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

      <SizeCodeFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        row={editingRow}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <SizeCodeViewDialog
        open={viewDialogOpen}
        row={activeRow}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
