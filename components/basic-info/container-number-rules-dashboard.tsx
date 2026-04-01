"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getContainerNumberRulePrefixSuggestions,
  getContainerNumberRules,
  type ContainerNumberRulesPageResult,
} from "@/app/basic-info/container-number-rules/actions";
import { ContainerNumberRuleFormDialog } from "@/components/basic-info/container-number-rule-form-dialog";
import { ContainerNumberRuleViewDialog } from "@/components/basic-info/container-number-rule-view-dialog";
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
import type {
  ContainerNumberRuleRow,
  ContainerNumberRuleSizeOption,
} from "@/types/container-number-rule";

type Props = {
  initial: ContainerNumberRulesPageResult;
  pageSize: number;
  sizeOptions: ContainerNumberRuleSizeOption[];
};

type SearchFilters = ContainerNumberRulesPageResult["filters"];

const SEARCH_DEBOUNCE_MS = 220;

const EMPTY_FILTERS: SearchFilters = {
  sizeCodeId: "",
  prefix: "",
  status: "",
};

function downloadCsv(filename: string, rows: ContainerNumberRuleRow[]) {
  const columns = [
    "Size",
    "Prefix",
    "Serial Length",
    "Start Serial",
    "End Serial",
    "Current Serial",
    "Remaining Available",
    "Example Container Number",
    "Status",
    "Remark",
  ];
  const escape = (value: string | number | null | undefined) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.sizeCode,
        row.prefix,
        row.serialLength,
        row.startSerial,
        row.endSerial,
        row.currentSerial,
        row.remainingAvailable,
        row.exampleContainerNumber,
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

function PrefixSuggestionInput({
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
        const next = await getContainerNumberRulePrefixSuggestions({
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
      <label className="mb-1.5 block text-xs font-medium">Prefix</label>
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
        placeholder="Fuzzy match prefix"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loadingSuggestions ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Matching prefixes...</div>
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

export function ContainerNumberRulesDashboard({
  initial,
  pageSize,
  sizeOptions,
}: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ContainerNumberRuleRow | null>(null);
  const [activeRow, setActiveRow] = useState<ContainerNumberRuleRow | null>(null);
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
      const next = await getContainerNumberRules({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load container number rules",
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
    const next = await getContainerNumberRules({
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
      `container-number-rules-${new Date().toISOString().slice(0, 10)}.csv`,
      result.rows
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Container Number Rules</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain prefix and serial rules used to generate container numbers. {rangeLabel}
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
              New Rule
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[180px_minmax(0,260px)_180px_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <div className="relative z-40 min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Size</label>
            <Select
              value={draftFilters.sizeCodeId || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  sizeCodeId: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All Sizes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Sizes</SelectItem>
                {sizeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PrefixSuggestionInput
            value={draftFilters.prefix}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, prefix: value }))
            }
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, prefix: value }))
            }
          />

          <div className="relative z-40 min-w-0">
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
                <SelectValue placeholder="All Statuses" />
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
          <Button size="sm" type="button" variant="outline" className="h-9 px-3" onClick={resetSearch}>
            <RotateCcw className="mr-2 size-3.5" />
            Reset
          </Button>
        </form>
      </div>

      <div className="relative z-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="max-h-[560px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                <TableHead className="sticky left-0 z-20 min-w-[100px] bg-card">Size</TableHead>
                <TableHead className="min-w-[140px]">Prefix</TableHead>
                <TableHead className="min-w-[110px]">Serial Length</TableHead>
                <TableHead className="min-w-[120px]">Start Serial</TableHead>
                <TableHead className="min-w-[120px]">End Serial</TableHead>
                <TableHead className="min-w-[120px]">Current Serial</TableHead>
                <TableHead className="min-w-[140px]">Remaining Available</TableHead>
                <TableHead className="min-w-[170px]">Example Container Number</TableHead>
                <TableHead className="min-w-[110px]">Status</TableHead>
                <TableHead className="min-w-[220px]">Remark</TableHead>
                <TableHead className="min-w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-28 text-center text-muted-foreground">
                    {loading ? "Loading rules..." : "No container number rules found."}
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-10 bg-card font-medium">
                      {row.sizeCode}
                    </TableCell>
                    <TableCell>{row.prefix}</TableCell>
                    <TableCell>{row.serialLength}</TableCell>
                    <TableCell>{row.startSerial}</TableCell>
                    <TableCell>{row.endSerial}</TableCell>
                    <TableCell className="font-medium text-primary">{row.currentSerial}</TableCell>
                    <TableCell className="font-medium text-emerald-600">
                      {row.remainingAvailable}
                    </TableCell>
                    <TableCell>{row.exampleContainerNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {row.status === "ACTIVE" ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{row.remark || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3 text-sm">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700"
                          onClick={() => {
                            setActiveRow(row);
                            setViewDialogOpen(true);
                          }}
                        >
                          <Eye className="size-4" />
                          View
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"
                          onClick={() => {
                            setEditingRow(row);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
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

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>

      <ContainerNumberRuleViewDialog
        open={viewDialogOpen}
        row={activeRow}
        onOpenChange={(nextOpen) => {
          setViewDialogOpen(nextOpen);
          if (!nextOpen) setActiveRow(null);
        }}
      />

      <ContainerNumberRuleFormDialog
        open={dialogOpen}
        mode={editingRow ? "edit" : "create"}
        row={editingRow}
        sizeOptions={sizeOptions}
        onOpenChange={(nextOpen) => {
          setDialogOpen(nextOpen);
          if (!nextOpen) setEditingRow(null);
        }}
        onSaved={refreshCurrentPage}
      />
    </div>
  );
}
