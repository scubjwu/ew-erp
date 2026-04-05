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
  exportUsers,
  getUsers,
  type UserAutocompleteOption,
  type UserFilterOptions,
  type UserManagementPageResult,
} from "@/app/settings/users/actions";
import {
  DEFAULT_USER_MANAGEMENT_SORT,
  type UserManagementSortBy,
  type UserManagementSortDirection,
} from "@/app/settings/users/query-helpers";
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
import type { SystemUser } from "@/types/system-user";

type Props = {
  initial: UserManagementPageResult;
  pageSize: number;
  roleOptions: string[];
  statusOptions: string[];
  filterOptions: UserFilterOptions;
};

type SearchFilters = UserManagementPageResult["filters"];

type AutocompleteInputState = {
  userCode: string;
  fullName: string;
};

const EMPTY_FILTERS: SearchFilters = {
  userCode: "",
  fullName: "",
  role: "",
  status: "",
};

const SORTABLE_COLUMNS: Array<SortableColumnConfig<UserManagementSortBy>> = [
  { key: "userCode", label: "User Code", sortable: true, sortKey: "userCode", widthClass: "min-w-[140px]" },
  { key: "fullName", label: "Full Name", sortable: true, sortKey: "fullName", widthClass: "min-w-[220px]" },
  { key: "email", label: "Email", sortable: true, sortKey: "email", widthClass: "min-w-[240px]" },
  { key: "role", label: "Role", sortable: true, sortKey: "role", widthClass: "min-w-[140px]" },
  { key: "status", label: "Status", sortable: true, sortKey: "status", widthClass: "min-w-[140px]" },
];

function statusVariant(status: SystemUser["status"]) {
  return status === "Active" ? "default" : "secondary";
}

function SortButton({
  label,
  sortKey,
  activeSortBy,
  activeDirection,
  onToggle,
}: {
  label: string;
  sortKey: UserManagementSortBy;
  activeSortBy: UserManagementSortBy;
  activeDirection: UserManagementSortDirection;
  onToggle: (key: UserManagementSortBy) => void;
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

function buildAutocompleteInputState(filters: SearchFilters): AutocompleteInputState {
  return {
    userCode: filters.userCode,
    fullName: filters.fullName,
  };
}

function downloadCsv(filename: string, rows: SystemUser[]) {
  const columns = [
    "User Code",
    "Full Name",
    "Email",
    "Role",
    "Status",
    "Phone",
    "Department",
    "Job Title",
    "Last Login At",
    "Created At",
    "Updated At",
    "Remarks",
  ];

  const escape = (value: string | null | undefined) => `"${(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.join(","),
    ...rows.map((row) =>
      [
        row.user_code,
        row.full_name,
        row.email,
        row.role,
        row.status,
        row.phone,
        row.department,
        row.job_title,
        row.last_login_at,
        row.created_at,
        row.updated_at,
        row.remarks,
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

export function UsersDashboard({
  initial,
  pageSize,
  roleOptions,
  statusOptions,
  filterOptions,
}: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState(initial.filters);
  const [autocompleteInputs, setAutocompleteInputs] = useState<AutocompleteInputState>(() =>
    buildAutocompleteInputState(initial.filters)
  );
  const [appliedFilters, setAppliedFilters] = useState(initial.filters);
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
      const next = await getUsers({
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
        title: "Could not load users",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await exportUsers({
        ...appliedFilters,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      downloadCsv(`user-management-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not export users",
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
    void refresh(EMPTY_FILTERS, 1, DEFAULT_USER_MANAGEMENT_SORT);
  }

  function toggleSort(key: UserManagementSortBy) {
    const nextSort = {
      sortBy: key,
      sortDirection: sort.sortBy === key && sort.sortDirection === "asc" ? "desc" : "asc",
    } as const;
    void refresh(appliedFilters, 1, nextSort);
  }

  function onAutocompleteInputChange(key: keyof AutocompleteInputState, value: string) {
    setAutocompleteInputs((current) => ({ ...current, [key]: value }));
    if (key === "userCode") {
      setDraftFilters((current) => ({ ...current, userCode: value }));
      return;
    }
    setDraftFilters((current) => ({ ...current, fullName: value }));
  }

  function onAutocompleteSelect(
    key: keyof AutocompleteInputState,
    option: UserAutocompleteOption | null
  ) {
    const nextValue = option?.value ?? "";
    setAutocompleteInputs((current) => ({ ...current, [key]: nextValue }));
    if (key === "userCode") {
      setDraftFilters((current) => ({ ...current, userCode: nextValue }));
      return;
    }
    setDraftFilters((current) => ({ ...current, fullName: nextValue }));
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <StandardListPageHeader
            title="User Management"
            description={`Maintain user master data, access roles, employment details, and status. Showing ${start}-${end} of ${result.totalCount}.`}
            actions={
              <>
                <Button variant="outline" onClick={() => void handleExport()} disabled={exporting}>
                  <Download className="size-4" />
                  Export CSV
                </Button>
                <Button asChild>
                  <Link href="/settings/users/new">
                    <Plus className="size-4" />
                    New User
                  </Link>
                </Button>
              </>
            }
          />

          <StandardSearchToolbar
            onSubmit={handleSearchSubmit}
            fieldsClassName="md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px]"
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
              label="User Code"
              placeholder="Search user code"
              options={filterOptions.userCodes}
              value={draftFilters.userCode}
              inputValue={autocompleteInputs.userCode}
              onInputChange={(value) => onAutocompleteInputChange("userCode", value)}
              onSelect={(option) => onAutocompleteSelect("userCode", option)}
              onClear={() => onAutocompleteSelect("userCode", null)}
            />

            <AutocompleteFilterInput
              label="Full Name"
              placeholder="Search full name"
              options={filterOptions.fullNames}
              value={draftFilters.fullName}
              inputValue={autocompleteInputs.fullName}
              onInputChange={(value) => onAutocompleteInputChange("fullName", value)}
              onSelect={(option) => onAutocompleteSelect("fullName", option)}
              onClear={() => onAutocompleteSelect("fullName", null)}
            />

            <div className="space-y-1.5">
              <div className="text-sm font-medium">Role</div>
              <Select
                value={draftFilters.role || "__all__"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    role: value === "__all__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All roles</SelectItem>
                  {roleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-medium">Status</div>
              <Select
                value={draftFilters.status || "__all__"}
                onValueChange={(value) =>
                  setDraftFilters((current) => ({
                    ...current,
                    status: value === "__all__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {statusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </StandardSearchToolbar>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  {SORTABLE_COLUMNS.map((column) => (
                    <TableHead key={column.key} className={column.widthClass}>
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
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-32 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={SORTABLE_COLUMNS.length + 1} className="h-32 text-center text-muted-foreground">
                      No users found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.user_code}</TableCell>
                      <TableCell>{row.full_name ?? ""}</TableCell>
                      <TableCell>{row.email ?? ""}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className={ACTIONS_STICKY_CELL_CLASS}>
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/settings/users/${row.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Eye className="size-4" />
                            View
                          </Link>
                          <Link
                            href={`/settings/users/${row.id}/edit`}
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
            summary={`Showing ${start}-${end} of ${result.totalCount} users`}
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
