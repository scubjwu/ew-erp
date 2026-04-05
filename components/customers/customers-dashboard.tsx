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
import Link from "next/link";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  exportCustomers,
  getCustomers,
  type CustomerAutocompleteOption,
  type CustomerFilterOptions,
  type CustomersPageResult,
} from "@/app/customers/actions";
import {
  DEFAULT_CUSTOMER_SORT,
  type CustomerSortBy,
  type CustomerSortDirection,
} from "@/app/customers/query-helpers";
import { AutocompleteFilterInput } from "@/components/shared/page-standard/autocomplete-filter-input";
import { StandardListPageHeader } from "@/components/shared/page-standard/standard-list-page-header";
import { StandardSearchToolbar } from "@/components/shared/page-standard/standard-search-toolbar";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import {
  ACTIONS_STICKY_CELL_CLASS,
  ACTIONS_STICKY_HEAD_CLASS,
  type SortableColumnConfig,
} from "@/components/shared/page-standard/table-standard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Customer } from "@/types/customer";

type CustomersDashboardProps = {
  initial: CustomersPageResult;
  pageSize: number;
  filterOptions: CustomerFilterOptions;
};

type SearchFilters = CustomersPageResult["filters"];

type AutocompleteInputState = {
  customerId: string;
  companyName: string;
};

const EMPTY_FILTERS: SearchFilters = {
  customerId: "",
  companyName: "",
};

const SORTABLE_COLUMNS: Array<SortableColumnConfig<CustomerSortBy>> = [
  { key: "customerId", label: "Customer ID", sortable: true, sortKey: "customerId", widthClass: "min-w-[140px]" },
  { key: "companyName", label: "Legal Company Name", sortable: true, sortKey: "companyName", widthClass: "min-w-[240px]" },
  { key: "companyNameOtherLanguage", label: "Company Name (Other Language)", sortable: true, sortKey: "companyNameOtherLanguage", widthClass: "min-w-[240px]" },
  { key: "customerGrade", label: "Customer Grade", sortable: true, sortKey: "customerGrade", widthClass: "min-w-[140px]" },
  { key: "region", label: "Customer Region", sortable: true, sortKey: "region", widthClass: "min-w-[140px]" },
  { key: "contactPhone", label: "Company Tel", sortable: true, sortKey: "contactPhone", widthClass: "min-w-[160px]" },
  { key: "creditLimit", label: "Credit Limit", sortable: true, sortKey: "creditLimit", align: "right", widthClass: "min-w-[140px]" },
  { key: "status", label: "Status", sortable: true, sortKey: "status", widthClass: "min-w-[140px]" },
];

function alignClass(align?: "left" | "center" | "right") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "";
}

function statusVariant(status: Customer["status"]) {
  if (status === "Normal") return "default" as const;
  if (status === "Prepayment") return "secondary" as const;
  return "outline" as const;
}

function buildAutocompleteInputState(filters: SearchFilters): AutocompleteInputState {
  return {
    customerId: filters.customerId,
    companyName: filters.companyName,
  };
}

function downloadCsv(filename: string, rows: Customer[]) {
  const headers = [
    "Customer ID",
    "Legal Company Name",
    "Company Name (Other Language)",
    "Customer Grade",
    "Customer Region",
    "Company Address",
    "Company Tel",
    "Contact Person",
    "Primary Contact Email",
    "Operations Emails",
    "Finance Emails",
    "Credit Limit",
    "Credit Term (Days)",
    "Assigned Sales",
    "Status",
    "Notes",
    "Certificate Links",
  ];
  const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.customer_custom_id ?? "",
        row.company_name ?? "",
        row.company_name_other_language ?? "",
        row.customer_grade ?? "",
        row.region?.region_code ?? "",
        row.address ?? "",
        row.contact_phone ?? "",
        row.contact_person ?? "",
        row.purchasing_emails?.[0] ?? "",
        (row.ops_emails ?? []).join("; "),
        (row.finance_emails ?? []).join("; "),
        row.credit_limit == null ? "" : String(row.credit_limit),
        row.credit_term_days == null ? "" : String(row.credit_term_days),
        row.assigned_sales ?? "",
        row.status ?? "",
        row.notes ?? "",
        (row.certificate_links ?? []).map((item) => item.link_url).join("; "),
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

function SortButton({
  label,
  sortKey,
  activeSortBy,
  activeDirection,
  onToggle,
}: {
  label: string;
  sortKey: CustomerSortBy;
  activeSortBy: CustomerSortBy;
  activeDirection: CustomerSortDirection;
  onToggle: (key: CustomerSortBy) => void;
}) {
  const active = activeSortBy === sortKey;
  const Icon = !active ? ArrowUpDown : activeDirection === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-foreground transition hover:text-primary"
      onClick={() => onToggle(sortKey)}
    >
      <span>{label}</span>
      <Icon className="size-3.5" />
    </button>
  );
}

export function CustomersDashboard({
  initial,
  pageSize,
  filterOptions,
}: CustomersDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [autocompleteInputs, setAutocompleteInputs] = useState<AutocompleteInputState>(() =>
    buildAutocompleteInputState(initial.filters)
  );
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [sort, setSort] = useState(initial.sort);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = result.page;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(result.totalCount / pageSize)),
    [pageSize, result.totalCount]
  );
  const start = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, result.totalCount);

  async function refresh(nextFilters: SearchFilters, nextPage = 1, nextSort = sort) {
    setLoading(true);
    try {
      const next = await getCustomers({
        ...nextFilters,
        sortBy: nextSort.sortBy,
        sortDirection: nextSort.sortDirection,
        page: nextPage,
        pageSize,
      });
      setResult(next);
      setAppliedFilters(next.filters);
      setSort(next.sort);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load customers",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportCustomers({
        ...appliedFilters,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export customers",
        description: getErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  }

  function handleSearchSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void refresh(draftFilters, 1, sort);
  }

  function handleReset() {
    setDraftFilters(EMPTY_FILTERS);
    setAutocompleteInputs(buildAutocompleteInputState(EMPTY_FILTERS));
    void refresh(EMPTY_FILTERS, 1, DEFAULT_CUSTOMER_SORT);
  }

  function toggleSort(key: CustomerSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection: sort.sortBy === key && sort.sortDirection === "asc" ? "desc" : "asc",
    } as const;
    void refresh(appliedFilters, 1, nextSort);
  }

  function onAutocompleteInputChange(key: keyof AutocompleteInputState, value: string) {
    setAutocompleteInputs((current) => ({ ...current, [key]: value }));
    if (key === "customerId") {
      setDraftFilters((current) => ({ ...current, customerId: value }));
      return;
    }
    setDraftFilters((current) => ({ ...current, companyName: value }));
  }

  function onAutocompleteSelect(
    key: keyof AutocompleteInputState,
    option: CustomerAutocompleteOption | null
  ) {
    const nextValue = option?.value ?? "";
    setAutocompleteInputs((current) => ({ ...current, [key]: nextValue }));
    if (key === "customerId") {
      setDraftFilters((current) => ({ ...current, customerId: nextValue }));
      return;
    }
    setDraftFilters((current) => ({ ...current, companyName: nextValue }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <StandardListPageHeader
            title="Customers"
            description={`Maintain partner customer master data. Showing ${start}-${end} of ${result.totalCount}.`}
            actions={
              <>
                <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button asChild>
                  <Link href="/partners/customers/new">
                    <Plus className="size-4" />
                    New Customer
                  </Link>
                </Button>
              </>
            }
          />

          <StandardSearchToolbar
            onSubmit={handleSearchSubmit}
            fieldsClassName="md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            primaryActions={
              <>
                <Button type="submit" disabled={loading}>
                  <Search className="size-4" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </>
            }
          >
            <AutocompleteFilterInput
              label="Customer ID"
              placeholder="Search customer ID"
              options={filterOptions.customerIds}
              value={draftFilters.customerId}
              inputValue={autocompleteInputs.customerId}
              onInputChange={(value) => onAutocompleteInputChange("customerId", value)}
              onSelect={(option) => onAutocompleteSelect("customerId", option)}
              onClear={() => onAutocompleteSelect("customerId", null)}
            />
            <AutocompleteFilterInput
              label="Legal Company Name"
              placeholder="Search legal company name"
              options={filterOptions.legalCompanyNames}
              value={draftFilters.companyName}
              inputValue={autocompleteInputs.companyName}
              onInputChange={(value) => onAutocompleteInputChange("companyName", value)}
              onSelect={(option) => onAutocompleteSelect("companyName", option)}
              onClear={() => onAutocompleteSelect("companyName", null)}
            />
          </StandardSearchToolbar>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead
                      key={column.key}
                      className={`${column.widthClass ?? ""} ${alignClass(column.align)}`.trim()}
                    >
                      {column.sortable && column.sortKey ? (
                        <SortButton
                          label={column.label}
                          sortKey={column.sortKey}
                          activeSortBy={sort.sortBy}
                          activeDirection={sort.sortDirection}
                          onToggle={toggleSort}
                        />
                      ) : (
                        column.label
                      )}
                    </TableHead>
                  ))}
                  <TableHead className={ACTIONS_STICKY_HEAD_CLASS}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-24 text-center text-sm text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-24 text-center text-sm text-muted-foreground">
                      No customer records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.customer_custom_id ?? "—"}</TableCell>
                      <TableCell>{row.company_name}</TableCell>
                      <TableCell>{row.company_name_other_language ?? "—"}</TableCell>
                      <TableCell>{row.customer_grade ?? "—"}</TableCell>
                      <TableCell>{row.region?.region_code ?? "—"}</TableCell>
                      <TableCell>{row.contact_phone ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {row.credit_limit == null ? "—" : row.credit_limit.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/partners/customers/${row.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Eye className="size-4" />
                            View
                          </Link>
                          <Link
                            href={`/partners/customers/${row.id}/edit`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Pencil className="size-4" />
                            Edit
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <StandardTablePagination
            summary={`Showing ${start}-${end} of ${result.totalCount} customers`}
            page={page}
            totalPages={totalPages}
            previousDisabled={loading || page <= 1}
            nextDisabled={loading || page >= totalPages}
            onPrevious={() => void refresh(appliedFilters, page - 1, sort)}
            onNext={() => void refresh(appliedFilters, page + 1, sort)}
          />
        </div>
      </div>
    </div>
  );
}
