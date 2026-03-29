"use client";

import { Info, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getCustomers, type CustomersPageResult } from "@/app/customers/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import type { CustomerStatus } from "@/types/customer";

const SEARCH_DEBOUNCE_MS = 300;

/** Fixed locale avoids SSR/client hydration mismatches (undefined uses Node vs browser defaults). */
function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function StatusBadge({ status }: { status: string }) {
  const s = status as CustomerStatus;
  if (s === "Blacklisted") {
    return (
      <Badge variant="destructive" className="font-semibold uppercase tracking-wide">
        Blacklisted
      </Badge>
    );
  }
  if (s === "Prepayment") {
    return <Badge variant="secondary">Prepayment</Badge>;
  }
  if (s === "Normal") {
    return <Badge variant="outline">Normal</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

type CustomersDashboardProps = {
  initial: CustomersPageResult;
  pageSize: number;
};

export function CustomersDashboard({ initial, pageSize }: CustomersDashboardProps) {
  const router = useRouter();
  const [result, setResult] = useState<CustomersPageResult>(initial);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const skipNextFetch = useRef(true);
  const skipFirstSearchPageReset = useRef(true);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (skipFirstSearchPageReset.current) {
      skipFirstSearchPageReset.current = false;
      return;
    }
    setPage(1);
  }, [debouncedQ]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getCustomers({
        q: debouncedQ,
        page,
        pageSize,
      });
      setResult(next);
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Could not load customers",
        description: getErrorMessage(e),
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page, pageSize]);

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
  }, [result.totalCount, pageSize]);

  const rangeLabel = useMemo(() => {
    if (result.totalCount === 0) return "0 results";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, result.totalCount);
    return `${start}–${end} of ${result.totalCount}`;
  }, [page, pageSize, result.totalCount]);

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    if (result.rows.length === 1) {
      router.push(`/customers/${result.rows[0].id}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="border-b border-border bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Customer CRM
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Simple company search or advanced <code className="text-xs">key:value</code>{" "}
              filters (AND) — {rangeLabel}
            </p>
          </div>
          <Button
            asChild
            className="gap-2 shadow-sm transition-transform active:scale-[0.98]"
          >
            <Link
              href="/customers/new"
              className="inline-flex items-center gap-2"
            >
              <Plus className="size-4" />
              New Customer
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-6 py-6">
        <div className="max-w-xl space-y-2">
          <div className="flex items-start gap-1 sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by company, ID, or use id:C8A2F3; status:Normal; …"
                className="h-11 pl-9 pr-4 transition-shadow focus-visible:ring-offset-2"
                aria-label="Search customers"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Search tips"
                >
                  <Info className="size-4" aria-hidden />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-[min(22rem,calc(100vw-2rem))] space-y-3 p-4 text-sm shadow-md"
              >
                <div>
                  <h2 className="text-sm font-semibold leading-none tracking-tight text-foreground">
                    Search Tips
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Type normally to search by{" "}
                    <span className="font-medium text-foreground">company name</span>{" "}
                    (fuzzy match). For customer ID, use{" "}
                    <span className="font-mono text-[11px] text-foreground/90">
                      id:…
                    </span>{" "}
                    in advanced syntax. Use a colon to switch to advanced filters.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Advanced keys</p>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-muted-foreground">
                    id, company, status, sales, phone, grade
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Separate conditions with semicolons:{" "}
                    <span className="font-mono text-[11px] text-foreground/90">
                      key:value;
                    </span>{" "}
                    (all conditions apply together).
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Examples</p>
                  <div className="mt-2 space-y-1.5">
                    <pre className="whitespace-pre-wrap break-all rounded-md border border-border/60 bg-muted/50 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-foreground">
                      id:C8A2F3;
                    </pre>
                    <pre className="whitespace-pre-wrap break-all rounded-md border border-border/60 bg-muted/50 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-foreground">
                      id:C12345; status:Normal;
                    </pre>
                    <pre className="whitespace-pre-wrap break-all rounded-md border border-border/60 bg-muted/50 px-2.5 py-1.5 font-mono text-[11px] leading-snug text-foreground">
                      sales:Shiyun; status:Blacklisted;
                    </pre>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          {searchInput.trim() && result.rows.length === 1 && !loading && (
            <p className="text-xs text-muted-foreground">
              Press Enter to go to the only match on this page.
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Company</TableHead>
                <TableHead className="w-14">Grade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Credit limit</TableHead>
                <TableHead>Assigned sales</TableHead>
                <TableHead>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <span className="text-sm text-muted-foreground">
                      Loading…
                    </span>
                  </TableCell>
                </TableRow>
              ) : result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <span className="text-sm text-muted-foreground">
                      {result.totalCount === 0
                        ? "No customers match this search."
                        : "No rows on this page."}
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => router.push(`/customers/${row.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/customers/${row.id}`);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      {row.company_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.customer_grade ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.status === "Prepayment"
                        ? formatMoney(0)
                        : formatMoney(Number(row.credit_limit))}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-muted-foreground">
                      {row.assigned_sales ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.contact_phone ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="min-w-[5rem] text-center text-sm tabular-nums text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
