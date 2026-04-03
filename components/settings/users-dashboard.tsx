"use client";

import { Download, Eye, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  exportUsers,
  getUsers,
  type UserManagementPageResult,
} from "@/app/settings/users/actions";
import { Badge } from "@/components/ui/badge";
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
import type { SystemUser } from "@/types/system-user";

type Props = {
  initial: UserManagementPageResult;
  pageSize: number;
  roleOptions: string[];
  statusOptions: string[];
};

type SearchFilters = UserManagementPageResult["filters"];

function statusVariant(status: SystemUser["status"]) {
  return status === "Active" ? "default" : "secondary";
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

  const escape = (value: string | null | undefined) =>
    `"${(value ?? "").replace(/"/g, '""')}"`;

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
}: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState(initial.filters);
  const [appliedFilters, setAppliedFilters] = useState(initial.filters);
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
      const next = await getUsers({ ...nextFilters, page: nextPage, pageSize });
      setResult(next);
      setAppliedFilters(next.filters);
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
      const rows = await exportUsers(appliedFilters);
      downloadCsv(
        `user-management-${new Date().toISOString().slice(0, 10)}.csv`,
        rows
      );
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold tracking-tight">User Management</h1>
              <p className="text-sm text-muted-foreground">
                Maintain user master data, access roles, employment details, and status.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
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
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px_220px_auto]">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">User Code</div>
              <Input
                value={draftFilters.userCode}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    userCode: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh(draftFilters, 1);
                }}
                placeholder="Search user code"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-sm font-medium">Full Name</div>
              <Input
                value={draftFilters.fullName}
                onChange={(event) =>
                  setDraftFilters((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refresh(draftFilters, 1);
                }}
                placeholder="Search full name"
              />
            </div>

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

            <div className="flex items-end justify-end gap-2">
              <Button onClick={() => void refresh(draftFilters, 1)} disabled={loading}>
                <Search className="size-4" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const empty = {
                    userCode: "",
                    fullName: "",
                    role: "",
                    status: "",
                  };
                  setDraftFilters(empty);
                  void refresh(empty, 1);
                }}
                disabled={loading}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Code</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
                    <TableCell>
                      <div className="flex items-center gap-3">
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

          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <div>
              Showing {start}-{end} of {result.totalCount} users
            </div>
            <div className="flex items-center gap-3">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={() => void refresh(appliedFilters, page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || page >= totalPages}
                  onClick={() => void refresh(appliedFilters, page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
