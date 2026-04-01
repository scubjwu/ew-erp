"use client";

import { Download, Eye, Info, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { exportCustomers, getCustomers, type CustomersPageResult } from "@/app/customers/actions";
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

type CustomersDashboardProps = {
  initial: CustomersPageResult;
  pageSize: number;
};

function toCsvValue(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function CustomersDashboard({ initial, pageSize }: CustomersDashboardProps) {
  const [result, setResult] = useState<CustomersPageResult>(initial);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(initial.page);
  const [search, setSearch] = useState("");
  const skipNextFetch = useRef(true);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getCustomers({
        search,
        page,
        pageSize,
      });
      setResult(next);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not load customers",
        description: getErrorMessage(e),
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    void fetchPage();
  }, [fetchPage]);

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

  function runSearch() {
    setPage(1);
    void (async () => {
      setLoading(true);
      try {
        const next = await getCustomers({
          search,
          page: 1,
          pageSize,
        });
        setResult(next);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Could not load customers",
          description: getErrorMessage(e),
        });
      } finally {
        setLoading(false);
      }
    })();
  }

  function resetFilters() {
    setSearch("");
    setPage(1);
    void (async () => {
      setLoading(true);
      try {
        const refreshed = await getCustomers({
          search: "",
          page: 1,
          pageSize,
        });
        setResult(refreshed);
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Could not reset customer list",
          description: getErrorMessage(e),
        });
      } finally {
        setLoading(false);
      }
    })();
  }

  async function downloadCsv() {
    try {
      const rows = await exportCustomers(search);
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
      const lines = [
        headers.map(toCsvValue).join(","),
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
            String(row.credit_limit ?? ""),
            String(row.credit_term_days ?? ""),
            row.assigned_sales ?? "",
            row.status ?? "",
            row.notes ?? "",
            (row.certificate_links ?? []).map((item) => item.link_url).join("; "),
          ]
            .map((value) => toCsvValue(String(value)))
            .join(",")
        ),
      ];

      const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "customers.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Could not export customers",
        description: getErrorMessage(e),
      });
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-5 px-6 py-6">
      <div className="rounded-2xl border border-border bg-card px-7 py-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Maintain partner customer master data. {rangeLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={downloadCsv}>
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button asChild className="gap-2">
              <Link href="/partners/customers/new">
                <Plus className="size-4" />
                New Customer
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_max-content]">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Search Criteria</label>
              <button
                type="button"
                className="inline-flex size-5 items-center justify-center rounded-full border border-border text-muted-foreground"
                title="Default search matches legal company name. For advanced search use key:value, for example: customer id: CX3AO2"
              >
                <Info className="size-3.5" />
              </button>
            </div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company name, or use customer id: XXXXX"
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
            />
          </div>
          <div className="flex items-end justify-end">
            <div className="flex shrink-0 items-center justify-end gap-3">
              <Button className="h-10 min-w-fit gap-2 whitespace-nowrap px-5 text-sm" onClick={runSearch}>
                <Search className="size-4" />
                Search
              </Button>
              <Button
                className="h-10 min-w-fit gap-2 whitespace-nowrap px-5 text-sm"
                variant="outline"
                onClick={resetFilters}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="sticky left-0 z-20 bg-card">Customer ID</TableHead>
                <TableHead>Legal Company Name</TableHead>
                <TableHead>Company Name (Other Language)</TableHead>
                <TableHead>Customer Region</TableHead>
                <TableHead>Primary Contact Email</TableHead>
                <TableHead>Company Tel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                    No customer records found.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="sticky left-0 z-10 bg-card font-medium">
                      {row.customer_custom_id ?? "—"}
                    </TableCell>
                    <TableCell>{row.company_name}</TableCell>
                    <TableCell>{row.company_name_other_language ?? "—"}</TableCell>
                    <TableCell>{row.region?.region_code ?? "—"}</TableCell>
                    <TableCell>{row.purchasing_emails?.[0] ?? "—"}</TableCell>
                    <TableCell>{row.contact_phone ?? "—"}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-4">
                        <Link
                          href={`/partners/customers/${row.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="size-4" />
                          View
                        </Link>
                        <Link
                          href={`/partners/customers/${row.id}/edit`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
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
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
