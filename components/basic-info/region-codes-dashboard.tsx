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
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import {
  exportRegionCodes,
  getRegionCodes,
  type RegionFilterOptions,
  type RegionCodesPageResult,
} from "@/app/basic-info/regions/actions";
import {
  DEFAULT_REGION_SORT,
  type RegionSortBy,
  type RegionSortDirection,
} from "@/app/basic-info/regions/query-helpers";
import { RegionCodeFormDialog } from "@/components/basic-info/region-code-form-dialog";
import { RegionCodeViewDialog } from "@/components/basic-info/region-code-view-dialog";
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
import type { RegionCode } from "@/types/region-code";

type RegionCodesDashboardProps = {
  initial: RegionCodesPageResult;
  pageSize: number;
  filterOptions: RegionFilterOptions;
};

const SORTABLE_COLUMNS: Array<SortableColumnConfig<RegionSortBy>> = [
  { key: "regionCode", label: "Region Code", sortable: true, sortKey: "regionCode", widthClass: "min-w-[180px]" },
  { key: "regionName", label: "Region Name", sortable: true, sortKey: "regionName", widthClass: "min-w-[220px]" },
  { key: "status", label: "Status", sortable: true, sortKey: "status", widthClass: "min-w-[120px]" },
  { key: "createdBy", label: "Created By", sortable: true, sortKey: "createdBy", widthClass: "min-w-[160px]" },
  { key: "createdAt", label: "Created At", sortable: true, sortKey: "createdAt", widthClass: "min-w-[180px]" },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadCsv(filename: string, rows: RegionCode[]) {
  const columns = ["Region Code", "Region Name", "Status", "Created By", "Created At"];
  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [row.region_code, row.region_name, row.status, row.created_by, row.created_at]
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
  sortKey: RegionSortBy;
  activeSortBy: RegionSortBy;
  activeDirection: RegionSortDirection;
  onToggle: (key: RegionSortBy) => void;
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

export function RegionCodesDashboard({
  initial,
  pageSize,
  filterOptions,
}: RegionCodesDashboardProps) {
  const [result, setResult] = useState(initial);
  const [draftQuery, setDraftQuery] = useState(initial.filters.q);
  const [appliedQuery, setAppliedQuery] = useState(initial.filters.q);
  const [sort, setSort] = useState(initial.sort);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<RegionCode | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeRegion, setActiveRegion] = useState<RegionCode | null>(null);

  const page = result.page;
  const totalPages = useMemo(() => {
    if (result.totalCount <= 0) return 1;
    return Math.max(1, Math.ceil(result.totalCount / pageSize));
  }, [pageSize, result.totalCount]);
  const start = result.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, result.totalCount);

  async function refresh(nextQuery: string, nextPage = 1, nextSort = sort) {
    setLoading(true);
    try {
      const next = await getRegionCodes({
        q: nextQuery,
        sortBy: nextSort.sortBy,
        sortDirection: nextSort.sortDirection,
        page: nextPage,
        pageSize,
      });
      setResult(next);
      setAppliedQuery(next.filters.q);
      setSort(next.sort);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load regions",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function refreshCurrentPage() {
    await refresh(appliedQuery, page, sort);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportRegionCodes({
        q: appliedQuery,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`region-codes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export regions",
        description: getErrorMessage(error),
      });
    } finally {
      setExporting(false);
    }
  }

  function handleSearchSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    void refresh(draftQuery.trim(), 1, sort);
  }

  function handleReset() {
    setDraftQuery("");
    void refresh("", 1, DEFAULT_REGION_SORT);
  }

  function toggleSort(key: RegionSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection: sort.sortBy === key && sort.sortDirection === "asc" ? "desc" : "asc",
    } as const;
    void refresh(appliedQuery, 1, nextSort);
  }

  function openCreateDialog() {
    setEditingRegion(null);
    setDialogOpen(true);
  }

  function openEditDialog(region: RegionCode) {
    setEditingRegion(region);
    setDialogOpen(true);
  }

  function openViewDialog(region: RegionCode) {
    setActiveRegion(region);
    setViewDialogOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <StandardListPageHeader
            title="Region Codes"
            description={`Maintain region master data. Showing ${start}-${end} of ${result.totalCount}.`}
            actions={
              <>
                <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="size-4" />
                  New Region
                </Button>
              </>
            }
          />

          <StandardSearchToolbar
            onSubmit={handleSearchSubmit}
            fieldsClassName="md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)]"
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
              label="Region"
              placeholder="Search region code or name"
              options={filterOptions.regions}
              value={draftQuery}
              inputValue={draftQuery}
              onInputChange={setDraftQuery}
              onSelect={(option) => setDraftQuery(option?.value ?? "")}
              onClear={() => setDraftQuery("")}
            />
          </StandardSearchToolbar>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/20 hover:bg-muted/20">
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
                  <TableHead className={ACTIONS_STICKY_HEAD_CLASS}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-24 text-center text-muted-foreground">
                      Loading regions...
                    </TableCell>
                  </TableRow>
                ) : result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-24 text-center text-muted-foreground">
                      No region records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.region_code}</TableCell>
                      <TableCell>{row.region_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "ACTIVE" ? "outline" : "secondary"}
                          className="px-2 py-0 text-[11px]"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[11px]">{row.created_by ?? "-"}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(row.created_at)}</TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex justify-end gap-3 text-sm">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                            onClick={() => openViewDialog(row)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDialog(row)}
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <Pencil className="size-4" />
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

        <StandardTablePagination
          summary={`Showing ${start}-${end} of ${result.totalCount} regions`}
          page={page}
          totalPages={totalPages}
          previousDisabled={page <= 1 || loading}
          nextDisabled={page >= totalPages || loading}
          onPrevious={() => void refresh(appliedQuery, Math.max(1, page - 1), sort)}
          onNext={() => void refresh(appliedQuery, Math.min(totalPages, page + 1), sort)}
        />

        <RegionCodeFormDialog
          open={dialogOpen}
          mode={editingRegion ? "edit" : "create"}
          region={editingRegion}
          onOpenChange={setDialogOpen}
          onSaved={refreshCurrentPage}
        />
        <RegionCodeViewDialog
          open={viewDialogOpen}
          row={activeRegion}
          onOpenChange={(open) => {
            setViewDialogOpen(open);
            if (!open) setActiveRegion(null);
          }}
        />
      </div>
    </div>
  );
}
