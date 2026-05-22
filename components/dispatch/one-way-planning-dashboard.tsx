"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, MoreHorizontal, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
  cancelOneWayPlan,
  getOneWayPlanManagement,
} from "@/app/dispatch/one-way-planning/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardListPageHeader } from "@/components/shared/page-standard/standard-list-page-header";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import type {
  OneWayPlanFilterOptions,
  OneWayPlanManagementQuery,
  OneWayPlanManagementResult,
  OneWayPlanManagementRow,
} from "@/types/one-way-planning";
import { ONE_WAY_PLAN_STATUSES } from "@/types/one-way-planning";

type Props = {
  initial: OneWayPlanManagementResult;
  filterOptions: OneWayPlanFilterOptions;
};

type AutocompleteInputState = {
  region: string;
  lesseeId: string;
  depotId: string;
  polCityId: string;
  sizeType: string;
  color: string;
};

function findOptionByValue(
  options: OneWayPlanFilterOptions[keyof OneWayPlanFilterOptions],
  value: string
) {
  return options.find((option) => option.value === value) ?? null;
}

function buildAutocompleteInputState(
  filters: OneWayPlanManagementQuery,
  options: OneWayPlanFilterOptions
): AutocompleteInputState {
  return {
    region: findOptionByValue(options.regions, filters.region)?.label ?? "",
    lesseeId: findOptionByValue(options.lessees, filters.lesseeId)?.label ?? "",
    depotId: findOptionByValue(options.depots, filters.depotId)?.label ?? "",
    polCityId: findOptionByValue(options.polCities, filters.polCityId)?.label ?? "",
    sizeType: findOptionByValue(options.sizeTypes, filters.sizeType)?.label ?? "",
    color: findOptionByValue(options.colors, filters.color)?.label ?? "",
  };
}

function appliedFilterSummary(filters: OneWayPlanManagementQuery, options: OneWayPlanFilterOptions) {
  const parts: string[] = [];

  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);

  const lessee = findOptionByValue(options.lessees, filters.lesseeId);
  if (lessee?.label) parts.push(`Lessee: ${lessee.label}`);

  if (filters.shipperRequestId) {
    parts.push(`Lessee Request ID: ${filters.shipperRequestId}`);
  }

  const depot = findOptionByValue(options.depots, filters.depotId);
  if (depot?.label) parts.push(`Depot: ${depot.label}`);

  const pol = findOptionByValue(options.polCities, filters.polCityId);
  if (pol?.label) parts.push(`POL: ${pol.label}`);

  if (filters.podContains) parts.push(`POD contains: ${filters.podContains}`);

  const sizeType = findOptionByValue(options.sizeTypes, filters.sizeType);
  if (sizeType?.label) parts.push(`Size/Type: ${sizeType.label}`);

  const condition = findOptionByValue(options.conditions, filters.conditionId);
  if (condition?.label) parts.push(`Condition: ${condition.label}`);

  const color = findOptionByValue(options.colors, filters.color);
  if (color?.label) parts.push(`Color: ${color.label}`);

  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);

  if (filters.onhireNo) parts.push(`Onhire No: ${filters.onhireNo}`);
  if (filters.applyDateFrom) parts.push(`Apply Date From: ${filters.applyDateFrom}`);
  if (filters.applyDateTo) parts.push(`Apply Date To: ${filters.applyDateTo}`);
  if (filters.availabilityDateFrom) {
    parts.push(`Availability Date From: ${filters.availabilityDateFrom}`);
  }
  if (filters.availabilityDateTo) {
    parts.push(`Availability Date To: ${filters.availabilityDateTo}`);
  }

  return parts.join(" | ");
}

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function buildCreateReleaseHref(row: OneWayPlanManagementRow) {
  const params = new URLSearchParams({
    oneWayPlanId: row.id,
    bucketId: row.bucketId,
    region: row.region === "-" ? "" : row.region,
    city: row.polCode === "-" ? "" : row.polCode,
    depot: row.depotCode === "-" ? "" : row.depotCode,
    sizeType: row.sizeType === "-" ? "" : row.sizeType,
    condition: row.condition === "-" ? "" : row.condition,
    color: row.color === "-" ? "" : row.color,
    machineType: row.machineType === "-" ? "" : row.machineType,
  });
  return `/dispatch/dispatch-release/create?${params.toString()}`;
}

function statusVariant(status: OneWayPlanManagementRow["status"]) {
  switch (status) {
    case "APPROVED":
      return "default" as const;
    case "HOLD":
      return "secondary" as const;
    case "REJECTED":
    case "CANCELLED":
      return "destructive" as const;
    case "COMPLETED":
      return "outline" as const;
    case "SUBMITTED":
    default:
      return "outline" as const;
  }
}

export function OneWayPlanningDashboard({ initial, filterOptions }: Props) {
  const [result, setResult] = useState(initial);
  const [draftFilters, setDraftFilters] = useState(initial.filters);
  const [autocompleteInputs, setAutocompleteInputs] = useState(
    buildAutocompleteInputState(initial.filters, filterOptions)
  );
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  const activeFilterSummary = useMemo(
    () => appliedFilterSummary(result.filters, filterOptions),
    [filterOptions, result.filters]
  );

  async function runSearch(next: OneWayPlanManagementQuery) {
    setLoading(true);
    try {
      const data = await getOneWayPlanManagement(next);
      setResult(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load one way plans",
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
    const next: OneWayPlanManagementQuery = {
      ...draftFilters,
      region: "",
      status: "",
      lesseeId: "",
      shipperRequestId: "",
      depotId: "",
      polCityId: "",
      podContains: "",
      sizeType: "",
      conditionId: "",
      color: "",
      machineType: "",
      onhireNo: "",
      applyDateFrom: "",
      applyDateTo: "",
      availabilityDateFrom: "",
      availabilityDateTo: "",
      page: 1,
    };

    setDraftFilters(next);
    setAutocompleteInputs({
      region: "",
      lesseeId: "",
      depotId: "",
      polCityId: "",
      sizeType: "",
      color: "",
    });
    await runSearch(next);
    setFiltersCollapsed(false);
  }

  async function handlePageChange(nextPage: number) {
    const next = { ...draftFilters, page: nextPage };
    setDraftFilters(next);
    await runSearch(next);
  }

  async function handleCancelPlan(row: OneWayPlanManagementRow) {
    if (
      !window.confirm(
        `Cancel one way plan ${row.planId}? This will remove its quantity from Planned Dispatch Qty.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const cancelled = await cancelOneWayPlan(row.id);
      toast({
        title: "One way plan cancelled",
        description: `${cancelled.planId} is now CANCELLED.`,
      });
      await runSearch(result.filters);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not cancel one way plan",
        description: getErrorMessage(error),
      });
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      <StandardListPageHeader
        title="One Way Planning"
        description="Review one way planning records before detail, edit, import, and release workflows are completed."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dispatch/one-way-planning/import">Import CMA Report</Link>
            </Button>
            <Button asChild>
              <Link href="/dispatch/one-way-planning/new">New Plan</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{result.summary.totalPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{result.summary.approvedPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Hold Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{result.summary.onHoldPlans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Shortfall Qty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{result.summary.totalShortfallQty}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg">Search Filters</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setFiltersCollapsed((current) => !current)}
            >
              {filtersCollapsed ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronUp className="mr-1 h-4 w-4" />}
              {filtersCollapsed ? "Expand" : "Collapse"}
            </Button>
          </div>
          {activeFilterSummary ? (
            <p className="text-sm text-muted-foreground">{activeFilterSummary}</p>
          ) : null}
        </CardHeader>
        {!filtersCollapsed ? (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SearchableAutocompleteInput
                label="Region"
                placeholder="Search region"
                options={filterOptions.regions}
                value={draftFilters.region}
                inputValue={autocompleteInputs.region}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, region: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, region: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, region: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, region: "" }));
                  setAutocompleteInputs((current) => ({ ...current, region: "" }));
                }}
              />

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Status</div>
                <Select
                  value={draftFilters.status || "__ALL__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      status: value === "__ALL__" ? "" : (value as OneWayPlanManagementQuery["status"]),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All statuses</SelectItem>
                    {ONE_WAY_PLAN_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SearchableAutocompleteInput
                label="Lessee"
                placeholder="Search lessee"
                options={filterOptions.lessees}
                value={draftFilters.lesseeId}
                inputValue={autocompleteInputs.lesseeId}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, lesseeId: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, lesseeId: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, lesseeId: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, lesseeId: "" }));
                  setAutocompleteInputs((current) => ({ ...current, lesseeId: "" }));
                }}
              />

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Lessee Request ID</div>
                <Input
                  value={draftFilters.shipperRequestId}
                  placeholder="Search lessee request ID"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      shipperRequestId: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SearchableAutocompleteInput
                label="POL"
                placeholder="Search POL"
                options={filterOptions.polCities}
                value={draftFilters.polCityId}
                inputValue={autocompleteInputs.polCityId}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, polCityId: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, polCityId: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, polCityId: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, polCityId: "" }));
                  setAutocompleteInputs((current) => ({ ...current, polCityId: "" }));
                }}
              />

              <SearchableAutocompleteInput
                label="Depot"
                placeholder="Search depot code or depot name"
                options={filterOptions.depots}
                value={draftFilters.depotId}
                inputValue={autocompleteInputs.depotId}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, depotId: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, depotId: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, depotId: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, depotId: "" }));
                  setAutocompleteInputs((current) => ({ ...current, depotId: "" }));
                }}
              />

              <div className="space-y-1.5">
                <div className="text-sm font-medium">POD contains</div>
                <Input
                  value={draftFilters.podContains}
                  placeholder="Search POD text"
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      podContains: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Onhire No</div>
                <Input
                  value={draftFilters.onhireNo}
                  placeholder="Search onhire number"
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, onhireNo: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SearchableAutocompleteInput
                label="Size/Type"
                placeholder="Search size/type"
                options={filterOptions.sizeTypes}
                value={draftFilters.sizeType}
                inputValue={autocompleteInputs.sizeType}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, sizeType: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, sizeType: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, sizeType: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, sizeType: "" }));
                  setAutocompleteInputs((current) => ({ ...current, sizeType: "" }));
                }}
              />

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Condition</div>
                <Select
                  value={draftFilters.conditionId || "__ALL__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      conditionId: value === "__ALL__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All conditions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All conditions</SelectItem>
                    {filterOptions.conditions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <SearchableAutocompleteInput
                label="Color"
                placeholder="Search color"
                options={filterOptions.colors}
                value={draftFilters.color}
                inputValue={autocompleteInputs.color}
                onInputChange={(value) =>
                  setAutocompleteInputs((current) => ({ ...current, color: value }))
                }
                onSelect={(option) => {
                  setDraftFilters((current) => ({ ...current, color: option?.value ?? "" }));
                  setAutocompleteInputs((current) => ({ ...current, color: option?.label ?? "" }));
                }}
                onClear={() => {
                  setDraftFilters((current) => ({ ...current, color: "" }));
                  setAutocompleteInputs((current) => ({ ...current, color: "" }));
                }}
              />

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Machine Type</div>
                <Select
                  value={draftFilters.machineType || "__ALL__"}
                  onValueChange={(value) =>
                    setDraftFilters((current) => ({
                      ...current,
                      machineType: value === "__ALL__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All machine types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All machine types</SelectItem>
                    {filterOptions.machineTypes.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <div className="text-sm font-medium">Apply Date From</div>
                <Input
                  type="date"
                  value={draftFilters.applyDateFrom}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      applyDateFrom: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Apply Date To</div>
                <Input
                  type="date"
                  value={draftFilters.applyDateTo}
                  onChange={(event) =>
                    setDraftFilters((current) => ({ ...current, applyDateTo: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Availability Date From</div>
                <Input
                  type="date"
                  value={draftFilters.availabilityDateFrom}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      availabilityDateFrom: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <div className="text-sm font-medium">Availability Date To</div>
                <Input
                  type="date"
                  value={draftFilters.availabilityDateTo}
                  onChange={(event) =>
                    setDraftFilters((current) => ({
                      ...current,
                      availabilityDateTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
              <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">One Way Planning Records</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[120px]">Plan ID</TableHead>
                <TableHead className="min-w-[110px]">Status</TableHead>
                <TableHead className="min-w-[150px]">Lessee Request ID</TableHead>
                <TableHead className="min-w-[120px]">Apply Date</TableHead>
                <TableHead className="min-w-[140px]">Availability Date</TableHead>
                <TableHead className="min-w-[180px]">Lessee</TableHead>
                <TableHead className="min-w-[120px]">Depot</TableHead>
                <TableHead className="min-w-[100px]">POL</TableHead>
                <TableHead className="min-w-[180px]">POD</TableHead>
                <TableHead className="min-w-[110px]">Size/Type</TableHead>
                <TableHead className="min-w-[110px]">Condition</TableHead>
                <TableHead className="min-w-[110px]">Color</TableHead>
                <TableHead className="min-w-[78px] text-right">Quantity</TableHead>
                <TableHead className="min-w-[72px] text-right">Auth</TableHead>
                <TableHead className="min-w-[72px] text-right">Rem</TableHead>
                <TableHead className="min-w-[72px] text-right">PU</TableHead>
                <TableHead className="min-w-[78px] text-right">NPU</TableHead>
                <TableHead className="min-w-[100px] text-right">Shortfall</TableHead>
                <TableHead className="min-w-[140px]">Onhire No</TableHead>
                <TableHead className="sticky right-0 z-10 min-w-[220px] bg-background text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={20} className="h-24 text-center text-sm text-muted-foreground">
                    No one way plans found for the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                result.rows.map((row) => (
                  <TableRow key={row.id}>
                    {(() => {
                      const canCreateRelease =
                        row.conversionStatus === "OPEN" &&
                        (row.status === "SUBMITTED" || row.status === "APPROVED") &&
                        row.depotCode !== "-";
                      const canCancel =
                        row.conversionStatus === "OPEN" &&
                        row.status !== "CANCELLED" &&
                        row.status !== "COMPLETED";
                      const createReleaseHref = buildCreateReleaseHref(row);
                      return (
                        <>
                    <TableCell>{displayValue(row.planId)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                    </TableCell>
                    <TableCell>{displayValue(row.shipperRequestId)}</TableCell>
                    <TableCell>{displayValue(row.applyDate)}</TableCell>
                    <TableCell>{displayValue(row.availabilityDate)}</TableCell>
                    <TableCell>{displayValue(row.lesseeLabel)}</TableCell>
                    <TableCell>{displayValue(row.depotCode)}</TableCell>
                    <TableCell>{displayValue(row.polCode)}</TableCell>
                    <TableCell>{displayValue(row.pod)}</TableCell>
                    <TableCell>{displayValue(row.sizeType)}</TableCell>
                    <TableCell>{displayValue(row.condition)}</TableCell>
                    <TableCell>{displayValue(row.color)}</TableCell>
                    <TableCell className="text-right">{row.quantity}</TableCell>
                    <TableCell className="text-right">{row.authorizedQty}</TableCell>
                    <TableCell className="text-right">{row.remainingQty}</TableCell>
                    <TableCell className="text-right">{row.pickedUpQty}</TableCell>
                    <TableCell className="text-right">{row.nonPickedUpQty}</TableCell>
                    <TableCell className="text-right">{row.shortfall}</TableCell>
                    <TableCell>{displayValue(row.onhireNo)}</TableCell>
                    <TableCell className="sticky right-0 z-10 bg-background text-right">
                      <div className="flex justify-end gap-2">
                        {canCreateRelease ? (
                          <Button asChild type="button" variant="outline" size="sm">
                            <Link href={createReleaseHref}>Create Release</Link>
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            title={
                              row.depotCode === "-"
                                ? "Assign a depot before creating a release."
                                : "Only open submitted or approved plans can create a release."
                            }
                          >
                            Create Release
                          </Button>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-1">
                              <MoreHorizontal className="h-4 w-4" />
                              More
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="end"
                            className="w-32 p-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <div className="flex flex-col gap-1">
                              <Button asChild variant="ghost" size="sm" className="justify-start">
                                <Link href={`/dispatch/one-way-planning/${row.id}`}>View</Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="justify-start">
                                <Link href={`/dispatch/one-way-planning/${row.id}/edit`}>Edit</Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="justify-start"
                                disabled={!canCancel || loading}
                                onClick={() => void handleCancelPlan(row)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>
                        </>
                      );
                    })()}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <StandardTablePagination
          page={result.page}
          totalPages={totalPages}
          summary={`${result.totalCount} total`}
          previousDisabled={loading || result.page <= 1}
          nextDisabled={loading || result.page >= totalPages}
          onPrevious={() => void handlePageChange(result.page - 1)}
          onNext={() => void handlePageChange(result.page + 1)}
        />
      </Card>
    </div>
  );
}
