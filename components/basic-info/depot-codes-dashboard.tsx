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
  getDepotCodes,
  getDepotSuggestions,
  type DepotCodesPageResult,
  type DepotSuggestionField,
} from "@/app/basic-info/depots/actions";
import { DepotCodeFormDialog } from "@/components/basic-info/depot-code-form-dialog";
import { DepotCodeViewDialog } from "@/components/basic-info/depot-code-view-dialog";
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
import type { DepotCityOption, DepotCodeRow } from "@/types/depot-code";

type DepotCodesDashboardProps = {
  initial: DepotCodesPageResult;
  pageSize: number;
  cityOptions: DepotCityOption[];
};

type SearchFilters = DepotCodesPageResult["filters"];
type SortField =
  | "depot_code"
  | "depot_name"
  | "city_code"
  | "depot_type"
  | "is_primary_depot"
  | "depot_address"
  | "contact_person"
  | "contact_email"
  | "depot_tel";
type SortDirection = "asc" | "desc";

const EMPTY_FILTERS: SearchFilters = {
  depotCode: "",
  depotName: "",
  cityId: "",
  depotType: "",
  status: "",
};

const SEARCH_DEBOUNCE_MS = 220;

const DEPOT_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  FACTORY_YARD: "Factory Yard",
  SHIPPING_LINES: "Shipping Lines",
  TRADER: "Trader",
  CONSIGNMENT: "Consignment",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  NORMAL: "Normal",
  SUSPEND: "Suspend",
};

function cityCodeForRow(row: DepotCodeRow) {
  return row.cities?.city_code ?? "-";
}

function gateContactEmailForRow(row: DepotCodeRow) {
  const gateEmail = row.gate_email?.trim();
  if (gateEmail) return gateEmail;
  const ownerEmail = row.contact_email?.trim();
  if (ownerEmail) return ownerEmail;
  return "-";
}

function formatNumber(value: string | number | null | undefined) {
  if (value == null || value === "") return "";
  const parsed = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(parsed)) return String(value);
  return parsed.toFixed(2);
}

function buildAdditionalCostSummary(row: DepotCodeRow) {
  const dynamicRows =
    row.depot_additional_costs?.map((item) => ({
      cost_item: item.cost_item,
      rate: formatNumber(item.rate),
      currency: item.currency ?? "",
      remark: item.remark?.trim() ?? "",
    })) ?? [];

  const legacyRows =
    dynamicRows.length === 0
      ? [
          ["PTI", row.pti_cost],
          ["Inspection Fee", row.inspection_cost],
          ["Survey Fee", row.survey_cost],
          ["Minimum Repair Cost", row.min_repair_cost],
          ["Estimate Recovery Fee", row.est_recovery_fee],
          ["User Return Surcharge In", row.user_return_surcharge_in],
          ["User Return Surcharge Out", row.user_return_surcharge_out],
        ]
          .map(([cost_item, rate]) => ({
            cost_item,
            rate: formatNumber(rate),
            currency: row.currency ?? "",
            remark: "",
          }))
          .filter((item) => item.rate && Number(item.rate) > 0)
      : [];

  return [...dynamicRows, ...legacyRows]
    .map((item) =>
      [item.cost_item, item.rate, item.currency, item.remark]
        .filter(Boolean)
        .join(" / ")
    )
    .join("; ");
}

function downloadCsv(filename: string, rows: DepotCodeRow[]) {
  const columns = [
    "City Code",
    "Depot Code",
    "Depot Name",
    "Depot Name in Chinese",
    "Type",
    "Status",
    "Primary Depot",
    "Region",
    "City",
    "Country",
    "Address",
    "Chinese Address",
    "Contact Person",
    "Contact Email (Gate)",
    "Phone",
    "Fax",
    "Contact Email (Owner)",
    "Account Email",
    "Gate In 20",
    "Gate Out 20",
    "Lift In 20",
    "Lift Out 20",
    "Gate In 40",
    "Gate Out 40",
    "Lift In 40",
    "Lift Out 40",
    "Storage 20 / Day",
    "Storage 40 / Day",
    "Labour Cost",
    "Free Day",
    "Currency",
    "Additional Costs",
    "Settlement Cycle",
    "Payment Remark",
    "Other Terms Remark",
    "Data Updated On",
    "Remark",
  ];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        cityCodeForRow(row),
        row.depot_code,
        row.depot_name,
        row.depot_name_cn,
        DEPOT_TYPE_LABELS[row.depot_type ?? ""] ?? row.depot_type ?? "-",
        STATUS_LABELS[row.status] ?? row.status ?? "-",
        row.is_primary_depot ? "Yes" : "No",
        row.cities?.region_codes?.region_name ?? row.cities?.region ?? "",
        row.cities?.city_name ?? "",
        row.country_name ?? row.cities?.country ?? "",
        row.depot_address,
        row.depot_address_cn,
        row.contact_person,
        row.gate_email?.trim() || "",
        row.depot_tel,
        row.fax,
        row.contact_email,
        row.account_email,
        formatNumber(row.gate_in_20_cost),
        formatNumber(row.gate_out_20_cost),
        formatNumber(row.lift_in_20_cost),
        formatNumber(row.lift_out_20_cost),
        formatNumber(row.gate_in_40_cost),
        formatNumber(row.gate_out_40_cost),
        formatNumber(row.lift_in_40_cost),
        formatNumber(row.lift_out_40_cost),
        formatNumber(row.storage_rate_20),
        formatNumber(row.storage_rate_40),
        formatNumber(row.labour_cost),
        formatNumber(row.free_days),
        row.currency,
        buildAdditionalCostSummary(row),
        row.settlement_cycle,
        row.payment_remark,
        row.other_terms_remark,
        row.data_updated_on,
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
  field: DepotSuggestionField;
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
        const next = await getDepotSuggestions({ field, q: trimmed, limit: 6 });
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
            <div className="px-3 py-2 text-sm text-muted-foreground">Matching depots...</div>
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

export function DepotCodesDashboard({
  initial,
  pageSize,
  cityOptions,
}: DepotCodesDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDepot, setEditingDepot] = useState<DepotCodeRow | null>(null);
  const [activeDepot, setActiveDepot] = useState<DepotCodeRow | null>(null);
  const [sortBy, setSortBy] = useState<SortField>("depot_code");
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
      const next = await getDepotCodes({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load depots",
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
    const next = await getDepotCodes({
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
        sortBy === "city_code"
          ? cityCodeForRow(a).toLowerCase()
          : sortBy === "is_primary_depot"
            ? (a.is_primary_depot ? "yes" : "no")
            : sortBy === "contact_email"
              ? gateContactEmailForRow(a).toLowerCase()
            : (a[sortBy as keyof DepotCodeRow] ?? "").toString().toLowerCase();
      const right =
        sortBy === "city_code"
          ? cityCodeForRow(b).toLowerCase()
          : sortBy === "is_primary_depot"
            ? (b.is_primary_depot ? "yes" : "no")
            : sortBy === "contact_email"
              ? gateContactEmailForRow(b).toLowerCase()
            : (b[sortBy as keyof DepotCodeRow] ?? "").toString().toLowerCase();
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

  function exportCurrentView() {
    void (async () => {
      try {
        setLoading(true);
        const exportResult = await getDepotCodes({
          ...appliedFilters,
          page: 1,
          pageSize: Math.max(result.totalCount, pageSize, 1000),
        });
        downloadCsv(
          `depot-codes-${new Date().toISOString().slice(0, 10)}.csv`,
          exportResult.rows
        );
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Could not export depot codes",
          description: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-5">
      <div className="relative z-20 flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Depot Codes</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Maintain depot master data. {rangeLabel}
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
                setEditingDepot(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-3.5" />
              New Depot
            </Button>
          </div>
        </div>

        <form
          className="grid items-end gap-2 xl:grid-cols-[150px_minmax(0,1.9fr)_120px_160px_140px_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            applySearch();
          }}
        >
          <SuggestionInput
            label="Depot Code"
            placeholder="Fuzzy match depot code"
            field="depotCode"
            value={draftFilters.depotCode}
            onChange={(value) => setDraftFilters((current) => ({ ...current, depotCode: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, depotCode: value }))
            }
          />
          <SuggestionInput
            label="Depot Name"
            placeholder="Fuzzy match depot name"
            field="depotName"
            value={draftFilters.depotName}
            onChange={(value) => setDraftFilters((current) => ({ ...current, depotName: value }))}
            onSelectSuggestion={(value) =>
              setDraftFilters((current) => ({ ...current, depotName: value }))
            }
          />
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">City</label>
            <Select
              value={draftFilters.cityId || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  cityId: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select city code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Cities</SelectItem>
                {cityOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.city_code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0">
            <label className="mb-1.5 block text-xs font-medium">Type</label>
            <Select
              value={draftFilters.depotType || "__all__"}
              onValueChange={(value) =>
                setDraftFilters((current) => ({
                  ...current,
                  depotType: value === "__all__" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
                <SelectItem value="FACTORY_YARD">Factory Yard</SelectItem>
                <SelectItem value="SHIPPING_LINES">Shipping Lines</SelectItem>
                <SelectItem value="TRADER">Trader</SelectItem>
                <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
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
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="SUSPEND">Suspend</SelectItem>
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
                <TableHead className="sticky left-0 top-0 z-30 min-w-[130px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("city_code")} className="inline-flex items-center gap-1.5">
                    City Code
                    <SortIcon field="city_code" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("depot_code")} className="inline-flex items-center gap-1.5">
                    Depot Code
                    <SortIcon field="depot_code" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("depot_name")} className="inline-flex items-center gap-1.5">
                    Depot Name
                    <SortIcon field="depot_name" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[140px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("depot_type")} className="inline-flex items-center gap-1.5">
                    Type
                    <SortIcon field="depot_type" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[130px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("is_primary_depot")} className="inline-flex items-center gap-1.5">
                    Primary Depot
                    <SortIcon field="is_primary_depot" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[240px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("depot_address")} className="inline-flex items-center gap-1.5">
                    Address
                    <SortIcon field="depot_address" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[160px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("contact_person")} className="inline-flex items-center gap-1.5">
                    Contact Person
                    <SortIcon field="contact_person" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[220px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("contact_email")} className="inline-flex items-center gap-1.5">
                    Contact Email
                    <SortIcon field="contact_email" />
                  </button>
                </TableHead>
                <TableHead className="sticky top-0 z-20 min-w-[150px] bg-card py-2 text-xs uppercase tracking-wide">
                  <button type="button" onClick={() => toggleSort("depot_tel")} className="inline-flex items-center gap-1.5">
                    Phone
                    <SortIcon field="depot_tel" />
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
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    Loading depots...
                  </TableCell>
                </TableRow>
              ) : sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                    No depot records found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-20 bg-card py-2 font-medium">
                      {cityCodeForRow(row)}
                    </TableCell>
                    <TableCell className="py-2">{row.depot_code}</TableCell>
                    <TableCell className="max-w-[220px] py-2">
                      <div className="line-clamp-2">{row.depot_name}</div>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="px-2 py-0 text-[11px]">
                        {DEPOT_TYPE_LABELS[row.depot_type ?? ""] ?? row.depot_type ?? "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge
                        variant={row.is_primary_depot ? "outline" : "secondary"}
                        className="px-2 py-0 text-[11px]"
                      >
                        {row.is_primary_depot ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] py-2">
                      <div className="line-clamp-2">{row.depot_address ?? "-"}</div>
                    </TableCell>
                    <TableCell className="py-2">{row.contact_person ?? "-"}</TableCell>
                    <TableCell className="max-w-[220px] py-2">
                      <div className="truncate">{gateContactEmailForRow(row)}</div>
                    </TableCell>
                    <TableCell className="py-2">{row.depot_tel ?? "-"}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-3 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDepot(row);
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
                            setEditingDepot(row);
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

      <DepotCodeFormDialog
        open={dialogOpen}
        mode={editingDepot ? "edit" : "create"}
        depot={editingDepot}
        cityOptions={cityOptions}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <DepotCodeViewDialog
        open={viewDialogOpen}
        depot={activeDepot}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
