"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, MoreHorizontal, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  cancelDispatchRelease,
  getDispatchReleaseManagement,
  holdDispatchRelease,
  resumeDispatchRelease,
} from "@/app/dispatch/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardListPageHeader } from "@/components/shared/page-standard/standard-list-page-header";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import type { DepotInventoryFilterOptions } from "@/types/depot-inventory";
import type {
  DispatchReleaseManagementQuery,
  DispatchReleaseManagementResult,
  DispatchReleaseManagementRow,
} from "@/types/dispatch-release";

type Props = {
  initial: DispatchReleaseManagementResult;
  filterOptions: DepotInventoryFilterOptions;
};

const PAGE_SIZE = 20;

const EMPTY_QUERY: DispatchReleaseManagementQuery = {
  releaseNumber: "",
  status: "",
  pol: "",
  pod: "",
  lessee: "",
  onhireNumber: "",
  vendorReleaseNumber: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  containerNumber: "",
  page: 1,
  pageSize: PAGE_SIZE,
  sortBy: "releaseNumber",
  sortDirection: "desc",
};

function appliedFilterSummary(filters: DispatchReleaseManagementQuery) {
  const parts: string[] = [];
  if (filters.releaseNumber) parts.push(`Release Number: ${filters.releaseNumber}`);
  if (filters.status) parts.push(`Release Status: ${filters.status}`);
  if (filters.pol) parts.push(`POL: ${filters.pol}`);
  if (filters.pod) parts.push(`POD: ${filters.pod}`);
  if (filters.lessee) parts.push(`Lessee: ${filters.lessee}`);
  if (filters.onhireNumber) parts.push(`Onhire Number: ${filters.onhireNumber}`);
  if (filters.vendorReleaseNumber) {
    parts.push(`Vendor Release Number: ${filters.vendorReleaseNumber}`);
  }
  if (filters.sizeType) parts.push(`Size/Type: ${filters.sizeType}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  if (filters.color) parts.push(`Color: ${filters.color}`);
  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);
  if (filters.containerNumber) parts.push(`Container Number: ${filters.containerNumber}`);
  return parts.join(" | ");
}

function statusVariant(status: string) {
  switch (status) {
    case "On hold":
      return "secondary" as const;
    case "Completed":
      return "outline" as const;
    case "Cancelled":
      return "destructive" as const;
    default:
      return "default" as const;
  }
}

function formatDisplayValue(value: string) {
  return value && value !== "-" ? value : "-";
}

export function DispatchReleaseManagementDashboard({
  initial,
  filterOptions,
}: Props) {
  const router = useRouter();
  const [result, setResult] = useState<DispatchReleaseManagementResult>(initial);
  const [draftFilters, setDraftFilters] = useState<DispatchReleaseManagementQuery>(initial.filters);
  const [autocompleteInputs, setAutocompleteInputs] = useState({
    sizeType: initial.filters.sizeType,
    color: initial.filters.color,
    machineType: initial.filters.machineType,
  });
  const [loading, setLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [holdTarget, setHoldTarget] = useState<DispatchReleaseManagementRow | null>(null);
  const [holdReason, setHoldReason] = useState("");
  const [cancelTarget, setCancelTarget] = useState<DispatchReleaseManagementRow | null>(null);
  const [cancelMode, setCancelMode] = useState<"FULL" | "PARTIAL">("FULL");
  const [cancelQty, setCancelQty] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const showingStart = result.totalCount === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const showingEnd = result.totalCount === 0 ? 0 : Math.min(result.totalCount, result.page * result.pageSize);
  const activeFilterSummary = useMemo(
    () => appliedFilterSummary(result.filters),
    [result.filters]
  );

  async function runSearch(next: DispatchReleaseManagementQuery) {
    setLoading(true);
    try {
      const data = await getDispatchReleaseManagement(next);
      setResult(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load dispatch releases",
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    const next = { ...draftFilters, page: 1 };
    setDraftFilters(next);
    await runSearch(next);
    setFiltersCollapsed(true);
  }

  async function handleReset() {
    const next = { ...EMPTY_QUERY, pageSize: draftFilters.pageSize };
    setDraftFilters(next);
    setAutocompleteInputs({
      sizeType: "",
      color: "",
      machineType: "",
    });
    await runSearch(next);
    setFiltersCollapsed(false);
  }

  async function handlePageChange(nextPage: number) {
    const next = { ...draftFilters, page: nextPage };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handlePageSizeChange(nextPageSize: number) {
    const next = { ...draftFilters, page: 1, pageSize: nextPageSize };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handleStatusAction(row: DispatchReleaseManagementRow) {
    setActionOrderId(row.id);
    try {
      if (row.rawStatus === "ON_HOLD") {
        await resumeDispatchRelease(row.id);
        toast({ title: `${row.releaseNumber} resumed` });
      } else {
        await holdDispatchRelease({
          transferOrderId: row.id,
          holdReason,
        });
        toast({ title: `${row.releaseNumber} placed on hold` });
      }
      await runSearch(draftFilters);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not update dispatch release status",
        description: getErrorMessage(error),
      });
    } finally {
      setActionOrderId(null);
    }
  }

  async function submitHold() {
    if (!holdTarget) return;
    if (!holdReason.trim()) {
      toast({
        variant: "destructive",
        title: "Hold reason required",
        description: "Please enter the reason for putting this release on hold.",
      });
      return;
    }
    await handleStatusAction(holdTarget);
    setHoldTarget(null);
    setHoldReason("");
  }

  async function submitCancel() {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      toast({
        variant: "destructive",
        title: "Cancel reason required",
        description: "Please enter the reason for cancelling this release.",
      });
      return;
    }

    const maxCancelableQty = cancelTarget.npu;
    const parsedCancelQty =
      cancelMode === "FULL" ? maxCancelableQty : Number.parseInt(cancelQty, 10);

    if (cancelMode === "PARTIAL") {
      if (!Number.isFinite(parsedCancelQty) || parsedCancelQty <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid cancel quantity",
          description: "Please enter a valid partial cancel quantity.",
        });
        return;
      }
      if (parsedCancelQty > maxCancelableQty) {
        toast({
          variant: "destructive",
          title: "Cancel quantity too large",
          description: `Cancel quantity cannot exceed ${maxCancelableQty}.`,
        });
        return;
      }
    }

    setActionOrderId(cancelTarget.id);
    try {
      await cancelDispatchRelease({
        transferOrderId: cancelTarget.id,
        cancelQty: cancelMode === "FULL" ? null : parsedCancelQty,
        cancelReason,
      });
      toast({
        title:
          cancelMode === "FULL"
            ? `${cancelTarget.releaseNumber} cancelled`
            : `${cancelTarget.releaseNumber} partially cancelled`,
      });
      await runSearch(draftFilters);
      setCancelTarget(null);
      setCancelMode("FULL");
      setCancelQty("");
      setCancelReason("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel dispatch release",
        description: getErrorMessage(error),
      });
    } finally {
      setActionOrderId(null);
    }
  }

  function updateAutocompleteInput(field: "sizeType" | "color" | "machineType", value: string) {
    setAutocompleteInputs((current) => ({ ...current, [field]: value }));
  }

  function selectAutocompleteOption(
    field: "sizeType" | "color" | "machineType",
    option: { value: string; label: string } | null
  ) {
    setDraftFilters((current) => ({
      ...current,
      [field]: option?.value ?? "",
    }));
    setAutocompleteInputs((current) => ({
      ...current,
      [field]: option?.label ?? "",
    }));
  }

  function clearAutocompleteField(field: "sizeType" | "color" | "machineType") {
    setDraftFilters((current) => ({ ...current, [field]: "" }));
    setAutocompleteInputs((current) => ({ ...current, [field]: "" }));
  }

  return (
    <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4 px-4 pb-6 pt-4 md:px-6 md:pt-6">
      <StandardListPageHeader
        title="Dispatch Release Management"
        actions={
          <Button onClick={() => router.push("/depot-inventory/summary-for-dispatch")}>
            Create Dispatch Release
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">Search Filters</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {filtersCollapsed && activeFilterSummary ? (
                <div className="max-w-[640px] truncate text-xs text-muted-foreground">
                  {activeFilterSummary}
                </div>
              ) : null}
              <Button variant="outline" onClick={handleReset} disabled={loading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                onClick={() => setFiltersCollapsed((value) => !value)}
              >
                {filtersCollapsed ? (
                  <>
                    Show <ChevronDown className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Hide <ChevronUp className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {!filtersCollapsed ? (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Release Number</label>
                <Input
                  value={draftFilters.releaseNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      releaseNumber: event.target.value,
                    }))
                  }
                  placeholder="Search release number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Release Status</label>
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
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Statuses</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="On hold">On hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">POL</label>
                <Input
                  value={draftFilters.pol}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, pol: event.target.value }))
                  }
                  placeholder="Search POL"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">POD</label>
                <Input
                  value={draftFilters.pod}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, pod: event.target.value }))
                  }
                  placeholder="Search POD"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Lessee</label>
                <Input
                  value={draftFilters.lessee}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, lessee: event.target.value }))
                  }
                  placeholder="Search lessee"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Onhire Number</label>
                <Input
                  value={draftFilters.onhireNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      onhireNumber: event.target.value,
                    }))
                  }
                  placeholder="Search onhire number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vendor Release Number</label>
                <Input
                  value={draftFilters.vendorReleaseNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      vendorReleaseNumber: event.target.value,
                    }))
                  }
                  placeholder="Search vendor release number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Container Number</label>
                <Input
                  value={draftFilters.containerNumber}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      containerNumber: event.target.value,
                    }))
                  }
                  placeholder="Search container number"
                />
              </div>
              <div className="space-y-2">
                <SearchableAutocompleteInput
                  label="Size/Type"
                  options={filterOptions.sizeTypes}
                  value={draftFilters.sizeType}
                  inputValue={autocompleteInputs.sizeType}
                  onInputChange={(value) => updateAutocompleteInput("sizeType", value)}
                  onSelect={(option) => selectAutocompleteOption("sizeType", option)}
                  onClear={() => clearAutocompleteField("sizeType")}
                  placeholder="Search size/type"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Condition</label>
                <Select
                  value={draftFilters.condition || "__all__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      condition: value === "__all__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Conditions</SelectItem>
                    {filterOptions.conditionCodes.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <SearchableAutocompleteInput
                  label="Color"
                  options={filterOptions.colors}
                  value={draftFilters.color}
                  inputValue={autocompleteInputs.color}
                  onInputChange={(value) => updateAutocompleteInput("color", value)}
                  onSelect={(option) => selectAutocompleteOption("color", option)}
                  onClear={() => clearAutocompleteField("color")}
                  placeholder="Search color"
                />
              </div>
              <div className="space-y-2">
                <SearchableAutocompleteInput
                  label="Machine Type"
                  options={filterOptions.machineTypes}
                  value={draftFilters.machineType}
                  inputValue={autocompleteInputs.machineType}
                  onInputChange={(value) => updateAutocompleteInput("machineType", value)}
                  onSelect={(option) => selectAutocompleteOption("machineType", option)}
                  onClear={() => clearAutocompleteField("machineType")}
                  placeholder="Search machine type"
                />
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Release</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {result.summary.totalRelease.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arranged Quantity</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {result.summary.arrangedQuantity.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">PU</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {result.summary.pu.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">NPU</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {result.summary.npu.toLocaleString("en-US")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On Hold Quantity</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {result.summary.onHoldQuantity.toLocaleString("en-US")}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dispatch Release Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Release Number</TableHead>
                  <TableHead>POL</TableHead>
                  <TableHead>POD</TableHead>
                  <TableHead>Lessee</TableHead>
                  <TableHead>Onhire Number</TableHead>
                  <TableHead>Size/Type</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Machine Type</TableHead>
                  <TableHead>Vendor Release Number</TableHead>
                  <TableHead className="text-right">Total Quantity</TableHead>
                  <TableHead className="text-right">PU</TableHead>
                  <TableHead className="text-right">NPU</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={15}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      No dispatch releases found for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  result.rows.map((row) => {
                    const canHold =
                      row.rawStatus === "CREATED" || row.rawStatus === "IN_TRANSIT";
                    const canResume = row.rawStatus === "ON_HOLD";
                    const canCancel =
                      row.rawStatus === "CREATED" ||
                      row.rawStatus === "IN_TRANSIT" ||
                      row.rawStatus === "ON_HOLD";

                    return (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dispatch/dispatch-release/${row.id}`)}
                      >
                        <TableCell className="font-medium">{row.releaseNumber}</TableCell>
                        <TableCell>{formatDisplayValue(row.pol)}</TableCell>
                        <TableCell>{formatDisplayValue(row.pod)}</TableCell>
                        <TableCell>{formatDisplayValue(row.lessee)}</TableCell>
                        <TableCell>{formatDisplayValue(row.onhireNumber)}</TableCell>
                        <TableCell>{formatDisplayValue(row.sizeType)}</TableCell>
                        <TableCell>{formatDisplayValue(row.condition)}</TableCell>
                        <TableCell>{formatDisplayValue(row.color)}</TableCell>
                        <TableCell>{formatDisplayValue(row.machineType)}</TableCell>
                        <TableCell>{formatDisplayValue(row.vendorReleaseNumber)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.totalQuantity.toLocaleString("en-US")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.pu.toLocaleString("en-US")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.npu.toLocaleString("en-US")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                        </TableCell>
                        <TableCell className="w-[140px] text-right">
                          <div
                            className="flex justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/dispatch/dispatch-release/${row.id}`)
                              }
                            >
                              View
                            </Button>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  disabled={Boolean(actionOrderId)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  More
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="end"
                                className="w-40 p-2"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <div className="flex flex-col gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => router.push(`/dispatch/dispatch-release/${row.id}/edit`)}
                                  >
                                    Edit
                                  </Button>
                                  {canHold || canResume ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start"
                                      disabled={Boolean(actionOrderId)}
                                      onClick={() => {
                                        if (canResume) {
                                          void handleStatusAction(row);
                                          return;
                                        }
                                        setHoldTarget(row);
                                        setHoldReason("");
                                      }}
                                    >
                                      {actionOrderId === row.id
                                        ? "Saving..."
                                        : canResume
                                        ? "Resume"
                                        : "Hold"}
                                    </Button>
                                  ) : null}
                                  {canCancel ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="justify-start text-destructive hover:text-destructive"
                                      disabled={Boolean(actionOrderId) || row.npu <= 0}
                                      onClick={() => {
                                        setCancelTarget(row);
                                        setCancelMode("FULL");
                                        setCancelQty(String(row.npu));
                                        setCancelReason("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  ) : null}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <StandardTablePagination
            leadingContent={
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Page Size</span>
                <Select
                  value={String(result.pageSize)}
                  onValueChange={(value) => handlePageSizeChange(Number(value))}
                >
                  <SelectTrigger className="h-9 w-[96px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[20, 50, 100].map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
            summary={`${showingStart}-${showingEnd} of ${result.totalCount} releases`}
            page={result.page}
            totalPages={totalPages}
            onPrevious={() => handlePageChange(Math.max(1, result.page - 1))}
            onNext={() => handlePageChange(Math.min(totalPages, result.page + 1))}
            previousDisabled={loading || result.page <= 1}
            nextDisabled={loading || result.page >= totalPages}
          />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(holdTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setHoldTarget(null);
            setHoldReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Hold Dispatch Release</DialogTitle>
            <DialogDescription>
              Enter the hold reason for {holdTarget?.releaseNumber ?? "this release"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Hold Reason</label>
            <Textarea
              value={holdReason}
              onChange={(event) => setHoldReason(event.target.value)}
              rows={4}
              placeholder="Enter hold reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHoldTarget(null);
                setHoldReason("");
              }}
            >
              Close
            </Button>
            <Button
              onClick={() => void submitHold()}
              disabled={!holdTarget || Boolean(actionOrderId)}
            >
              Confirm Hold
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelMode("FULL");
            setCancelQty("");
            setCancelReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cancel Dispatch Release</DialogTitle>
            <DialogDescription>
              Cancel all or part of {cancelTarget?.releaseNumber ?? "this release"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cancel Mode</label>
                <Select
                  value={cancelMode}
                  onValueChange={(value) => setCancelMode(value as "FULL" | "PARTIAL")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full Cancel</SelectItem>
                    <SelectItem value="PARTIAL">Partial Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Cancellable Qty</label>
                <Input value={String(cancelTarget?.npu ?? 0)} readOnly />
              </div>
            </div>
            {cancelMode === "PARTIAL" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cancel Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, cancelTarget?.npu ?? 1)}
                  value={cancelQty}
                  onChange={(event) => setCancelQty(event.target.value)}
                  placeholder="Enter cancel quantity"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium">Cancel Reason</label>
              <Textarea
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                rows={4}
                placeholder="Enter cancel reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelMode("FULL");
                setCancelQty("");
                setCancelReason("");
              }}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitCancel()}
              disabled={!cancelTarget || Boolean(actionOrderId)}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
