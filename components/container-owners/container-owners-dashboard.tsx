"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  exportContainerOwners,
  getContainerOwners,
  type ContainerOwnerPageResult,
  type ContainerOwnerRegionOption,
} from "@/app/partners/container-owners/actions";
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
import type { ContainerOwner } from "@/types/container-owner";

type Props = {
  initial: ContainerOwnerPageResult;
  pageSize: number;
  regionOptions: ContainerOwnerRegionOption[];
};

type SearchFilters = ContainerOwnerPageResult["filters"];

const EMPTY_FILTERS: SearchFilters = {
  containerOwnerCode: "",
  legalCompanyName: "",
  regionId: "",
};

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

  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

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

export function ContainerOwnersDashboard({
  initial,
  pageSize,
  regionOptions,
}: Props) {
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
      const next = await getContainerOwners({
        ...nextFilters,
        page: nextPage,
        pageSize,
      });
      setResult(next);
      setAppliedFilters(next.filters);
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
      const rows = await exportContainerOwners(appliedFilters);
      downloadCsv(
        `container-owners-${new Date().toISOString().slice(0, 10)}.csv`,
        rows
      );
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Container Owners</h1>
              <p className="text-sm text-muted-foreground">
                Maintain container-owner master data, bank details, settlement terms, and attachments.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
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
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Container Owner Code</div>
              <Input
                value={draftFilters.containerOwnerCode}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    containerOwnerCode: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh(draftFilters, 1);
                }}
                placeholder="Search owner code"
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
              <div className="text-sm font-medium">Region</div>
              <Select
                value={draftFilters.regionId || "all"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    regionId: value === "all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.region_code}
                    </SelectItem>
                  ))}
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
                  <TableHead>Container Owner Code</TableHead>
                  <TableHead>Legal Company Name</TableHead>
                  <TableHead>Primary Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tel</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">
                      {loading
                        ? "Loading container owners..."
                        : "No container owners found for the current filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((owner) => (
                    <TableRow key={owner.id}>
                      <TableCell className="font-medium">{owner.container_owner_code}</TableCell>
                      <TableCell>{owner.legal_company_name}</TableCell>
                      <TableCell>{owner.primary_contact_person ?? "-"}</TableCell>
                      <TableCell>{owner.contact_email ?? "-"}</TableCell>
                      <TableCell>{owner.contact_tel ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
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

          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="text-muted-foreground">
              Showing {start}-{end} of {result.totalCount} container owners
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
