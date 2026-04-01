"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getConditionCodeSuggestions,
  getConditionCodes,
  type ConditionCodeSuggestionField,
  type ConditionCodesPageResult,
} from "@/app/basic-info/condition-codes/actions";
import { ConditionCodeFormDialog } from "@/components/basic-info/condition-code-form-dialog";
import { ConditionCodeViewDialog } from "@/components/basic-info/condition-code-view-dialog";
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
import type { ConditionCodeRow } from "@/types/condition-code";

type Props = {
  initial: ConditionCodesPageResult;
  pageSize: number;
};

type SearchFilters = ConditionCodesPageResult["filters"];

const SEARCH_DEBOUNCE_MS = 220;

const EMPTY_FILTERS: SearchFilters = {
  code: "",
  name: "",
};

function downloadCsv(filename: string, rows: ConditionCodeRow[]) {
  const columns = ["Condition Code", "Condition Name", "Description", "Enabled"];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
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
  field,
  value,
  onChange,
  onSelectSuggestion,
}: {
  label: string;
  placeholder: string;
  field: ConditionCodeSuggestionField;
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
        const next = await getConditionCodeSuggestions({
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
  }, [field, value]);

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

export function ConditionCodesDashboard({ initial, pageSize }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ConditionCodeRow | null>(null);
  const [activeRow, setActiveRow] = useState<ConditionCodeRow | null>(null);
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
      const next = await getConditionCodes({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load condition codes",
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
    const next = await getConditionCodes({
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
      `condition-codes-${new Date().toISOString().slice(0, 10)}.csv`,
      result.rows
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Condition Codes</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain container condition master data. {rangeLabel}
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
              New Condition Code
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[minmax(0,280px)_minmax(0,320px)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <SuggestionInput
            label="Condition Code"
            placeholder="Fuzzy match condition code"
            field="code"
            value={draftFilters.code}
            onChange={(value) => setDraftFilters((current) => ({ ...current, code: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, code: value }))
            }
          />
          <SuggestionInput
            label="Condition Name"
            placeholder="Fuzzy match condition name"
            field="name"
            value={draftFilters.name}
            onChange={(value) => setDraftFilters((current) => ({ ...current, name: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, name: value }))
            }
          />
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
                <TableHead className="sticky left-0 top-0 z-30 min-w-[180px] bg-card py-2 text-xs uppercase tracking-wide">
                  Condition Code
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[260px] bg-card py-2 text-xs uppercase tracking-wide">
                  Condition Name
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[320px] bg-card py-2 text-xs uppercase tracking-wide">
                  Description
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[120px] bg-card py-2 text-xs uppercase tracking-wide">
                  Enabled
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
                    Loading condition codes...
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No condition code records found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/20">
                    <TableCell className="sticky left-0 z-10 bg-card py-2.5 font-medium">
                      {row.code}
                    </TableCell>
                    <TableCell className="py-2.5">{row.name}</TableCell>
                    <TableCell className="py-2.5 text-muted-foreground">
                      {row.description?.trim() ? row.description : "-"}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline">
                        {row.status === "ACTIVE" ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-3 text-sm">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-500"
                          onClick={() => {
                            setActiveRow(row);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-500"
                          onClick={() => {
                            setEditingRow(row);
                            setDialogOpen(true);
                          }}
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

      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <ConditionCodeFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        row={editingRow}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingRow(null);
        }}
        onSaved={refreshCurrentPage}
      />

      <ConditionCodeViewDialog
        open={viewDialogOpen}
        row={activeRow}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setActiveRow(null);
        }}
      />
    </div>
  );
}
