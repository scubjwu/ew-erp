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
  exportMaterialVendors,
  getMaterialVendors,
  type MaterialVendorAutocompleteOption,
  type MaterialVendorFilterOptions,
  type MaterialVendorPageResult,
} from "@/app/partners/material-vendors/actions";
import {
  DEFAULT_MATERIAL_VENDOR_SORT,
  type MaterialVendorSortBy,
  type MaterialVendorSortDirection,
} from "@/app/partners/material-vendors/query-helpers";
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
import {
  MATERIAL_CATEGORY_OPTIONS,
  type MaterialVendor,
} from "@/types/material-vendor";

type Props = {
  initial: MaterialVendorPageResult;
  pageSize: number;
  filterOptions: MaterialVendorFilterOptions;
};

type SearchFilters = MaterialVendorPageResult["filters"];

type AutocompleteInputState = {
  vendorCode: string;
  legalCompanyName: string;
};

const EMPTY_FILTERS: SearchFilters = {
  vendorCode: "",
  legalCompanyName: "",
  materialCategory: "",
  isDefaultVendor: "",
};

const SORTABLE_COLUMNS: Array<SortableColumnConfig<MaterialVendorSortBy>> = [
  { key: "vendorCode", label: "Vendor Code", sortable: true, sortKey: "vendorCode", widthClass: "min-w-[150px]" },
  { key: "legalCompanyName", label: "Legal Company Name", sortable: true, sortKey: "legalCompanyName", widthClass: "min-w-[220px]" },
  { key: "companyName", label: "Company Name (Other Language)", sortable: true, sortKey: "companyName", widthClass: "min-w-[220px]" },
  { key: "primaryContactPerson", label: "Primary Contact Person", sortable: true, sortKey: "primaryContactPerson", widthClass: "min-w-[180px]" },
  { key: "materialCategory", label: "Material Category", sortable: true, sortKey: "materialCategory", widthClass: "min-w-[150px]" },
  { key: "email", label: "Email", sortable: true, sortKey: "email", widthClass: "min-w-[220px]" },
  { key: "tel", label: "Tel", sortable: true, sortKey: "tel", widthClass: "min-w-[140px]" },
  { key: "defaultVendor", label: "Default Vendor", sortable: true, sortKey: "defaultVendor", widthClass: "min-w-[130px]", align: "center" },
  { key: "status", label: "Status", sortable: true, sortKey: "status", widthClass: "min-w-[120px]" },
  { key: "currentPrepaidBalance", label: "Current Prepaid Balance", sortable: true, sortKey: "currentPrepaidBalance", widthClass: "min-w-[170px]", align: "right" },
];

function statusVariant(status: MaterialVendor["status"]) {
  if (status === "Normal") return "default" as const;
  if (status === "Blocked") return "secondary" as const;
  return "outline" as const;
}

function alignClass(align?: "left" | "center" | "right") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "";
}

function buildAutocompleteInputState(filters: SearchFilters): AutocompleteInputState {
  return {
    vendorCode: filters.vendorCode,
    legalCompanyName: filters.legalCompanyName,
  };
}

function downloadCsv(filename: string, rows: MaterialVendor[]) {
  const columns = [
    "Vendor Code",
    "Legal Company Name",
    "Company Name (Other Language)",
    "Primary Contact Person",
    "Material Category",
    "Email",
    "Tel",
    "Default Vendor",
    "Status",
    "PIC",
    "Address",
    "Country",
    "Bank Account Name",
    "Bank Account Number",
    "Bank Name",
    "Bank Code",
    "Bank Address",
    "SWIFT Code",
    "Settlement Payment Term",
    "Settlement Calculation Method",
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
        row.vendor_code,
        row.legal_company_name,
        row.company_name,
        row.primary_contact_person,
        row.material_category,
        row.contact_email,
        row.contact_tel,
        row.is_default_vendor ? "Yes" : "No",
        row.status,
        row.pic_user?.full_name ?? "",
        row.address,
        row.country,
        row.bank_account_name,
        row.bank_account_number,
        row.bank_name,
        row.bank_code,
        row.bank_address,
        row.swift_code,
        row.settlement_payment_term,
        row.settlement_calculation_method,
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
  sortKey: MaterialVendorSortBy;
  activeSortBy: MaterialVendorSortBy;
  activeDirection: MaterialVendorSortDirection;
  onToggle: (key: MaterialVendorSortBy) => void;
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

export function MaterialVendorsDashboard({ initial, pageSize, filterOptions }: Props) {
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
      const next = await getMaterialVendors({
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
        title: "Could not load material vendors",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportMaterialVendors({
        ...appliedFilters,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`material-vendors-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export material vendors",
        description: getErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  }

  function toggleSort(key: MaterialVendorSortBy) {
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
    void refresh(EMPTY_FILTERS, 1, DEFAULT_MATERIAL_VENDOR_SORT);
  }

  function updateTextFilter(field: "vendorCode" | "legalCompanyName", value: string) {
    setAutocompleteInputs((current) => ({ ...current, [field]: value }));
    setDraftFilters((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <StandardListPageHeader
            title="Material Vendors"
            description="Maintain material vendor master data, financial terms, and attachments."
            actions={
              <>
                <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button asChild>
                  <Link href="/partners/material-vendors/new">
                    <Plus className="size-4" />
                    New Material Vendor
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
              label="Vendor Code"
              placeholder="Search vendor code"
              options={filterOptions.vendorCodes}
              value={draftFilters.vendorCode}
              inputValue={autocompleteInputs.vendorCode}
              onInputChange={(value) => updateTextFilter("vendorCode", value)}
              onSelect={(option) => updateTextFilter("vendorCode", option?.label ?? "")}
              onClear={() => updateTextFilter("vendorCode", "")}
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
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Material Category</div>
              <Select
                value={draftFilters.materialCategory || "all"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    materialCategory: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {MATERIAL_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Default Vendor</div>
              <Select
                value={draftFilters.isDefaultVendor || "all"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    isDefaultVendor: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </StandardSearchToolbar>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key} className={[column.widthClass, alignClass(column.align)].filter(Boolean).join(" ")}>
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
                      {loading ? "Loading material vendors..." : "No material vendors found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                      <TableCell>{vendor.legal_company_name}</TableCell>
                      <TableCell>{vendor.company_name ?? "-"}</TableCell>
                      <TableCell>{vendor.primary_contact_person ?? "-"}</TableCell>
                      <TableCell>{vendor.material_category}</TableCell>
                      <TableCell>{vendor.contact_email ?? "-"}</TableCell>
                      <TableCell>{vendor.contact_tel ?? "-"}</TableCell>
                      <TableCell className="text-center">{vendor.is_default_vendor ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(vendor.status)}>{vendor.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {vendor.settlement_current_prepaid_balance == null
                          ? "-"
                          : vendor.settlement_current_prepaid_balance.toLocaleString()}
                      </TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/partners/material-vendors/${vendor.id}`}>
                              <Eye className="size-4" />
                              View
                            </Link>
                          </Button>
                          <Button asChild variant="link" className="h-auto px-0">
                            <Link href={`/partners/material-vendors/${vendor.id}/edit`}>
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
            summary={`Showing ${start}-${end} of ${result.totalCount} material vendors`}
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
