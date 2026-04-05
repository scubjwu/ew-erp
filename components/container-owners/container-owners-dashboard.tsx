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
import { useMemo, useState } from "react";

import {
  exportContainerOwners,
  getContainerOwners,
  type ContainerOwnerFilterOptions,
  type ContainerOwnerPageResult,
  type ContainerOwnerRegionOption,
} from "@/app/partners/container-owners/actions";
import {
  DEFAULT_CONTAINER_OWNER_SORT,
  type ContainerOwnerSortBy,
  type ContainerOwnerSortDirection,
} from "@/app/partners/container-owners/query-helpers";
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
import type { ContainerOwner } from "@/types/container-owner";

type Props = {
  initial: ContainerOwnerPageResult;
  pageSize: number;
  filterOptions: ContainerOwnerFilterOptions;
  regionOptions: ContainerOwnerRegionOption[];
};

type SearchFilters = ContainerOwnerPageResult["filters"];

type AutocompleteInputState = {
  containerOwnerCode: string;
  legalCompanyName: string;
  regionQuery: string;
};

const EMPTY_FILTERS: SearchFilters = {
  containerOwnerCode: "",
  legalCompanyName: "",
  regionQuery: "",
  selectedRegionId: "",
};

const SORTABLE_COLUMNS: Array<SortableColumnConfig<ContainerOwnerSortBy>> = [
  { key: "containerOwnerCode", label: "Container Owner Code", sortable: true, sortKey: "containerOwnerCode", widthClass: "min-w-[170px]" },
  { key: "legalCompanyName", label: "Legal Company Name", sortable: true, sortKey: "legalCompanyName", widthClass: "min-w-[220px]" },
  { key: "companyName", label: "Company Name", sortable: true, sortKey: "companyName", widthClass: "min-w-[220px]" },
  { key: "primaryContactPerson", label: "Primary Contact Person", sortable: true, sortKey: "primaryContactPerson", widthClass: "min-w-[180px]" },
  { key: "email", label: "Email", sortable: true, sortKey: "email", widthClass: "min-w-[220px]" },
  { key: "tel", label: "Tel", sortable: true, sortKey: "tel", widthClass: "min-w-[140px]" },
  { key: "region", label: "Region", sortable: true, sortKey: "region", widthClass: "min-w-[140px]" },
  { key: "status", label: "Status", sortable: true, sortKey: "status", widthClass: "min-w-[120px]" },
  { key: "currentPrepaidBalance", label: "Current Prepaid Balance", sortable: true, sortKey: "currentPrepaidBalance", widthClass: "min-w-[170px]", align: "right" },
];

function statusVariant(status: ContainerOwner["status"]) {
  if (status === "Normal") return "default" as const;
  if (status === "Blocked") return "secondary" as const;
  return "outline" as const;
}

function buildAutocompleteInputState(filters: SearchFilters): AutocompleteInputState {
  return {
    containerOwnerCode: filters.containerOwnerCode,
    legalCompanyName: filters.legalCompanyName,
    regionQuery: filters.regionQuery,
  };
}

function downloadCsv(filename: string, rows: ContainerOwner[]) {
  const columns = [
    "Container Owner Code",
    "Legal Company Name",
    "Company Name",
    "Primary Contact Person",
    "Email",
    "Tel",
    "Status",
    "Region",
    "Country",
    "PIC",
    "Bank Account Name",
    "Bank Account Number",
    "Bank Name",
    "Bank Code",
    "Bank Address",
    "SWIFT Code",
    "Settlement Payment Term",
    "Settlement Credit Days",
    "Advance Payment Percentage",
    "Balance Trigger Event",
    "Settlement Currency",
    "Prepayment Pool",
    "Prepayment Threshold",
    "Current Prepaid Balance",
    "Remark",
    "Attachment URLs",
    "Attachment Remarks",
  ];

  const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.container_owner_code,
        row.legal_company_name,
        row.company_name,
        row.primary_contact_person,
        row.contact_email,
        row.contact_tel,
        row.status,
        row.region?.region_code ?? "",
        row.country,
        row.pic_user?.full_name ?? "",
        row.bank_account_name,
        row.bank_account_number,
        row.bank_name,
        row.bank_code,
        row.bank_address,
        row.swift_code,
        row.settlement_payment_term,
        row.settlement_credit_days == null ? "" : String(row.settlement_credit_days),
        row.settlement_advance_payment_percentage == null ? "" : String(row.settlement_advance_payment_percentage),
        row.settlement_balance_trigger_event,
        row.settlement_currency,
        row.settlement_prepayment_pool == null ? "" : row.settlement_prepayment_pool ? "Enabled" : "Disabled",
        row.settlement_prepayment_threshold == null ? "" : String(row.settlement_prepayment_threshold),
        row.settlement_current_prepaid_balance == null ? "" : String(row.settlement_current_prepaid_balance),
        row.remark,
        (row.attachment_links ?? []).map((item) => item.url).join("; "),
        (row.attachment_links ?? []).map((item) => item.remark ?? "").join("; "),
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
  sortKey: ContainerOwnerSortBy;
  activeSortBy: ContainerOwnerSortBy;
  activeDirection: ContainerOwnerSortDirection;
  onToggle: (key: ContainerOwnerSortBy) => void;
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

export function ContainerOwnersDashboard({
  initial,
  pageSize,
  filterOptions,
  regionOptions,
}: Props) {
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
      const next = await getContainerOwners({
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
        title: "Could not load container owners",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportContainerOwners({
        ...appliedFilters,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`container-owners-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export container owners",
        description: getErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(key: ContainerOwnerSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection: sort.sortBy === key && sort.sortDirection === "asc" ? "desc" : "asc",
    } as const;
    void refresh(appliedFilters, 1, nextSort);
  }

  function handleSearchSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void refresh(draftFilters, 1);
  }

  function resetFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setAutocompleteInputs(buildAutocompleteInputState(EMPTY_FILTERS));
    void refresh(EMPTY_FILTERS, 1, DEFAULT_CONTAINER_OWNER_SORT);
  }

  function updateTextFilter(field: "containerOwnerCode" | "legalCompanyName", value: string) {
    setAutocompleteInputs((current) => ({ ...current, [field]: value }));
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  function updateRegionInput(value: string) {
    setAutocompleteInputs((current) => ({ ...current, regionQuery: value }));
    setDraftFilters((current) => ({
      ...current,
      regionQuery: value,
      selectedRegionId: "",
    }));
  }

  function selectRegion(option: { value: string; label: string } | null) {
    setAutocompleteInputs((current) => ({
      ...current,
      regionQuery: option?.label ?? "",
    }));
    setDraftFilters((current) => ({
      ...current,
      regionQuery: option?.label ?? "",
      selectedRegionId: option?.value ?? "",
    }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <StandardListPageHeader
            title="Container Owners"
            description="Maintain container-owner master data, bank details, settlement terms, and attachments."
            actions={
              <>
                <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button asChild>
                  <Link href="/partners/container-owners/new">
                    <Plus className="size-4" />
                    New Container Owner
                  </Link>
                </Button>
              </>
            }
          />

          <StandardSearchToolbar
            onSubmit={handleSearchSubmit}
            primaryActions={
              <>
                <Button type="submit" disabled={loading}>
                  <Search className="size-4" />
                  Search
                </Button>
                <Button type="button" variant="outline" onClick={resetFilters} disabled={loading}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </>
            }
          >
            <AutocompleteFilterInput
              label="Container Owner Code"
              placeholder="Search owner code"
              options={filterOptions.containerOwnerCodes}
              value={draftFilters.containerOwnerCode}
              inputValue={autocompleteInputs.containerOwnerCode}
              onInputChange={(value) => updateTextFilter("containerOwnerCode", value)}
              onSelect={(option) => updateTextFilter("containerOwnerCode", option?.label ?? "")}
              onClear={() => updateTextFilter("containerOwnerCode", "")}
            />
            <AutocompleteFilterInput
              label="Legal Company Name"
              placeholder="Search company name"
              options={filterOptions.legalCompanyNames}
              value={draftFilters.legalCompanyName}
              inputValue={autocompleteInputs.legalCompanyName}
              onInputChange={(value) => updateTextFilter("legalCompanyName", value)}
              onSelect={(option) => updateTextFilter("legalCompanyName", option?.label ?? "")}
              onClear={() => updateTextFilter("legalCompanyName", "")}
            />
            <AutocompleteFilterInput
              label="Region"
              placeholder="Search region code or name"
              options={filterOptions.regions}
              value={draftFilters.selectedRegionId}
              inputValue={autocompleteInputs.regionQuery}
              onInputChange={updateRegionInput}
              onSelect={selectRegion}
              onClear={() => updateRegionInput("")}
            />
          </StandardSearchToolbar>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key} className={column.widthClass}>
                      <SortButton
                        label={column.label}
                        sortKey={column.sortKey!}
                        activeSortBy={sort.sortBy}
                        activeDirection={sort.sortDirection}
                        onToggle={toggleSort}
                      />
                    </TableHead>
                  ))}
                  <TableHead className={`${ACTIONS_STICKY_HEAD_CLASS} min-w-[140px]`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-28 text-center text-sm text-muted-foreground">
                      {loading ? "Loading container owners..." : "No container owners found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">{owner.container_owner_code}</TableCell>
                      <TableCell>{owner.legal_company_name}</TableCell>
                      <TableCell>{owner.company_name ?? "-"}</TableCell>
                      <TableCell>{owner.primary_contact_person ?? "-"}</TableCell>
                      <TableCell>{owner.contact_email ?? "-"}</TableCell>
                      <TableCell>{owner.contact_tel ?? "-"}</TableCell>
                      <TableCell>{owner.region?.region_code ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(owner.status)}>{owner.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {owner.settlement_current_prepaid_balance == null
                          ? "-"
                          : owner.settlement_current_prepaid_balance.toLocaleString()}
                      </TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/partners/container-owners/${owner.id}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </Button>
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/partners/container-owners/${owner.id}/edit`}>
                              <Pencil className="size-4" />
                              Edit
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <StandardTablePagination
            summary={`Showing ${start}-${end} of ${result.totalCount} container owners`}
            page={page}
            totalPages={totalPages}
            previousDisabled={page <= 1 || loading}
            nextDisabled={page >= totalPages || loading}
            onPrevious={() => void refresh(appliedFilters, page - 1)}
            onNext={() => void refresh(appliedFilters, page + 1)}
          />
        </div>
      </div>
    </div>
  );
}
