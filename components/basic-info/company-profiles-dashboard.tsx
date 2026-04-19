"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Eye,
  Landmark,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCompanyProfileSuggestions,
  getCompanyProfiles,
  type CompanySuggestionField,
  type CompanyProfilesPageResult,
} from "@/app/basic-info/companies/actions";
import { CompanyBankAccountsDialog } from "@/components/basic-info/company-bank-accounts-dialog";
import { CompanyProfileFormDialog } from "@/components/basic-info/company-profile-form-dialog";
import { CompanyProfileViewDialog } from "@/components/basic-info/company-profile-view-dialog";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
} from "@/components/shared/page-standard/table-standard";
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
import type { CompanyProfile } from "@/types/company-profile";

type CompanyProfilesDashboardProps = {
  initial: CompanyProfilesPageResult;
  pageSize: number;
};

type SearchFilters = CompanyProfilesPageResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  companyNameCn: "",
  companyNameEn: "",
  address: "",
  phone: "",
  email: "",
};

const SEARCH_DEBOUNCE_MS = 220;

type SortableColumn = {
  key:
    | "company_name_cn"
    | "company_name_en"
    | "address_cn"
    | "address_en"
    | "phone"
    | "email"
    | "location_code"
    | "status"
    | "created_by"
    | "created_at";
  label: string;
  className?: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadCsv(filename: string, rows: CompanyProfile[]) {
  const columns = [
    "Company Name",
    "Company Name in Chinese",
    "Address",
    "Chinese Address",
    "Phone",
    "Email",
    "Location",
    "Status",
    "Created At",
  ];

  const escape = (value: string | null | undefined) => {
    const raw = value ?? "";
    const escaped = raw.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.company_name_en,
        row.company_name_cn,
        row.address_en,
        row.address_cn,
        row.phone,
        row.email,
        row.location_code,
        row.status,
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

type SearchAutocompleteFieldProps = {
  label: string;
  field: CompanySuggestionField;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (value: string) => void;
};

function SearchAutocompleteField({
  label,
  field,
  value,
  placeholder,
  onChange,
  onSelectSuggestion,
}: SearchAutocompleteFieldProps) {
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
        const next = await getCompanyProfileSuggestions({
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
        if (active) {
          setLoadingSuggestions(false);
        }
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
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative z-40 space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          if (!open && event.target.value.trim()) {
            setOpen(true);
          }
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onKeyDown={(event) => {
          if (!open || suggestions.length === 0) {
            return;
          }

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
        placeholder={placeholder}
        className="h-9 text-sm"
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {loadingSuggestions ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Matching records...
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
                  const index = suggestions.indexOf(suggestion);
                  setHighlightedIndex(index);
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

export function CompanyProfilesDashboard({
  initial,
  pageSize,
}: CompanyProfilesDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(
    initial.filters ?? EMPTY_FILTERS
  );
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(
    initial.filters ?? EMPTY_FILTERS
  );
  const [sortBy, setSortBy] = useState<SortableColumn["key"]>("company_name_en");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(initial.page);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [bankDialogOpen, setBankDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(
    null
  );
  const [activeCompany, setActiveCompany] = useState<CompanyProfile | null>(null);
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
      const next = await getCompanyProfiles({
        ...appliedFilters,
        page,
        pageSize,
      });
      setResult(next);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load companies",
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
    const next = await getCompanyProfiles({
      ...appliedFilters,
      page,
      pageSize,
    });
    setResult(next);
  }

  function applySearch() {
    setActiveCompany(null);
    setPage(1);
    setAppliedFilters(draftFilters);
  }

  function toggleSort(field: SortableColumn["key"]) {
    if (sortBy === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDirection("asc");
  }

  const columns: SortableColumn[] = [
    { key: "company_name_en", label: "Company Name", className: "min-w-[180px]" },
    { key: "company_name_cn", label: "Company Name in Chinese", className: "min-w-[180px]" },
    { key: "address_en", label: "Address", className: "min-w-[180px]" },
    { key: "address_cn", label: "Chinese Address", className: "min-w-[180px]" },
    { key: "phone", label: "Phone", className: "min-w-[120px]" },
    { key: "email", label: "Email", className: "min-w-[170px]" },
    { key: "location_code", label: "Location", className: "min-w-[90px]" },
    { key: "status", label: "Status", className: "min-w-[90px]" },
    { key: "created_by", label: "Created By", className: "min-w-[90px]" },
    { key: "created_at", label: "Created At", className: "min-w-[140px]" },
  ];

  const sortedRows = useMemo(() => {
    const rows = [...result.rows];
    rows.sort((a, b) => {
      const left = a[sortBy];
      const right = b[sortBy];

      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;

      const leftValue = typeof left === "string" ? left.toLowerCase() : left;
      const rightValue =
        typeof right === "string" ? right.toLowerCase() : right;

      if (leftValue < rightValue) {
        return sortDirection === "asc" ? -1 : 1;
      }
      if (leftValue > rightValue) {
        return sortDirection === "asc" ? 1 : -1;
      }
      return 0;
    });
    return rows;
  }, [result.rows, sortBy, sortDirection]);

  function SortIcon({ field }: { field: SortableColumn["key"] }) {
    if (sortBy !== field) {
      return <ArrowUpDown className="size-3.5 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="size-3.5" />;
    }
    return <ArrowDown className="size-3.5" />;
  }

  function resetSearch() {
    setDraftFilters(EMPTY_FILTERS);
    setPage(1);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function openCreateDialog() {
    setEditingCompany(null);
    setDialogOpen(true);
  }

  function openEditDialog(company: CompanyProfile) {
    setEditingCompany(company);
    setDialogOpen(true);
  }

  function openViewDialog(company: CompanyProfile) {
    setActiveCompany(company);
    setViewDialogOpen(true);
  }

  function openBankAccountsDialog(company: CompanyProfile) {
    setActiveCompany(company);
    setBankDialogOpen(true);
  }

  function exportCurrentView() {
    downloadCsv(
      `company-profiles-${new Date().toISOString().slice(0, 10)}.csv`,
      result.rows
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <div className="relative z-20 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Company Information Management
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Maintain company master data. {rangeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={exportCurrentView}>
              <Download className="mr-2 size-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 size-3.5" />
              New Company
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
          <div className="grid items-end gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <SearchAutocompleteField
                label="Company Name"
                field="companyNameEn"
                value={draftFilters.companyNameEn ?? ""}
                placeholder="Fuzzy match company name"
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    companyNameEn: value,
                  }))
                }
                onSelectSuggestion={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    companyNameEn: value,
                  }))
                }
              />
            </div>
            <div className="min-w-0">
              <SearchAutocompleteField
                label="Company Name in Chinese"
                field="companyNameCn"
                value={draftFilters.companyNameCn ?? ""}
                placeholder="Fuzzy match Chinese company name"
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    companyNameCn: value,
                  }))
                }
                onSelectSuggestion={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    companyNameCn: value,
                  }))
                }
              />
            </div>
            <div className="min-w-0">
              <SearchAutocompleteField
                label="Address"
                field="address"
                value={draftFilters.address ?? ""}
                placeholder="Fuzzy match address"
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    address: value,
                  }))
                }
                onSelectSuggestion={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    address: value,
                  }))
                }
              />
            </div>
            <div className="min-w-0">
              <SearchAutocompleteField
                label="Phone"
                field="phone"
                value={draftFilters.phone ?? ""}
                placeholder="Fuzzy match phone"
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
                onSelectSuggestion={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    phone: value,
                  }))
                }
              />
            </div>
            <div className="min-w-0">
              <SearchAutocompleteField
                label="Email"
                field="email"
                value={draftFilters.email ?? ""}
                placeholder="Fuzzy match email"
                onChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    email: value,
                  }))
                }
                onSelectSuggestion={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    email: value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
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
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={`sticky top-0 z-20 bg-card py-2 text-xs uppercase tracking-wide ${column.key === "company_name_en" ? "left-0 z-30" : ""} ${column.className ?? ""}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-left transition hover:text-foreground"
                  >
                    <span>{column.label}</span>
                    <SortIcon field={column.key} />
                  </button>
                </TableHead>
              ))}
              <TableHead className={`${ACTIONS_STICKY_HEAD_CLASS} top-0 w-[220px] min-w-[220px] py-2 text-right text-xs uppercase tracking-wide`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  Loading companies...
                </TableCell>
              </TableRow>
            ) : result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                  No company records found.
                </TableCell>
              </TableRow>
            ) : (
              sortedRows.map((row) => (
                <TableRow key={row.id} className="align-middle">
                  <TableCell className="sticky left-0 z-20 max-w-[180px] bg-card py-2 font-medium">
                    <div className="line-clamp-2">{row.company_name_en ?? "-"}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] py-2">
                    <div className="line-clamp-2">{row.company_name_cn}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] py-2">
                    <div className="line-clamp-2">{row.address_en ?? "-"}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] py-2">
                    <div className="line-clamp-2">{row.address_cn ?? "-"}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-2">{row.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-[180px] py-2">
                    <div className="truncate">{row.email ?? "-"}</div>
                  </TableCell>
                  <TableCell className="py-2">{row.location_code ?? "-"}</TableCell>
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
                  <TableCell className="py-2 text-xs">{formatDateTime(row.created_at)}</TableCell>
                  <TableCell className={`${ACTIONS_STICKY_CELL_CLASS} w-[220px] min-w-[220px]`}>
                    <div className="flex justify-end gap-3 text-xs font-medium">
                      <button
                        type="button"
                        onClick={() => openViewDialog(row)}
                        className="inline-flex items-center gap-1.5 text-sky-600 transition hover:text-sky-500"
                      >
                        <Eye className="size-3.5" />
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
                      <button
                        type="button"
                        onClick={() => openBankAccountsDialog(row)}
                        className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground"
                      >
                        <Landmark className="size-3.5" />
                        Account Info
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
        <div className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </div>
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
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </Button>
        </div>
      </div>

      <CompanyProfileFormDialog
        open={dialogOpen}
        mode={editingCompany ? "edit" : "create"}
        company={editingCompany}
        onOpenChange={setDialogOpen}
        onSaved={refreshCurrentPage}
      />
      <CompanyProfileViewDialog
        open={viewDialogOpen}
        company={activeCompany}
        onOpenChange={setViewDialogOpen}
      />
      <CompanyBankAccountsDialog
        open={bankDialogOpen}
        company={activeCompany}
        onOpenChange={setBankDialogOpen}
      />
    </div>
  );
}
