"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  exportMaterialVendors,
  getMaterialVendors,
  type MaterialVendorPageResult,
} from "@/app/partners/material-vendors/actions";
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
import {
  MATERIAL_CATEGORY_OPTIONS,
  type MaterialVendor,
} from "@/types/material-vendor";

type Props = {
  initial: MaterialVendorPageResult;
  pageSize: number;
};

type SearchFilters = MaterialVendorPageResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  vendorCode: "",
  legalCompanyName: "",
  materialCategory: "",
  isDefaultVendor: "",
};

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

  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

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
        row.settlement_advance_payment_percentage == null
          ? ""
          : String(row.settlement_advance_payment_percentage),
        row.settlement_balance_trigger_event,
        row.settlement_currency,
        row.settlement_prepayment_pool == null
          ? ""
          : row.settlement_prepayment_pool
            ? "Enabled"
            : "Disabled",
        row.settlement_prepayment_threshold == null
          ? ""
          : String(row.settlement_prepayment_threshold),
        row.settlement_current_prepaid_balance == null
          ? ""
          : String(row.settlement_current_prepaid_balance),
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

export function MaterialVendorsDashboard({ initial, pageSize }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>(initial.filters);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const page = result.page;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(result.totalCount / pageSize)),
    [pageSize, result.totalCount]
  );
  const start = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, result.totalCount);

  async function refresh(nextFilters: SearchFilters, nextPage = 1) {
    setLoading(true);
    try {
      const next = await getMaterialVendors({
        ...nextFilters,
        page: nextPage,
        pageSize,
      });
      setResult(next);
      setAppliedFilters(next.filters);
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
      const rows = await exportMaterialVendors(appliedFilters);
      downloadCsv(
        `material-vendors-${new Date().toISOString().slice(0, 10)}.csv`,
        rows
      );
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Material Vendors</h1>
              <p className="text-sm text-muted-foreground">
                Maintain material vendor master data, financial terms, and attachments.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
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
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Vendor Code</div>
              <Input
                value={draftFilters.vendorCode}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, vendorCode: event.target.value }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh(draftFilters, 1);
                }}
                placeholder="Search vendor code"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-medium">Legal Company Name</div>
              <Input
                value={draftFilters.legalCompanyName}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    legalCompanyName: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh(draftFilters, 1);
                }}
                placeholder="Search company name"
              />
            </div>

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

            <div className="flex items-end justify-start gap-2 xl:justify-end">
              <Button onClick={() => void refresh(draftFilters, 1)} disabled={loading}>
                <Search className="size-4" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDraftFilters(EMPTY_FILTERS);
                  void refresh(EMPTY_FILTERS, 1);
                }}
                disabled={loading}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead>Vendor Code</TableHead>
                  <TableHead>Legal Company Name</TableHead>
                  <TableHead>Primary Contact Person</TableHead>
                  <TableHead>Material Category</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tel</TableHead>
                  <TableHead>Default Vendor</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-sm text-muted-foreground">
                      {loading
                        ? "Loading material vendors..."
                        : "No material vendors found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.vendor_code}</TableCell>
                      <TableCell>{vendor.legal_company_name}</TableCell>
                      <TableCell>{vendor.primary_contact_person ?? "-"}</TableCell>
                      <TableCell>{vendor.material_category}</TableCell>
                      <TableCell>{vendor.contact_email ?? "-"}</TableCell>
                      <TableCell>{vendor.contact_tel ?? "-"}</TableCell>
                      <TableCell>{vendor.is_default_vendor ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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

          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-muted-foreground">
              Showing {start}-{end} of {result.totalCount} material vendors
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => void refresh(appliedFilters, page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => void refresh(appliedFilters, page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
