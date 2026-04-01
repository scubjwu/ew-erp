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
  getCityLogistics,
  getCitySuggestions,
  type CityLogisticsPageResult,
  type CitySuggestionField,
} from "@/app/basic-info/cities/actions";
import { CityLogisticsFormDialog } from "@/components/basic-info/city-logistics-form-dialog";
import { CityLogisticsViewDialog } from "@/components/basic-info/city-logistics-view-dialog";
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
import type { CityLogisticsRow, RegionOption } from "@/types/city-logistics";

type SortField =
  | "city_code"
  | "city_name"
  | "region_name"
  | "country"
  | "remark";
type SortDirection = "asc" | "desc";

const SEARCH_DEBOUNCE_MS = 220;

function regionNameForRow(row: CityLogisticsRow) {
  return row.region_codes?.region_name ?? row.region ?? "-";
}

function downloadCsv(filename: string, rows: CityLogisticsRow[]) {
  const columns = [
    "City Code",
    "City / Port Name",
    "Region",
    "Country",
    "Remark",
  ];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.city_code,
        row.city_name,
        regionNameForRow(row),
        row.country,
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
  field: CitySuggestionField;
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
        const next = await getCitySuggestions({ field, q: trimmed, limit: 6 });
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
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Matching cities...
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

type CityLogisticsDashboardProps = {
  initial: CityLogisticsPageResult;
  pageSize: number;
  regionOptions: RegionOption[];
};

export function CityLogisticsDashboard({
  initial,
  pageSize,
  regionOptions,
}: CityLogisticsDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<CityLogisticsRow | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeCity, setActiveCity] = useState<CityLogisticsRow | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("city_code");
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
      const next = await getCityLogistics({
        cityCode: appliedFilters.cityCode,
        cityName: appliedFilters.cityName,
        regionId: appliedFilters.regionId,
        country: appliedFilters.country,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load cities",
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
    const next = await getCityLogistics({
      cityCode: appliedFilters.cityCode,
      cityName: appliedFilters.cityName,
      regionId: appliedFilters.regionId,
      country: appliedFilters.country,
      page,
      pageSize,
    });
    setResult(next);
  }

  function applySearch() {
    setPage(1);
    setAppliedFilters({
      cityCode: draftFilters.cityCode.trim(),
      cityName: draftFilters.cityName.trim(),
      regionId: draftFilters.regionId,
      country: draftFilters.country.trim(),
    });
  }

  function resetSearch() {
    const empty = { cityCode: "", cityName: "", regionId: "", country: "" };
    setDraftFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  }

  function openCreateDialog() {
    setEditingCity(null);
    setDialogOpen(true);
  }

  function openEditDialog(city: CityLogisticsRow) {
    setEditingCity(city);
    setDialogOpen(true);
  }

  function openViewDialog(city: CityLogisticsRow) {
    setActiveCity(city);
    setViewDialogOpen(true);
  }

  function exportCurrentView() {
    downloadCsv(`city-logistics-${new Date().toISOString().slice(0, 10)}.csv`, sortedRows);
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
      const left =
        sortBy === "region_name"
          ? regionNameForRow(a).toLowerCase()
          : (a[sortBy as keyof CityLogisticsRow] ?? "").toString().toLowerCase();
      const right =
        sortBy === "region_name"
          ? regionNameForRow(b).toLowerCase()
          : (b[sortBy as keyof CityLogisticsRow] ?? "").toString().toLowerCase();
      if (left < right) return sortDirection === "asc" ? -1 : 1;
      if (left > right) return sortDirection === "asc" ? 1 : -1;
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
            <h1 className="text-xl font-semibold tracking-tight">City Codes</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain city and port standard data. {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCurrentView}>
              <Download className="mr-2 size-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 size-3.5" />
              New City
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_220px_minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <SuggestionInput
            label="City Code"
            placeholder="Fuzzy match city code"
            field="cityCode"
            value={draftFilters.cityCode}
            onChange={(value) => setDraftFilters((current) => ({ ...current, cityCode: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, cityCode: value }))
            }
          />
          <SuggestionInput
            label="City Name"
            placeholder="Fuzzy match city name"
            field="cityName"
            value={draftFilters.cityName}
            onChange={(value) => setDraftFilters((current) => ({ ...current, cityName: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, cityName: value }))
            }
          />
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Region</label>
            <Select
              value={draftFilters.regionId || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  regionId: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Regions</SelectItem>
                {regionOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.region_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SuggestionInput
            label="Country"
            placeholder="Fuzzy match country"
            field="country"
            value={draftFilters.country}
            onChange={(value) => setDraftFilters((current) => ({ ...current, country: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, country: value }))
            }
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
        </form>
      </div>

      <div className="relative z-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="max-h-[calc(100dvh-270px)] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="sticky left-0 top-0 z-30 min-w-[160px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("city_code")} className="inline-flex items-center gap-1.5">
                    City Code
                    <SortIcon field="city_code" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[240px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("city_name")} className="inline-flex items-center gap-1.5">
                    City / Port Name
                    <SortIcon field="city_name" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[180px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("region_name")} className="inline-flex items-center gap-1.5">
                    Region
                    <SortIcon field="region_name" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[180px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("country")} className="inline-flex items-center gap-1.5">
                    Country
                    <SortIcon field="country" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("remark")} className="inline-flex items-center gap-1.5">
                    Remark
                    <SortIcon field="remark" />
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
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Loading cities...
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No city records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">
                      {row.city_code}
                    </TableCell>
                    <TableCell className="py-2">{row.city_name}</TableCell>
                    <TableCell className="py-2">{regionNameForRow(row)}</TableCell>
                    <TableCell className="py-2">{row.country}</TableCell>
                    <TableCell className="max-w-[220px] py-2">
                      <div className="line-clamp-2">{row.remark ?? "-"}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => openViewDialog(row)}
                          className="inline-flex items-center gap-1.5 text-sky-600 transition hover:text-sky-500"
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

      <CityLogisticsFormDialog
        open={dialogOpen}
        mode={editingCity ? "edit" : "create"}
        city={editingCity}
        regionOptions={regionOptions}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <CityLogisticsViewDialog
        open={viewDialogOpen}
        row={activeCity}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setActiveCity(null);
        }}
      />
    </div>
  );
}
