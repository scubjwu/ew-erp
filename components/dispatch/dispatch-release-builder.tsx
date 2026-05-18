"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  RotateCcw,
  ArrowLeft,
  PackageCheck,
} from "lucide-react";

import {
  createDispatchRelease,
  getFinancialExchangeRatesForDate,
  getFinancialExchangeRatesForDates,
  getPurchaseOrderItemVendorReleaseDocuments,
  updateDispatchRelease,
} from "@/app/dispatch/actions";
import {
  getDepotDispatchSummary,
  getDispatchReleaseSelectableContainers,
  getNextDispatchReleaseNumber,
  getVendorReleaseSelectorRows,
} from "@/app/depot-inventory/actions";
import { SearchableAutocompleteInput } from "@/components/purchase/searchable-autocomplete-input";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
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
import { Label } from "@/components/ui/label";
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
import {
  FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS,
  type FinancialExchangeRateRow,
} from "@/types/dispatch-finance";
import type {
  DispatchReleaseSelectableContainerQuery,
  DispatchReleaseSelectableContainerRow,
  DepotDispatchSummaryQuery,
  DepotDispatchSummaryResult,
  DepotDispatchSummaryRow,
  DepotInventoryAutocompleteOption,
  DepotInventoryFilterOptions,
  VendorReleaseSelectorRow,
} from "@/types/depot-inventory";
import type {
  DispatchReleaseContainerSelectionMode as ContainerSelectionMode,
  DispatchReleaseDraft,
  DispatchReleaseEditInitialData,
  DispatchReleaseSourceOption as ReleaseSourceKind,
  DispatchReleaseSpecifiedSelectionMethod as SpecifiedSelectionMethod,
  DispatchReleaseVendorDocument,
} from "@/types/dispatch-release";
import type { OneWayPlanReleaseSourceDetail } from "@/types/one-way-planning";

type ResolvedContainerSelection = {
  actualRows: DispatchReleaseSelectableContainerRow[];
  actualNumbers: string[];
  duplicateNumbers: string[];
  invalidNumbers: string[];
  manualCandidateNumbers: string[];
  rangeError: string | null;
};

type ResolvedContainerDateRow = {
  row: DispatchReleaseSelectableContainerRow;
  pickupDate: string | null;
  locked: boolean;
};

type DispatchReleaseContext = {
  releaseSource: string;
  oneWayPlanId?: string;
  region: string;
  city: string;
  depot: string;
  sizeType: string;
  condition: string;
  color: string;
  machineType: string;
  sourcePurchaseOrderId: string;
  sourcePurchaseOrderItemId: string;
  vendorReleaseNumber: string;
};

type Props = {
  initialSummary: DepotDispatchSummaryResult;
  filterOptions: DepotInventoryFilterOptions;
  lesseeOptions: DepotInventoryAutocompleteOption[];
  initialContext: DispatchReleaseContext;
  preselectedBucket: DepotDispatchSummaryRow | null;
  sourcePlan?: OneWayPlanReleaseSourceDetail | null;
  mode?: "create" | "edit";
  editData?: DispatchReleaseEditInitialData | null;
};

const PAGE_SIZE = 20;
const DISPATCH_RELEASE_CURRENCY_OPTIONS = FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS;
const EMPTY_FILTERS: DepotDispatchSummaryQuery = {
  region: "",
  city: "",
  depot: "",
  owner: "",
  sizeType: "",
  condition: "",
  color: "",
  machineType: "",
  page: 1,
  pageSize: PAGE_SIZE,
};

const DEFAULT_DRAFT: DispatchReleaseDraft = {
  releaseNumber: "",
  dispatchPlanNo: "",
  carrierPlanNo: "",
  dispatchVendor: "",
  onhireNo: "",
  releaseDate: new Date().toISOString().slice(0, 10),
  pol: "",
  pod: "",
  carrier: "",
  pickupCharge: "0.00",
  dpp: "0.00",
  freeDays: "0",
  rv: "0.00",
  dailyRent: "0.00",
  headerCurrency: "USD",
  itemCostCurrency: "USD",
  truckingCost: "0.00",
  handlingFee: "0.00",
  releaseQty: 0,
  releaseMode: "SELF_PICKUP",
  dispatchArrangeDate: "",
  selfPickupDepot: "",
  containerSelectionMode: "UNSPECIFIED",
  specifiedSelectionMethod: "INVENTORY",
  manualContainerNumbers: "",
  rangeStart: "",
  rangeEnd: "",
  remarks: "",
};

function appliedFilterSummary(filters: DepotDispatchSummaryQuery) {
  const parts: string[] = [];
  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.city) parts.push(`City: ${filters.city}`);
  if (filters.depot) parts.push(`Depot: ${filters.depot}`);
  if (filters.owner) parts.push(`Owner: ${filters.owner}`);
  if (filters.sizeType) parts.push(`Size/Type: ${filters.sizeType}`);
  if (filters.condition) parts.push(`Condition: ${filters.condition}`);
  if (filters.color) parts.push(`Color: ${filters.color}`);
  if (filters.machineType) parts.push(`Machine Type: ${filters.machineType}`);
  return parts.join(" | ");
}

function displayValue(value: string | number | null | undefined) {
  if (value == null || value === "") return "-";
  return String(value);
}

function formatVendorReleaseLabel(row: VendorReleaseSelectorRow | null | undefined) {
  if (!row) return "-";
  return row.vendorReleaseNumber;
}

function formatLesseeDisplay(option: DepotInventoryAutocompleteOption | null | undefined) {
  if (!option) return "";
  const code = option.secondaryLabel?.trim() ?? "";
  const name = option.label?.trim() ?? "";
  if (code && name) return `${code} · ${name}`;
  return code || name;
}

function extractCityCodeFromLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "-") return "";
  const firstSegment = trimmed.split("·")[0]?.trim() ?? "";
  return (firstSegment || trimmed).split(/\s+/)[0]?.trim().toUpperCase() ?? "";
}

function buildPortCityOptions(options: DepotInventoryAutocompleteOption[]) {
  return options.map((option) => {
    const code = extractCityCodeFromLabel(option.value);
    const label = option.label || option.value;
    const name = label.includes("·") ? label.split("·").slice(1).join("·").trim() : "";
    return {
      value: code || option.value,
      label,
      searchText: `${code} ${name} ${option.searchText ?? ""}`.trim(),
      secondaryLabel: name || option.secondaryLabel,
    };
  });
}

function buildSourceLimit(
  bucket: DepotDispatchSummaryRow,
  releaseSource: ReleaseSourceKind | "",
  vendorSource: VendorReleaseSelectorRow | null
) {
  if (!bucket || !releaseSource) return 0;
  if (releaseSource === "INTERNAL_DEPOT") return bucket.availableDepotQty;
  if (releaseSource === "VENDOR_REF") return vendorSource?.remainingQty ?? bucket.pendingOfflineQty;
  return bucket.totalAvailableQty;
}

function buildSourceMixLabel(row: DepotDispatchSummaryRow) {
  if (row.hasFactoryOrder && row.hasNewOrUsedPurchase) return "Factory + New/Used";
  if (row.hasFactoryOrder) return "Factory Only";
  return "New/Used Only";
}

function parseManualCount(value: string) {
  return extractContainerNumbersFromSmartPaste(value).length;
}

function normalizeContainerNumber(value: string | null | undefined) {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeCurrencyValue(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "USD";
  return DISPATCH_RELEASE_CURRENCY_OPTIONS.includes(
    normalized as (typeof DISPATCH_RELEASE_CURRENCY_OPTIONS)[number]
  )
    ? normalized
    : "USD";
}

function resolveExchangeRateFromMap(
  exchangeRates: FinancialExchangeRateRow[],
  rateDate: string,
  fromCurrency: string,
  toCurrency: string
) {
  const normalizedFrom = normalizeCurrencyValue(fromCurrency);
  const normalizedTo = normalizeCurrencyValue(toCurrency);
  if (normalizedFrom === normalizedTo) return 1;
  const normalizedRateDate = rateDate.trim();
  if (!normalizedRateDate) return null;
  const matchedRate = exchangeRates.find(
    (row) =>
      row.fromCurrency === normalizedFrom &&
      row.toCurrency === normalizedTo &&
      row.rateDate <= normalizedRateDate
  );
  return matchedRate?.exchangeRate ?? null;
}

function extractContainerNumbersFromSmartPaste(value: string) {
  const regex = /\b[A-Z]{3}[UJZ][\s]*\d{6}(?:[\s-]*\d)\b/gi;
  const matches = value.match(regex);
  if (!matches?.length) return [];
  return Array.from(
    new Set(matches.map((item) => normalizeContainerNumber(item.replace(/[\s-]/g, ""))))
  );
}

function buildInitialContainerPickupDates(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined
) {
  const result: Record<string, string> = {};
  for (const row of selectedContainers ?? []) {
    const containerNumber = normalizeContainerNumber(row.containerNumber);
    const pickupDate = row.pickupDate?.trim() ?? "";
    if (containerNumber && pickupDate) {
      result[containerNumber] = pickupDate;
    }
  }
  return result;
}

function buildInitialContainerMoneyMap(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined,
  field: "truckingCost" | "repairCost" | "damageClaim"
) {
  const result: Record<string, string> = {};
  for (const row of selectedContainers ?? []) {
    const containerNumber = normalizeContainerNumber(row.containerNumber);
    if (!containerNumber) continue;
    const rawValue = row[field];
    result[containerNumber] =
      rawValue == null || rawValue === "" ? "0.00" : Number(rawValue).toFixed(2);
  }
  return result;
}

function buildInitialContainerRemarkMap(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined
) {
  const result: Record<string, string> = {};
  for (const row of selectedContainers ?? []) {
    const containerNumber = normalizeContainerNumber(row.containerNumber);
    if (!containerNumber) continue;
    result[containerNumber] = row.remark?.trim() ?? "";
  }
  return result;
}

function buildInitialContainerCurrencyMap(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined,
  field:
    | "truckingCostCurrency"
    | "repairCostCurrency"
    | "damageClaimCurrency"
) {
  const result: Record<string, string> = {};
  for (const row of selectedContainers ?? []) {
    const containerNumber = normalizeContainerNumber(row.containerNumber);
    if (!containerNumber) continue;
    result[containerNumber] = row[field]?.trim() || "USD";
  }
  return result;
}

function buildInitialCostContainerNumbers(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined
) {
  return Array.from(
    new Set(
      (selectedContainers ?? [])
        .filter((row) => {
          const trucking = Number(row.truckingCost ?? 0);
          const repair = Number(row.repairCost ?? 0);
          const recovery = Number(row.damageClaim ?? 0);
          const remark = row.remark?.trim() ?? "";
          return trucking !== 0 || repair !== 0 || recovery !== 0 || Boolean(remark);
        })
        .map((row) => normalizeContainerNumber(row.containerNumber))
        .filter(Boolean)
    )
  );
}

function buildInitialBatchPickupDate(
  selectedContainers: DispatchReleaseEditInitialData["selectedContainers"] | undefined
) {
  const dates = Array.from(
    new Set(
      (selectedContainers ?? [])
        .map((row) => row.pickupDate?.trim() ?? "")
        .filter(Boolean)
    )
  );
  return dates.length === 1 ? dates[0] : "";
}

function resolvePickupDateForContainer(
  containerNumber: string,
  batchPickupDate: string,
  containerPickupDates: Record<string, string>
) {
  const normalizedNumber = normalizeContainerNumber(containerNumber);
  const overrideValue = containerPickupDates[normalizedNumber]?.trim() ?? "";
  return overrideValue || batchPickupDate.trim() || "";
}

function resolveContainerFieldValue(
  containerNumber: string,
  valuesByContainer: Record<string, string>,
  fallback = ""
) {
  const normalizedNumber = normalizeContainerNumber(containerNumber);
  return valuesByContainer[normalizedNumber] ?? fallback;
}

function buildSelectableContainersQuery(
  bucket: DepotDispatchSummaryRow,
  releaseSource: ReleaseSourceKind,
  vendorSource: VendorReleaseSelectorRow | null,
  currentTransferOrderId?: string
): DispatchReleaseSelectableContainerQuery {
  return {
    region: bucket.region,
    city: bucket.city,
    depot: bucket.depot,
    sizeType: bucket.sizeType,
    condition: bucket.condition,
    color: bucket.color,
    machineType: bucket.machineType,
    releaseSource,
    sourcePurchaseOrderItemId:
      releaseSource === "VENDOR_REF" ? vendorSource?.purchaseOrderItemId ?? "" : "",
    currentTransferOrderId,
  };
}

function ZeroClearingInput(props: {
  value: string;
  onChange: (next: string) => void;
  zeroValue: string;
}) {
  const { value, onChange, zeroValue } = props;

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={(event) => {
        if (event.target.value === zeroValue) {
          onChange("");
        }
      }}
      onBlur={(event) => {
        if (event.target.value.trim() === "") {
          onChange(zeroValue);
        }
      }}
    />
  );
}

function resolveSpecifiedSelection(
  method: SpecifiedSelectionMethod,
  selectableContainers: DispatchReleaseSelectableContainerRow[],
  selectedInventoryRowIds: string[],
  manualContainerNumbers: string,
  rangeStart: string,
  rangeEnd: string,
  releaseSource: ReleaseSourceKind | "",
  vendorSource: VendorReleaseSelectorRow | null,
  activeBucket: DepotDispatchSummaryRow | null
): ResolvedContainerSelection {
  const selectableById = new Map(selectableContainers.map((row) => [row.id, row] as const));
  const selectableByNumber = new Map(
    selectableContainers.map((row) => [normalizeContainerNumber(row.containerNumber), row] as const)
  );

  if (method === "INVENTORY") {
    const actualRows = selectedInventoryRowIds
      .map((id) => selectableById.get(id) ?? null)
      .filter((row): row is DispatchReleaseSelectableContainerRow => Boolean(row));
    return {
      actualRows,
      actualNumbers: actualRows.map((row) => row.containerNumber),
      duplicateNumbers: [],
      invalidNumbers: [],
      manualCandidateNumbers: [],
      rangeError: null,
    };
  }

  if (method === "MANUAL") {
    const tokens = extractContainerNumbersFromSmartPaste(manualContainerNumbers);
    const seen = new Set<string>();
    const duplicateNumbers = new Set<string>();
    const invalidNumbers = new Set<string>();
    const manualCandidateNumbers = new Set<string>();
    const actualRows: DispatchReleaseSelectableContainerRow[] = [];

    for (const token of tokens) {
      if (seen.has(token)) {
        duplicateNumbers.add(token);
        continue;
      }
      seen.add(token);
      const matched = selectableByNumber.get(token);
      if (!matched) {
        if (
          releaseSource === "VENDOR_REF" &&
          vendorSource?.purchaseOrderId &&
          vendorSource?.purchaseOrderItemId
        ) {
          manualCandidateNumbers.add(token);
          actualRows.push({
            id: `manual-${token}`,
            purchaseOrderId: vendorSource.purchaseOrderId,
            purchaseOrderItemId: vendorSource.purchaseOrderItemId,
            containerId: null,
            containerNumber: token,
            region: activeBucket?.region ?? "-",
            city: activeBucket?.city ?? "-",
            depot: activeBucket?.depot ?? "-",
            owner: "-",
            sizeType: activeBucket?.sizeType ?? vendorSource.sizeType ?? "-",
            condition: activeBucket?.condition ?? vendorSource.condition ?? "-",
            color: activeBucket?.color ?? vendorSource.color ?? "-",
            machineType: activeBucket?.machineType ?? vendorSource.machineType ?? "-",
            flpLbeod: "-",
            purchaseType: vendorSource.purchaseType ?? "-",
            purchaseOrderNo: vendorSource.orderNo ?? "-",
            estimatedOfflineDate: null,
            gateInDate: null,
          });
        } else {
          invalidNumbers.add(token);
        }
        continue;
      }
      actualRows.push(matched);
    }

    return {
      actualRows,
      actualNumbers: actualRows.map((row) => row.containerNumber),
      duplicateNumbers: Array.from(duplicateNumbers),
      invalidNumbers: Array.from(invalidNumbers),
      manualCandidateNumbers: Array.from(manualCandidateNumbers),
      rangeError: null,
    };
  }

  const start = normalizeContainerNumber(rangeStart);
  const end = normalizeContainerNumber(rangeEnd);
  if (!start || !end) {
    return {
      actualRows: [],
      actualNumbers: [],
      duplicateNumbers: [],
      invalidNumbers: [],
      manualCandidateNumbers: [],
      rangeError: null,
    };
  }

  if (start.localeCompare(end) > 0) {
    return {
      actualRows: [],
      actualNumbers: [],
      duplicateNumbers: [],
      invalidNumbers: [],
      manualCandidateNumbers: [],
      rangeError: "Range start must not be greater than range end.",
    };
  }

  const actualRows = selectableContainers.filter((row) => {
    const normalized = normalizeContainerNumber(row.containerNumber);
    return normalized.localeCompare(start) >= 0 && normalized.localeCompare(end) <= 0;
  });

  if (actualRows.length === 0) {
    return {
      actualRows,
      actualNumbers: [],
      duplicateNumbers: [],
      invalidNumbers: [],
      manualCandidateNumbers: [],
      rangeError: "No eligible container numbers were found inside this range.",
    };
  }

  return {
    actualRows,
    actualNumbers: actualRows.map((row) => row.containerNumber),
    duplicateNumbers: [],
    invalidNumbers: [],
    manualCandidateNumbers: [],
    rangeError: null,
  };
}

function FieldShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 text-base font-semibold">{title}</div>
      {children}
    </div>
  );
}

function NumberStepperField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const decrement = () => {
    const next = value - step;
    onChange(min == null ? next : Math.max(min, next));
  };
  const increment = () => {
    const next = value + step;
    onChange(max == null ? next : Math.min(max, next));
  };

  return (
    <FieldShell label={label}>
      <div className="flex h-11 overflow-hidden rounded-md border">
        <Button type="button" variant="ghost" className="h-full rounded-none px-3" onClick={decrement}>
          -
        </Button>
        <Input
          type="number"
          value={String(value)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next)) return;
            let safe = next;
            if (min != null) safe = Math.max(min, safe);
            if (max != null) safe = Math.min(max, safe);
            onChange(safe);
          }}
          className="h-full rounded-none border-0 text-center shadow-none focus-visible:ring-0"
        />
        <Button type="button" variant="ghost" className="h-full rounded-none px-3" onClick={increment}>
          +
        </Button>
      </div>
    </FieldShell>
  );
}

function normalizePastedPickupDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const normalized = trimmed
    .replace(/[.]/g, "-")
    .replace(/\//g, "-")
    .replace(/\s+/g, "");

  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function ContainerPickupDateEditor({
  rows,
  batchPickupDate,
  onBatchPickupDateChange,
  onContainerPickupDateChange,
}: {
  rows: ResolvedContainerDateRow[];
  batchPickupDate: string;
  onBatchPickupDateChange: (value: string) => void;
  onContainerPickupDateChange: (containerNumber: string, value: string) => void;
}) {
  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number;
    column: "container" | "date";
  }>({
    rowIndex: 0,
    column: "date",
  });
  const containerCellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dateCellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function getCellKey(rowIndex: number, column: "container" | "date") {
    return `${rowIndex}:${column}`;
  }

  function focusSelectedCell(rowIndex: number, column: "container" | "date") {
    const key = getCellKey(rowIndex, column);
    const target =
      column === "container" ? containerCellRefs.current[key] : dateCellRefs.current[key];
    target?.focus();
  }

  function selectCell(rowIndex: number, column: "container" | "date") {
    setSelectedCell({ rowIndex, column });
    requestAnimationFrame(() => focusSelectedCell(rowIndex, column));
  }

  function getSelectedCellValue(rowIndex: number, column: "container" | "date") {
    const target = rows[rowIndex];
    if (!target) return "";
    if (column === "container") return target.row.containerNumber;
    return target.pickupDate;
  }

  async function copySelectedCellValue(rowIndex: number, column: "container" | "date") {
    const value = getSelectedCellValue(rowIndex, column);
    if (!value) return;
    await navigator.clipboard.writeText(value);
  }

  function moveSelection(
    rowIndex: number,
    column: "container" | "date",
    direction: "up" | "down" | "left" | "right"
  ) {
    let nextRowIndex = rowIndex;
    let nextColumn = column;

    if (direction === "up") nextRowIndex = Math.max(0, rowIndex - 1);
    if (direction === "down") nextRowIndex = Math.min(rows.length - 1, rowIndex + 1);
    if (direction === "left") nextColumn = column === "date" ? "container" : "container";
    if (direction === "right") nextColumn = column === "container" ? "date" : "date";

    selectCell(nextRowIndex, nextColumn);
  }

  function handleCellKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement | HTMLInputElement>,
    rowIndex: number,
    column: "container" | "date"
  ) {
    const isCopy = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
    if (isCopy) {
      event.preventDefault();
      void copySelectedCellValue(rowIndex, column);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(rowIndex, column, "up");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(rowIndex, column, "down");
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(rowIndex, column, "left");
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(rowIndex, column, "right");
    }
  }

  useEffect(() => {
    if (rows.length === 0) return;
    if (selectedCell.rowIndex > rows.length - 1) {
      setSelectedCell((current) => ({
        ...current,
        rowIndex: rows.length - 1,
      }));
    }
  }, [rows.length, selectedCell.rowIndex]);

  function applyPastedRows(
    pastedRows: Array<{ containerNumber?: string; pickupDate: string }>,
    startIndex: number
  ) {
    if (pastedRows.length === 0) return;

    const hasExplicitContainerNumbers = pastedRows.some((row) => row.containerNumber);
    if (hasExplicitContainerNumbers) {
      for (const row of pastedRows) {
        const containerNumber = normalizeContainerNumber(row.containerNumber);
        const pickupDate = normalizePastedPickupDate(row.pickupDate);
        if (!containerNumber || !pickupDate) continue;
        onContainerPickupDateChange(containerNumber, pickupDate);
      }
      return;
    }

    for (let index = 0; index < pastedRows.length; index += 1) {
      const target = rows[startIndex + index];
      if (!target) break;
      const pickupDate = normalizePastedPickupDate(pastedRows[index]?.pickupDate ?? "");
      if (!pickupDate) continue;
      onContainerPickupDateChange(target.row.containerNumber, pickupDate);
    }
  }

  function handlePaste(
    event: React.ClipboardEvent<HTMLInputElement>,
    rowIndex: number
  ) {
    const clipboardText = event.clipboardData.getData("text").trim();
    const normalizedSingleDate = normalizePastedPickupDate(clipboardText);

    if (!clipboardText.includes("\n") && !clipboardText.includes("\t")) {
      if (!normalizedSingleDate) return;
      event.preventDefault();
      const target = rows[rowIndex];
      if (!target) return;
      onContainerPickupDateChange(target.row.containerNumber, normalizedSingleDate);
      return;
    }

    const parsedRows = clipboardText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cells = line.split("\t").map((cell) => cell.trim());
        if (cells.length >= 2) {
          return {
            containerNumber: cells[0],
            pickupDate: cells[1],
          };
        }
        return {
          pickupDate: cells[0] ?? "",
        };
      })
      .filter((row) => normalizePastedPickupDate(row.pickupDate));

    if (parsedRows.length === 0) return;

    event.preventDefault();
    applyPastedRows(parsedRows, rowIndex);
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Batch Picked Up / Delivery Date">
          <Input
            type="date"
            value={batchPickupDate}
            onChange={(event) => onBatchPickupDateChange(event.target.value)}
          />
        </FieldShell>
        <div className="text-sm text-muted-foreground md:self-end">
          Batch date applies as the default for all selected containers. A per-container date overrides it.
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">Per-Container Dates</div>
          <div className="text-xs text-muted-foreground">
            Paste two columns: Container Number + Picked Up / Delivery Date
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9 py-2">Container Number</TableHead>
                <TableHead className="h-9 py-2">Picked Up / Delivery Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ row, pickupDate, locked }, index) => (
                <TableRow key={row.id}>
                  <TableCell className="py-2">
                    <button
                      type="button"
                      ref={(element) => {
                        containerCellRefs.current[getCellKey(index, "container")] = element;
                      }}
                      onClick={() => selectCell(index, "container")}
                      onFocus={() => setSelectedCell({ rowIndex: index, column: "container" })}
                      onKeyDown={(event) => handleCellKeyDown(event, index, "container")}
                      className={`flex h-8 w-full items-center rounded-md px-2 text-left text-sm font-medium outline-none transition ${
                        selectedCell.rowIndex === index && selectedCell.column === "container"
                          ? "ring-2 ring-ring ring-offset-1"
                          : "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      }`}
                    >
                      {row.containerNumber}
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={pickupDate ?? ""}
                        onChange={(event) =>
                          onContainerPickupDateChange(row.containerNumber, event.target.value)
                        }
                        onPaste={(event) => handlePaste(event, index)}
                        onClick={() => selectCell(index, "date")}
                        onFocus={() => setSelectedCell({ rowIndex: index, column: "date" })}
                        onKeyDown={(event) => handleCellKeyDown(event, index, "date")}
                        disabled={locked}
                        ref={(element) => {
                          dateCellRefs.current[getCellKey(index, "date")] = element;
                        }}
                        className={`h-8 max-w-[220px] text-sm ${
                          selectedCell.rowIndex === index && selectedCell.column === "date"
                            ? "ring-2 ring-ring ring-offset-1"
                            : ""
                        }`}
                      />
                      {locked ? (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function DispatchReleaseBuilder({
  initialSummary,
  filterOptions,
  lesseeOptions,
  initialContext,
  preselectedBucket,
  sourcePlan = null,
  mode = "create",
  editData = null,
}: Props) {
  const isEditMode = mode === "edit" && Boolean(editData);
  const initialEditReleaseQty = editData?.draft.releaseQty ?? 0;
  const router = useRouter();
  const [bucketFilters, setBucketFilters] = useState<DepotDispatchSummaryQuery>(initialSummary.filters);
  const [bucketResult, setBucketResult] = useState<DepotDispatchSummaryResult>(initialSummary);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [activeBucket, setActiveBucket] = useState<DepotDispatchSummaryRow | null>(
    (editData?.bucket as DepotDispatchSummaryRow | null) ?? preselectedBucket
  );
  const [releaseSource, setReleaseSource] = useState<ReleaseSourceKind | "">(
    isEditMode
      ? editData?.releaseSource ?? ""
      : (initialContext.releaseSource as ReleaseSourceKind | "") || ""
  );
  const [sourceSelectorRow, setSourceSelectorRow] = useState<DepotDispatchSummaryRow | null>(null);
  const [vendorSelectorRow, setVendorSelectorRow] = useState<DepotDispatchSummaryRow | null>(null);
  const [vendorRows, setVendorRows] = useState<VendorReleaseSelectorRow[]>([]);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [vendorReleaseDocuments, setVendorReleaseDocuments] = useState<DispatchReleaseVendorDocument[]>(
    editData?.vendorReleaseDocuments ?? []
  );
  const [vendorReleaseDocumentsLoading, setVendorReleaseDocumentsLoading] = useState(false);
  const [selectableContainers, setSelectableContainers] = useState<DispatchReleaseSelectableContainerRow[]>([]);
  const [selectableLoading, setSelectableLoading] = useState(false);
  const [containerCostsCollapsed, setContainerCostsCollapsed] = useState(true);
  const [inventorySearch, setInventorySearch] = useState("");
  const [selectedInventoryRowIds, setSelectedInventoryRowIds] = useState<string[]>([]);
  const [selectionBatchPickupDate, setSelectionBatchPickupDate] = useState<string>(
    buildInitialBatchPickupDate(editData?.selectedContainers)
  );
  const [containerPickupDates, setContainerPickupDates] = useState<Record<string, string>>(
    buildInitialContainerPickupDates(editData?.selectedContainers)
  );
  const [containerTruckingCosts, setContainerTruckingCosts] = useState<Record<string, string>>(
    buildInitialContainerMoneyMap(editData?.selectedContainers, "truckingCost")
  );
  const [containerTruckingCostCurrencies, setContainerTruckingCostCurrencies] = useState<Record<string, string>>(
    buildInitialContainerCurrencyMap(editData?.selectedContainers, "truckingCostCurrency")
  );
  const [containerRepairCosts, setContainerRepairCosts] = useState<Record<string, string>>(
    buildInitialContainerMoneyMap(editData?.selectedContainers, "repairCost")
  );
  const [containerRepairCostCurrencies, setContainerRepairCostCurrencies] = useState<Record<string, string>>(
    buildInitialContainerCurrencyMap(editData?.selectedContainers, "repairCostCurrency")
  );
  const [containerDamageClaims, setContainerDamageClaims] = useState<Record<string, string>>(
    buildInitialContainerMoneyMap(editData?.selectedContainers, "damageClaim")
  );
  const [containerDamageClaimCurrencies, setContainerDamageClaimCurrencies] = useState<Record<string, string>>(
    buildInitialContainerCurrencyMap(editData?.selectedContainers, "damageClaimCurrency")
  );
  const [containerRemarks, setContainerRemarks] = useState<Record<string, string>>(
    buildInitialContainerRemarkMap(editData?.selectedContainers)
  );
  const [financialExchangeRates, setFinancialExchangeRates] = useState<FinancialExchangeRateRow[]>([]);
  const [costContainerSearch, setCostContainerSearch] = useState("");
  const [costContainerSearchFocused, setCostContainerSearchFocused] = useState(false);
  const [costContainerSuggestionIndex, setCostContainerSuggestionIndex] = useState(0);
  const [activeCostContainerNumbers, setActiveCostContainerNumbers] = useState<string[]>(
    buildInitialCostContainerNumbers(editData?.selectedContainers)
  );
  const [selectedVendorReleaseId, setSelectedVendorReleaseId] = useState<string>(
    editData?.sourcePurchaseOrderItemId || initialContext.sourcePurchaseOrderItemId
  );
  const [vendorSource, setVendorSource] = useState<VendorReleaseSelectorRow | null>(
    editData?.sourcePurchaseOrderItemId || initialContext.sourcePurchaseOrderItemId
        ? {
          purchaseOrderItemId:
            editData?.sourcePurchaseOrderItemId || initialContext.sourcePurchaseOrderItemId,
          purchaseOrderId: editData?.sourcePurchaseOrderId || initialContext.sourcePurchaseOrderId,
          orderNo: "-",
          purchaseType: "-",
          lineNo: 0,
          vendorReleaseNumber:
            editData?.vendorReleaseNumber || initialContext.vendorReleaseNumber || "-",
          vendorReleaseDate: null,
          freeday: null,
          expiryDate: null,
          locationCityCode: "",
          locationCityName: "",
          depotId: "",
          depotCode: "",
          depotName: initialContext.depot || "-",
          sizeType: initialContext.sizeType || "-",
          condition: initialContext.condition || "-",
          color: initialContext.color || "-",
          machineType: initialContext.machineType || "-",
          sourceTotalQty: 0,
          vendorReleaseUsedQty: 0,
          remainingQty: 0,
          vendorReleaseAttachmentCount: 0,
          hasVendorReleaseAttachment: false,
        }
      : null
  );
  const [draft, setDraft] = useState<DispatchReleaseDraft>(editData?.draft ?? DEFAULT_DRAFT);
  const [lesseeInputValue, setLesseeInputValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasSeededEditSelection, setHasSeededEditSelection] = useState(false);
  const costContainerSearchRef = useRef<HTMLDivElement | null>(null);
  const savedPickupDatesByNumber = useMemo(
    () => buildInitialContainerPickupDates(editData?.selectedContainers),
    [editData?.selectedContainers]
  );

  const totalPages = Math.max(1, Math.ceil(bucketResult.totalCount / bucketResult.pageSize));
  const showingStart =
    bucketResult.totalCount === 0 ? 0 : (bucketResult.page - 1) * bucketResult.pageSize + 1;
  const showingEnd =
    bucketResult.totalCount === 0 ? 0 : Math.min(bucketResult.totalCount, bucketResult.page * bucketResult.pageSize);
  const activeFiltersSummary = useMemo(
    () => appliedFilterSummary(bucketResult.filters),
    [bucketResult.filters]
  );
  const portCityOptions = useMemo(() => buildPortCityOptions(filterOptions.locations), [filterOptions.locations]);
  const hasContext =
    Boolean(initialContext.releaseSource) ||
    Boolean(initialContext.city) ||
    Boolean(initialContext.depot) ||
    Boolean(initialContext.sizeType);
  const sourceLimit = useMemo(
    () => (activeBucket ? buildSourceLimit(activeBucket, releaseSource, vendorSource) : 0),
    [activeBucket, releaseSource, vendorSource]
  );
  const effectiveSourceLimit = isEditMode ? sourceLimit + initialEditReleaseQty : sourceLimit;
  const reservedByThisReleaseQty = Math.max(0, draft.releaseQty);
  const remainingAvailableQty = Math.max(0, effectiveSourceLimit - reservedByThisReleaseQty);
  const totalSourceQty = reservedByThisReleaseQty + remainingAvailableQty;
  const showingForm = isEditMode || Boolean(activeBucket && releaseSource);
  const resolvedSelection = useMemo(
    () =>
      resolveSpecifiedSelection(
        draft.specifiedSelectionMethod,
        selectableContainers,
        selectedInventoryRowIds,
        draft.manualContainerNumbers,
        draft.rangeStart,
        draft.rangeEnd,
        releaseSource,
        vendorSource,
        activeBucket
      ),
    [
      activeBucket,
      draft.manualContainerNumbers,
      draft.rangeEnd,
      draft.rangeStart,
      draft.specifiedSelectionMethod,
      releaseSource,
      selectableContainers,
      selectedInventoryRowIds,
      vendorSource,
    ]
  );
  const filteredSelectableContainers = useMemo(() => {
    const needle = normalizeContainerNumber(inventorySearch);
    if (!needle) return selectableContainers;
    return selectableContainers.filter((row) =>
      [
        row.containerNumber,
        row.purchaseOrderNo,
        row.owner,
        row.depot,
        row.color,
        row.machineType,
      ]
        .join(" ")
        .toUpperCase()
        .includes(needle)
    );
  }, [inventorySearch, selectableContainers]);
  const smartPastedManualNumbers = useMemo(
    () => extractContainerNumbersFromSmartPaste(draft.manualContainerNumbers),
    [draft.manualContainerNumbers]
  );
  const selectedLesseeOption = useMemo(
    () => lesseeOptions.find((option) => option.value === draft.dispatchVendor) ?? null,
    [draft.dispatchVendor, lesseeOptions]
  );

  useEffect(() => {
    if (!selectedLesseeOption) return;
    setLesseeInputValue((current) => {
      const next = formatLesseeDisplay(selectedLesseeOption);
      return current === next ? current : next;
    });
  }, [selectedLesseeOption]);

  useEffect(() => {
    setCostContainerSuggestionIndex(0);
  }, [costContainerSearch]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!costContainerSearchRef.current?.contains(event.target as Node)) {
        setCostContainerSearchFocused(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const resolvedContainerDateRows = useMemo<ResolvedContainerDateRow[]>(
    () =>
      resolvedSelection.actualRows.map((row) => {
        const normalizedNumber = normalizeContainerNumber(row.containerNumber);
        return {
          row,
          pickupDate: resolvePickupDateForContainer(
            row.containerNumber,
            selectionBatchPickupDate,
            containerPickupDates
          ),
          locked: Boolean(savedPickupDatesByNumber[normalizedNumber]),
        };
      }),
    [containerPickupDates, resolvedSelection.actualRows, savedPickupDatesByNumber, selectionBatchPickupDate]
  );
  const editableContainerDateRows = useMemo(
    () => (isEditMode ? resolvedContainerDateRows.filter((row) => !row.locked) : resolvedContainerDateRows),
    [isEditMode, resolvedContainerDateRows]
  );
  const hasTooManySpecifiedContainers =
    draft.containerSelectionMode === "SPECIFIED" &&
    draft.releaseQty > 0 &&
    resolvedSelection.actualRows.length > draft.releaseQty;
  const isSpecifiedSelectionFull =
    draft.containerSelectionMode === "SPECIFIED" &&
    draft.releaseQty > 0 &&
    resolvedSelection.actualRows.length >= draft.releaseQty;
  const shouldShowPickupDateEditor =
    editableContainerDateRows.length > 0 &&
    (!hasTooManySpecifiedContainers || draft.releaseQty <= 0);
  const activeCostContainerRows = useMemo(
    () =>
      resolvedContainerDateRows.filter(({ row }) =>
        activeCostContainerNumbers.includes(normalizeContainerNumber(row.containerNumber))
      ),
    [activeCostContainerNumbers, resolvedContainerDateRows]
  );
  const availableCostContainerNumbers = useMemo(
    () =>
      resolvedContainerDateRows
        .map(({ row }) => normalizeContainerNumber(row.containerNumber))
        .filter(
          (containerNumber) =>
            containerNumber.length > 0 && !activeCostContainerNumbers.includes(containerNumber)
        ),
    [activeCostContainerNumbers, resolvedContainerDateRows]
  );
  const filteredCostContainerNumbers = useMemo(() => {
    const query = normalizeContainerNumber(costContainerSearch);
    if (!query) return availableCostContainerNumbers;
    return availableCostContainerNumbers.filter((containerNumber) =>
      containerNumber.includes(query)
    );
  }, [availableCostContainerNumbers, costContainerSearch]);
  useEffect(() => {
    setCostContainerSuggestionIndex(0);
  }, [filteredCostContainerNumbers.length]);
  const pickupDateByContainerNumber = useMemo(
    () =>
      new Map(
        resolvedContainerDateRows.map((row) => [
          normalizeContainerNumber(row.row.containerNumber),
          row.pickupDate,
        ] as const)
      ),
    [resolvedContainerDateRows]
  );
  const containerTruckingCostTotal = useMemo(
    () =>
      resolvedContainerDateRows.reduce(
        (sum, { row }) =>
          sum + Number(resolveContainerFieldValue(row.containerNumber, containerTruckingCosts, "0.00") || 0),
        0
      ),
    [containerTruckingCosts, resolvedContainerDateRows]
  );
  const containerRepairCostTotal = useMemo(
    () =>
      resolvedContainerDateRows.reduce(
        (sum, { row }) =>
          sum + Number(resolveContainerFieldValue(row.containerNumber, containerRepairCosts, "0.00") || 0),
        0
      ),
    [containerRepairCosts, resolvedContainerDateRows]
  );
  const containerDamageClaimTotal = useMemo(
    () =>
      resolvedContainerDateRows.reduce(
        (sum, { row }) =>
          sum + Number(resolveContainerFieldValue(row.containerNumber, containerDamageClaims, "0.00") || 0),
        0
      ),
    [containerDamageClaims, resolvedContainerDateRows]
  );
  const convertedContainerTruckingCostTotal = useMemo(() => {
    if (!isEditMode || !draft.releaseDate) {
      return editData?.truckingCostTotalInHeaderCurrency ?? 0;
    }
    let total = 0;
    for (const { row, pickupDate } of resolvedContainerDateRows) {
      const amount = Number(
        resolveContainerFieldValue(row.containerNumber, containerTruckingCosts, "0.00") || 0
      );
      if (!Number.isFinite(amount) || amount === 0) continue;
      const conversionDate = pickupDate || draft.releaseDate;
      const rate = resolveExchangeRateFromMap(
        financialExchangeRates,
        conversionDate,
        resolveContainerFieldValue(
          row.containerNumber,
          containerTruckingCostCurrencies,
          "USD"
        ),
        draft.headerCurrency
      );
      if (rate == null) return editData?.truckingCostTotalInHeaderCurrency ?? 0;
      total += amount * rate;
    }
    return total;
  }, [
    containerTruckingCosts,
    containerTruckingCostCurrencies,
    draft.headerCurrency,
    draft.releaseDate,
    editData?.truckingCostTotalInHeaderCurrency,
    financialExchangeRates,
    isEditMode,
    resolvedContainerDateRows,
  ]);
  const convertedContainerRepairCostTotal = useMemo(() => {
    if (!isEditMode || !draft.releaseDate) {
      return editData?.repairCostTotalInHeaderCurrency ?? 0;
    }
    let total = 0;
    for (const { row, pickupDate } of resolvedContainerDateRows) {
      const amount = Number(
        resolveContainerFieldValue(row.containerNumber, containerRepairCosts, "0.00") || 0
      );
      if (!Number.isFinite(amount) || amount === 0) continue;
      const conversionDate = pickupDate || draft.releaseDate;
      const rate = resolveExchangeRateFromMap(
        financialExchangeRates,
        conversionDate,
        resolveContainerFieldValue(
          row.containerNumber,
          containerRepairCostCurrencies,
          "USD"
        ),
        draft.headerCurrency
      );
      if (rate == null) return editData?.repairCostTotalInHeaderCurrency ?? 0;
      total += amount * rate;
    }
    return total;
  }, [
    containerRepairCosts,
    containerRepairCostCurrencies,
    draft.headerCurrency,
    draft.releaseDate,
    editData?.repairCostTotalInHeaderCurrency,
    financialExchangeRates,
    isEditMode,
    resolvedContainerDateRows,
  ]);
  const convertedContainerDamageClaimTotal = useMemo(() => {
    if (!isEditMode || !draft.releaseDate) {
      return editData?.repairRecoveryTotalInHeaderCurrency ?? 0;
    }
    let total = 0;
    for (const { row, pickupDate } of resolvedContainerDateRows) {
      const amount = Number(
        resolveContainerFieldValue(row.containerNumber, containerDamageClaims, "0.00") || 0
      );
      if (!Number.isFinite(amount) || amount === 0) continue;
      const conversionDate = pickupDate || draft.releaseDate;
      const rate = resolveExchangeRateFromMap(
        financialExchangeRates,
        conversionDate,
        resolveContainerFieldValue(
          row.containerNumber,
          containerDamageClaimCurrencies,
          "USD"
        ),
        draft.headerCurrency
      );
      if (rate == null) return editData?.repairRecoveryTotalInHeaderCurrency ?? 0;
      total += amount * rate;
    }
    return total;
  }, [
    containerDamageClaims,
    containerDamageClaimCurrencies,
    draft.headerCurrency,
    draft.releaseDate,
    editData?.repairRecoveryTotalInHeaderCurrency,
    financialExchangeRates,
    isEditMode,
    resolvedContainerDateRows,
  ]);

  useEffect(() => {
    let active = true;

    async function loadRates() {
      if (!isEditMode || !draft.releaseDate) {
        if (active) setFinancialExchangeRates([]);
        return;
      }
      try {
        const rateDates = Array.from(
          new Set(
            [draft.releaseDate, ...resolvedContainerDateRows.map((row) => row.pickupDate)]
              .filter((value): value is string => Boolean(value && value.trim()))
              .map((value) => value.trim())
          )
        );
        const rows =
          rateDates.length <= 1
            ? await getFinancialExchangeRatesForDate(draft.releaseDate)
            : await getFinancialExchangeRatesForDates(rateDates);
        if (active) {
          setFinancialExchangeRates(rows);
        }
      } catch {
        if (active) {
          setFinancialExchangeRates([]);
        }
      }
    }

    void loadRates();

    return () => {
      active = false;
    };
  }, [draft.releaseDate, isEditMode, resolvedContainerDateRows]);

  useEffect(() => {
    if (isEditMode) return;
    if (!activeBucket || !releaseSource) return;
    setDraft((current) => {
      const defaultPol = extractCityCodeFromLabel(activeBucket.city);
      if (current.releaseQty > 0 && current.pol) return current;
      const seededQty = Math.max(0, sourceLimit);
      return {
        ...current,
        releaseQty: current.releaseQty > 0 ? current.releaseQty : seededQty,
        pol: current.pol || defaultPol,
        selfPickupDepot: current.selfPickupDepot || activeBucket.depot || "",
      };
    });
  }, [activeBucket, isEditMode, releaseSource, sourceLimit]);

  useEffect(() => {
    if (isEditMode || !sourcePlan) return;
    setDraft((current) => ({
      ...current,
      dispatchPlanNo: sourcePlan.planId,
      dispatchVendor: sourcePlan.lesseeId || current.dispatchVendor,
      onhireNo: sourcePlan.onhireNo || current.onhireNo,
      pol: sourcePlan.cityCode !== "-" ? sourcePlan.cityCode : current.pol,
      pod:
        sourcePlan.podCandidates.length === 1
          ? sourcePlan.podCandidates[0] ?? current.pod
          : current.pod,
      carrier: sourcePlan.carrier || current.carrier,
      pickupCharge: sourcePlan.pickupCharge.toFixed(2),
      dpp: sourcePlan.dpp.toFixed(2),
      freeDays: String(sourcePlan.freeDays),
      rv: sourcePlan.rv.toFixed(2),
      dailyRent: sourcePlan.dailyRent.toFixed(2),
      headerCurrency: sourcePlan.currency || current.headerCurrency,
      itemCostCurrency: sourcePlan.currency || current.itemCostCurrency,
      releaseQty: sourcePlan.quantity,
      selfPickupDepot:
        sourcePlan.depotCode !== "-" ? sourcePlan.depotCode : current.selfPickupDepot,
    }));
    setLesseeInputValue(sourcePlan.lesseeLabel === "-" ? "" : sourcePlan.lesseeLabel);
  }, [isEditMode, sourcePlan]);

  useEffect(() => {
    if (isEditMode) return;
    if (!activeBucket || !releaseSource) {
      setDraft((current) =>
        current.releaseNumber
          ? {
              ...current,
              releaseNumber: "",
            }
          : current
      );
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const nextReleaseNumber = await getNextDispatchReleaseNumber(activeBucket.city);
        if (cancelled) return;
        setDraft((current) => ({
          ...current,
          releaseNumber: nextReleaseNumber,
        }));
      } catch (error) {
        if (cancelled) return;
        toast({
          variant: "destructive",
          title: "Could not generate release number",
          description: getErrorMessage(error),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBucket, isEditMode, releaseSource]);

  useEffect(() => {
    if (!activeBucket || !releaseSource) {
      setSelectableContainers([]);
      setSelectedInventoryRowIds([]);
      setInventorySearch("");
      return;
    }

    const shouldWaitForVendorSelection =
      releaseSource === "VENDOR_REF" && !vendorSource?.purchaseOrderItemId;
    if (shouldWaitForVendorSelection) {
      setSelectableContainers([]);
      setSelectedInventoryRowIds([]);
      setInventorySearch("");
      return;
    }

    let cancelled = false;
    setSelectableLoading(true);

    void (async () => {
      try {
        const rows = await getDispatchReleaseSelectableContainers(
          buildSelectableContainersQuery(
            activeBucket,
            releaseSource,
            vendorSource,
            editData?.transferOrderId
          )
        );
        if (cancelled) return;
        setSelectableContainers(rows);
        setSelectedInventoryRowIds((current) => current.filter((id) => rows.some((row) => row.id === id)));
      } catch (error) {
        if (cancelled) return;
        setSelectableContainers([]);
        setSelectedInventoryRowIds([]);
        toast({
          variant: "destructive",
          title: "Could not load eligible containers",
          description: getErrorMessage(error),
        });
      } finally {
        if (!cancelled) {
          setSelectableLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBucket, editData?.transferOrderId, releaseSource, vendorSource]);

  useEffect(() => {
    if (
      !activeBucket ||
      releaseSource !== "VENDOR_REF" ||
      !initialContext.sourcePurchaseOrderItemId
    ) {
      return;
    }

    if (
      vendorSource?.purchaseOrderItemId === initialContext.sourcePurchaseOrderItemId &&
      (vendorSource.remainingQty > 0 ||
        vendorSource.sourceTotalQty > 0 ||
        normalizeContainerNumber(vendorSource.orderNo) !== "-")
    ) {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const rows = await getVendorReleaseSelectorRows({
          city: activeBucket.city,
          depot: activeBucket.depot,
          sizeType: activeBucket.sizeType,
          condition: activeBucket.condition,
          color: activeBucket.color,
          machineType: activeBucket.machineType,
        });
        if (cancelled) return;
        const matched = rows.find(
          (row) => row.purchaseOrderItemId === initialContext.sourcePurchaseOrderItemId
        );
        if (matched) {
          setVendorSource(matched);
          setSelectedVendorReleaseId(matched.purchaseOrderItemId);
        }
      } catch {
        // Keep the page usable even if source enrichment fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeBucket, releaseSource, initialContext.sourcePurchaseOrderItemId, vendorSource]);

  useEffect(() => {
    if (releaseSource !== "VENDOR_REF" || !vendorSource?.purchaseOrderItemId) {
      setVendorReleaseDocuments([]);
      setVendorReleaseDocumentsLoading(false);
      return;
    }

    let cancelled = false;
    setVendorReleaseDocumentsLoading(true);

    void (async () => {
      try {
        const rows = await getPurchaseOrderItemVendorReleaseDocuments(
          vendorSource.purchaseOrderItemId
        );
        if (cancelled) return;
        setVendorReleaseDocuments(rows);
      } catch (error) {
        if (cancelled) return;
        setVendorReleaseDocuments([]);
        toast({
          variant: "destructive",
          title: "Could not load vendor release documents",
          description: getErrorMessage(error),
        });
      } finally {
        if (!cancelled) {
          setVendorReleaseDocumentsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [releaseSource, vendorSource?.purchaseOrderItemId]);

  useEffect(() => {
    if (!isEditMode || !editData || hasSeededEditSelection) return;
    if (draft.containerSelectionMode !== "SPECIFIED") {
      setHasSeededEditSelection(true);
      return;
    }
    if (selectableContainers.length === 0) return;

    const wantedNumbers = new Set(
      editData.selectedContainers.map((row) => normalizeContainerNumber(row.containerNumber))
    );
    const matchedIds = selectableContainers
      .filter((row) => wantedNumbers.has(normalizeContainerNumber(row.containerNumber)))
      .map((row) => row.id);
    setSelectedInventoryRowIds(matchedIds);
    setHasSeededEditSelection(true);
  }, [
    draft.containerSelectionMode,
    editData,
    hasSeededEditSelection,
    isEditMode,
    selectableContainers,
  ]);

  async function runBucketSearch(next: DepotDispatchSummaryQuery) {
    setBucketLoading(true);
    try {
      const result = await getDepotDispatchSummary(next);
      setBucketResult(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load dispatch availability buckets",
        description: getErrorMessage(error),
      });
    } finally {
      setBucketLoading(false);
    }
  }

  async function handleBucketSearch() {
    const next = { ...bucketFilters, page: 1 };
    setBucketFilters(next);
    await runBucketSearch(next);
    setFiltersCollapsed(true);
  }

  async function handleBucketReset() {
    const next = { ...EMPTY_FILTERS, pageSize: bucketFilters.pageSize };
    setBucketFilters(next);
    await runBucketSearch(next);
    setFiltersCollapsed(false);
  }

  async function handleBucketPageChange(nextPage: number) {
    const next = { ...bucketFilters, page: nextPage };
    setBucketFilters(next);
    await runBucketSearch(next);
  }

  async function handleBucketPageSizeChange(nextPageSize: number) {
    const next = { ...bucketFilters, page: 1, pageSize: nextPageSize };
    setBucketFilters(next);
    await runBucketSearch(next);
  }

  function openSourceFlow(row: DepotDispatchSummaryRow) {
    if (row.hasFactoryOrder && !row.hasNewOrUsedPurchase) {
      setActiveBucket(row);
      setReleaseSource("INTERNAL_FACTORY");
      setVendorSource(null);
      setSelectedVendorReleaseId("");
      return;
    }
    setSourceSelectorRow(row);
  }

  function handleChooseBucket(row: DepotDispatchSummaryRow) {
    openSourceFlow(row);
  }

  function handleSelectDepotInventory() {
    if (!sourceSelectorRow) return;
    setActiveBucket(sourceSelectorRow);
    setReleaseSource("INTERNAL_DEPOT");
    setVendorSource(null);
    setSelectedVendorReleaseId("");
    setSourceSelectorRow(null);
  }

  async function handleSelectVendorReference() {
    if (!sourceSelectorRow) return;
    setVendorLoading(true);
    setSelectedVendorReleaseId("");
    try {
      const rows = await getVendorReleaseSelectorRows({
        city: sourceSelectorRow.city,
        depot: sourceSelectorRow.depot,
        sizeType: sourceSelectorRow.sizeType,
        condition: sourceSelectorRow.condition,
        color: sourceSelectorRow.color,
        machineType: sourceSelectorRow.machineType,
      });
      setVendorRows(rows);
      setVendorSelectorRow(sourceSelectorRow);
      setSourceSelectorRow(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load vendor release rows",
        description: getErrorMessage(error),
      });
    } finally {
      setVendorLoading(false);
    }
  }

  function handleContinueVendorRelease() {
    if (!vendorSelectorRow || !selectedVendorReleaseId) return;
    const selected = vendorRows.find((row) => row.purchaseOrderItemId === selectedVendorReleaseId);
    if (!selected) return;
    setActiveBucket(vendorSelectorRow);
    setReleaseSource("VENDOR_REF");
    setVendorSource(selected);
    setVendorSelectorRow(null);
  }

  function handleChangeBucket() {
    setActiveBucket(null);
    setReleaseSource("");
    setVendorSource(null);
    setSelectedVendorReleaseId("");
    setSelectableContainers([]);
    setSelectedInventoryRowIds([]);
    setInventorySearch("");
    setSelectionBatchPickupDate("");
    setContainerPickupDates({});
    setContainerTruckingCosts({});
    setContainerRepairCosts({});
    setContainerDamageClaims({});
    setContainerRemarks({});
    setDraft(DEFAULT_DRAFT);
  }

  function updateDraft<K extends keyof DispatchReleaseDraft>(key: K, value: DispatchReleaseDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleInventoryRow(rowId: string, checked: boolean) {
    setSelectedInventoryRowIds((current) => {
      if (checked) {
        if (current.includes(rowId)) return current;
        return [...current, rowId];
      }
      return current.filter((id) => id !== rowId);
    });
  }

  function updateResolvedContainerPickupDate(containerNumber: string, value: string) {
    const normalizedNumber = normalizeContainerNumber(containerNumber);
    if (!normalizedNumber) return;
    if (savedPickupDatesByNumber[normalizedNumber]) return;
    setContainerPickupDates((current) => ({
      ...current,
      [normalizedNumber]: value,
    }));
  }

  function updateResolvedContainerMoneyField(
    containerNumber: string,
    field: "trucking" | "repair" | "recovery",
    value: string
  ) {
    const normalizedNumber = normalizeContainerNumber(containerNumber);
    if (!normalizedNumber) return;
    const setter =
      field === "trucking"
        ? setContainerTruckingCosts
        : field === "repair"
          ? setContainerRepairCosts
          : setContainerDamageClaims;
    setter((current) => ({
      ...current,
      [normalizedNumber]: value,
    }));
  }

  function updateResolvedContainerCurrencyField(
    containerNumber: string,
    field: "trucking" | "repair" | "recovery",
    value: string
  ) {
    const normalizedNumber = normalizeContainerNumber(containerNumber);
    if (!normalizedNumber) return;
    const setter =
      field === "trucking"
        ? setContainerTruckingCostCurrencies
        : field === "repair"
          ? setContainerRepairCostCurrencies
          : setContainerDamageClaimCurrencies;
    setter((current) => ({
      ...current,
      [normalizedNumber]: value,
    }));
  }

  function updateResolvedContainerRemark(containerNumber: string, value: string) {
    const normalizedNumber = normalizeContainerNumber(containerNumber);
    if (!normalizedNumber) return;
    setContainerRemarks((current) => ({
      ...current,
      [normalizedNumber]: value,
    }));
  }

  function addContainerItemCostRow(rawContainerNumber = costContainerSearch) {
    const normalizedNumber = normalizeContainerNumber(rawContainerNumber);
    if (!normalizedNumber) return;

    const matchedRow = resolvedContainerDateRows.find(
      ({ row }) => normalizeContainerNumber(row.containerNumber) === normalizedNumber
    );
    if (!matchedRow) {
      toast({
        variant: "destructive",
        title: "Container not found",
        description: `Container ${normalizedNumber} is not part of the current specified container set.`,
      });
      return;
    }

    setActiveCostContainerNumbers((current) => {
      if (current.includes(normalizedNumber)) return current;
      return [...current, normalizedNumber];
    });
    setCostContainerSearch("");
    setCostContainerSearchFocused(false);
    setCostContainerSuggestionIndex(0);
    setContainerCostsCollapsed(false);
  }

  function removeContainerItemCostRow(containerNumber: string) {
    const normalizedNumber = normalizeContainerNumber(containerNumber);
    setActiveCostContainerNumbers((current) =>
      current.filter((value) => value !== normalizedNumber)
    );
    setContainerTruckingCosts((current) => ({ ...current, [normalizedNumber]: "0.00" }));
    setContainerRepairCosts((current) => ({ ...current, [normalizedNumber]: "0.00" }));
    setContainerDamageClaims((current) => ({ ...current, [normalizedNumber]: "0.00" }));
    setContainerTruckingCostCurrencies((current) => ({ ...current, [normalizedNumber]: "USD" }));
    setContainerRepairCostCurrencies((current) => ({ ...current, [normalizedNumber]: "USD" }));
    setContainerDamageClaimCurrencies((current) => ({ ...current, [normalizedNumber]: "USD" }));
    setContainerRemarks((current) => ({ ...current, [normalizedNumber]: "" }));
  }

  function validateForm() {
    const errors: string[] = [];
    if (!activeBucket) errors.push("Please choose one dispatch availability bucket.");
    if (!releaseSource) errors.push("Please confirm the release source.");
    if (!draft.dispatchVendor.trim()) errors.push("Lessee is required.");
    if (!draft.releaseDate) errors.push("Release Date is required.");
    if (!draft.pol.trim()) errors.push("POL is required.");
    if (!draft.pod.trim()) errors.push("POD is required.");
    if (!draft.pickupCharge.trim()) errors.push("Pick Up Charge is required.");
    if (!draft.dpp.trim()) errors.push("DPP is required.");
    if (!draft.freeDays.trim()) errors.push("Free Days is required.");
    if (!draft.rv.trim()) errors.push("RV (Return Value) is required.");
    if (!draft.dailyRent.trim()) errors.push("Daily Rent is required.");
    if (!draft.releaseMode) errors.push("Release Mode is required.");
    if (draft.releaseQty <= 0) errors.push("Release Qty must be greater than 0.");
    if (effectiveSourceLimit > 0 && draft.releaseQty > effectiveSourceLimit) {
      errors.push(`Release Qty cannot exceed source limit ${effectiveSourceLimit}.`);
    }
    if (draft.containerSelectionMode === "SPECIFIED") {
      if (draft.specifiedSelectionMethod === "MANUAL" && parseManualCount(draft.manualContainerNumbers) === 0) {
        errors.push("Manual Entry requires at least one container number.");
      }
      if (
        draft.specifiedSelectionMethod === "RANGE" &&
        (!draft.rangeStart.trim() || !draft.rangeEnd.trim())
      ) {
        errors.push("Range Entry requires both range start and range end.");
      }
      if (resolvedSelection.rangeError) {
        errors.push(resolvedSelection.rangeError);
      }
      if (resolvedSelection.duplicateNumbers.length > 0) {
        errors.push(`Duplicate container numbers: ${resolvedSelection.duplicateNumbers.join(", ")}`);
      }
      if (resolvedSelection.invalidNumbers.length > 0) {
        errors.push(`Invalid or ineligible container numbers: ${resolvedSelection.invalidNumbers.join(", ")}`);
      }
      if (resolvedSelection.actualRows.length === 0) {
        errors.push("Specified Container Numbers must resolve to at least one eligible container.");
      }
      if (resolvedSelection.actualRows.length > draft.releaseQty) {
        errors.push(
          `Specified container count ${resolvedSelection.actualRows.length} cannot exceed Release Qty ${draft.releaseQty}.`
        );
      }
    }
    return errors;
  }

  async function handleSubmit() {
    const errors = validateForm();
    if (errors.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: errors[0],
      });
      return;
    }

    if (!activeBucket || !releaseSource) {
      toast({
        variant: "destructive",
        title: "Validation failed",
        description: "Please choose a release bucket and source first.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bucket: {
          id: activeBucket.id,
          region: activeBucket.region,
          city: activeBucket.city,
          depot: activeBucket.depot,
          sizeType: activeBucket.sizeType,
          condition: activeBucket.condition,
          color: activeBucket.color,
          machineType: activeBucket.machineType,
          hasFactoryOrder: activeBucket.hasFactoryOrder,
          hasNewOrUsedPurchase: activeBucket.hasNewOrUsedPurchase,
          depotInventoryQty: activeBucket.depotInventoryQty,
          pendingOutboundQty: activeBucket.pendingOutboundQty,
          availableDepotQty: activeBucket.availableDepotQty,
          plannedDispatchQty: activeBucket.plannedDispatchQty,
          plannableDepotQty: activeBucket.plannableDepotQty,
          pendingOfflineQty: activeBucket.pendingOfflineQty,
          totalPlannableQty: activeBucket.totalPlannableQty,
          totalAvailableQty: activeBucket.totalAvailableQty,
          earliestEstimatedOfflineDate: activeBucket.earliestEstimatedOfflineDate,
          earliestFreedayExpiryDate: activeBucket.earliestFreedayExpiryDate,
          shortageAlert: activeBucket.shortageAlert,
        },
        releaseSource,
        releaseNumber: draft.releaseNumber,
        vendorReleaseNumber: vendorSource?.vendorReleaseNumber ?? "",
        sourcePurchaseOrderId: vendorSource?.purchaseOrderId ?? "",
        sourcePurchaseOrderItemId: vendorSource?.purchaseOrderItemId ?? "",
        dispatchVendorId: draft.dispatchVendor,
        releaseDate: draft.releaseDate,
        polCityCode: draft.pol,
        podCityCode: draft.pod,
        dispatchPlanNo: draft.dispatchPlanNo,
        carrierPlanNo: draft.carrierPlanNo,
        onhireNo: draft.onhireNo,
        carrier: draft.carrier,
        dispatchArrangeDate: draft.dispatchArrangeDate,
        selfPickupDepotName: draft.selfPickupDepot,
        oneWayPlanId: sourcePlan?.id || initialContext.oneWayPlanId || "",
        releaseQty: draft.releaseQty,
        releaseMode: draft.releaseMode,
        containerSelectionMode: draft.containerSelectionMode,
        pickupCharge: draft.pickupCharge,
        dpp: draft.dpp,
        freeDays: draft.freeDays,
        rv: draft.rv,
        dailyRent: draft.dailyRent,
        headerCurrency: draft.headerCurrency,
        itemCostCurrency: draft.itemCostCurrency,
        truckingCost: isEditMode ? containerTruckingCostTotal.toFixed(2) : draft.truckingCost,
        handlingFee: draft.handlingFee,
        remarks: draft.remarks,
        selectedContainers:
          draft.containerSelectionMode === "SPECIFIED"
            ? resolvedContainerDateRows.map(({ row, pickupDate }) => ({
                id: row.id,
                purchaseOrderId: row.purchaseOrderId,
                purchaseOrderItemId: row.purchaseOrderItemId,
                containerId: row.containerId,
                containerNumber: row.containerNumber,
                pickupDate,
                truckingCost: resolveContainerFieldValue(
                  row.containerNumber,
                  containerTruckingCosts,
                  "0.00"
                ),
                truckingCostCurrency: resolveContainerFieldValue(
                  row.containerNumber,
                  containerTruckingCostCurrencies,
                  "USD"
                ),
                repairCost: resolveContainerFieldValue(
                  row.containerNumber,
                  containerRepairCosts,
                  "0.00"
                ),
                repairCostCurrency: resolveContainerFieldValue(
                  row.containerNumber,
                  containerRepairCostCurrencies,
                  "USD"
                ),
                damageClaim: resolveContainerFieldValue(
                  row.containerNumber,
                  containerDamageClaims,
                  "0.00"
                ),
                damageClaimCurrency: resolveContainerFieldValue(
                  row.containerNumber,
                  containerDamageClaimCurrencies,
                  "USD"
                ),
                remark: resolveContainerFieldValue(row.containerNumber, containerRemarks) || null,
              }))
            : [],
      };

      const result = isEditMode && editData
        ? await updateDispatchRelease({
            ...payload,
            transferOrderId: editData.transferOrderId,
          })
        : await createDispatchRelease(payload);

      toast({
        title: isEditMode ? "Dispatch Release updated" : "Dispatch Release created",
        description: `Release ${result.releaseNumber} saved successfully.`,
      });
      router.push(`/dispatch/dispatch-release/${result.transferOrderId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not create Dispatch Release",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
      {!showingForm ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl">Dispatch Release</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pick one dispatch availability bucket before creating a release.
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href="/depot-inventory/summary-for-dispatch">Back to Dispatch Availability</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                className="rounded-xl border bg-muted/20 px-4 py-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleBucketSearch();
                }}
              >
                <div className="mt-1 flex w-full items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left"
                      onClick={() => setFiltersCollapsed((current) => !current)}
                      aria-expanded={!filtersCollapsed}
                      aria-controls="dispatch-release-bucket-filters"
                    >
                      <div className="text-sm font-semibold">Bucket Picker Filters</div>
                      {filtersCollapsed ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    {filtersCollapsed && activeFiltersSummary ? (
                      <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">
                        {activeFiltersSummary}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={bucketLoading}>
                      <Search className="size-4" />
                      Search
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleBucketReset()}
                      disabled={bucketLoading}
                    >
                      <RotateCcw className="size-4" />
                      Reset
                    </Button>
                  </div>
                </div>

                {!filtersCollapsed ? (
                  <div
                    id="dispatch-release-bucket-filters"
                    className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"
                  >
                    <SearchableAutocompleteInput
                      label="Region"
                      placeholder="Fuzzy match region"
                      options={filterOptions.regions}
                      value={bucketFilters.region}
                      inputValue={bucketFilters.region}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, region: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, region: option?.value ?? "" }))
                      }
                    />
                    <SearchableAutocompleteInput
                      label="City"
                      placeholder="Fuzzy match city"
                      options={filterOptions.locations}
                      value={bucketFilters.city}
                      inputValue={bucketFilters.city}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, city: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, city: option?.value ?? "" }))
                      }
                    />
                    <SearchableAutocompleteInput
                      label="Depot"
                      placeholder="Fuzzy match depot"
                      options={filterOptions.depots}
                      value={bucketFilters.depot}
                      inputValue={bucketFilters.depot}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, depot: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, depot: option?.value ?? "" }))
                      }
                    />
                    <SearchableAutocompleteInput
                      label="Owner"
                      placeholder="Fuzzy match owner"
                      options={filterOptions.owners}
                      value={bucketFilters.owner}
                      inputValue={bucketFilters.owner}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, owner: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, owner: option?.value ?? "" }))
                      }
                    />
                    <SearchableAutocompleteInput
                      label="Size/Type"
                      placeholder="Fuzzy match size/type"
                      options={filterOptions.sizeTypes}
                      value={bucketFilters.sizeType}
                      inputValue={bucketFilters.sizeType}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, sizeType: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, sizeType: option?.value ?? "" }))
                      }
                    />
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Condition</Label>
                      <Select
                        value={bucketFilters.condition || "__all__"}
                        onValueChange={(value) =>
                          setBucketFilters((current) => ({
                            ...current,
                            condition: value === "__all__" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">All Conditions</SelectItem>
                          {filterOptions.conditionCodes.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <SearchableAutocompleteInput
                      label="Color"
                      placeholder="Fuzzy match color"
                      options={filterOptions.colors}
                      value={bucketFilters.color}
                      inputValue={bucketFilters.color}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, color: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({ ...current, color: option?.value ?? "" }))
                      }
                    />
                    <SearchableAutocompleteInput
                      label="Machine Type"
                      placeholder="Fuzzy match machine type"
                      options={filterOptions.machineTypes}
                      value={bucketFilters.machineType}
                      inputValue={bucketFilters.machineType}
                      onInputChange={(value) =>
                        setBucketFilters((current) => ({ ...current, machineType: value }))
                      }
                      onSelect={(option) =>
                        setBucketFilters((current) => ({
                          ...current,
                          machineType: option?.value ?? "",
                        }))
                      }
                    />
                  </div>
                ) : null}
              </form>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="text-lg">Dispatch Availability Buckets</CardTitle>
                    <div className="flex items-center gap-2 self-start">
                      <span className="text-sm text-muted-foreground">Page Size</span>
                      <Select
                        value={String(bucketResult.pageSize)}
                        onValueChange={(value) => void handleBucketPageSizeChange(Number(value))}
                      >
                        <SelectTrigger className="h-8 w-24 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 20, 50, 100].map((option) => (
                            <SelectItem key={option} value={String(option)}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Region</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Depot</TableHead>
                        <TableHead>Size/Type</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Machine Type</TableHead>
                        <TableHead className="text-right">Available Depot Qty</TableHead>
                        <TableHead className="text-right">Pending Offline/Release Qty</TableHead>
                        <TableHead className="text-right">Total Available Qty</TableHead>
                        <TableHead className="text-center">Earliest Freeday Expiry Date</TableHead>
                        <TableHead className="text-center">Source Mix</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bucketResult.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="h-24 text-center text-sm text-muted-foreground">
                            No dispatch availability buckets found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        bucketResult.rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{row.region}</TableCell>
                            <TableCell>{row.city}</TableCell>
                            <TableCell>{row.depot}</TableCell>
                            <TableCell>{row.sizeType}</TableCell>
                            <TableCell>{row.condition}</TableCell>
                            <TableCell>{row.color}</TableCell>
                            <TableCell>{row.machineType}</TableCell>
                            <TableCell className="text-right">{row.availableDepotQty}</TableCell>
                            <TableCell className="text-right">{row.pendingOfflineQty}</TableCell>
                            <TableCell className="text-right">{row.totalAvailableQty}</TableCell>
                            <TableCell className="text-center">{displayValue(row.earliestFreedayExpiryDate)}</TableCell>
                            <TableCell className="text-center">{buildSourceMixLabel(row)}</TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 px-3 text-sm"
                                onClick={() => handleChooseBucket(row)}
                              >
                                Select
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <StandardTablePagination
                  summary={`Showing ${showingStart}-${showingEnd} of ${bucketResult.totalCount} buckets`}
                  page={bucketResult.page}
                  totalPages={totalPages}
                  onPrevious={() => void handleBucketPageChange(Math.max(1, bucketResult.page - 1))}
                  onNext={() => void handleBucketPageChange(Math.min(totalPages, bucketResult.page + 1))}
                  previousDisabled={bucketLoading || bucketResult.page <= 1}
                  nextDisabled={bucketLoading || bucketResult.page >= totalPages}
                />
              </Card>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {isEditMode ? "Edit Dispatch Release" : "Create Dispatch Release"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditMode
                  ? "Review the current release and save your updates."
                  : "Review the source bucket and complete the release form."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isEditMode ? (
                <>
                  <Button variant="outline" onClick={handleChangeBucket}>
                    <ArrowLeft className="size-4" />
                    Change Bucket
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/depot-inventory/summary-for-dispatch">Back to Dispatch Availability</Link>
                  </Button>
                </>
              ) : (
                <Button asChild variant="outline">
                  <Link href={`/dispatch/dispatch-release/${editData?.transferOrderId ?? ""}`}>
                    Back to Dispatch Release
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <SectionCard title="Inventory Information">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div><span className="font-medium">Release Number:</span> {displayValue(draft.releaseNumber)}</div>
              {releaseSource === "VENDOR_REF" ? (
                <div><span className="font-medium">Vendor Release Number:</span> {formatVendorReleaseLabel(vendorSource)}</div>
              ) : (
                <div><span className="font-medium">Vendor Release Number:</span> -</div>
              )}
              <div><span className="font-medium">City:</span> {displayValue(activeBucket?.city)}</div>
              <div><span className="font-medium">Depot:</span> {displayValue(activeBucket?.depot)}</div>
              <div><span className="font-medium">Size/Type:</span> {displayValue(activeBucket?.sizeType)}</div>
              <div><span className="font-medium">Condition:</span> {displayValue(activeBucket?.condition)}</div>
              <div><span className="font-medium">Color:</span> {displayValue(activeBucket?.color)}</div>
              <div><span className="font-medium">Machine Type:</span> {displayValue(activeBucket?.machineType)}</div>
              <div><span className="font-medium">Total Source Qty:</span> {displayValue(totalSourceQty)}</div>
              <div>
                <span className="font-medium">Pending Offline/Release Qty:</span>{" "}
                {displayValue(activeBucket?.pendingOfflineQty)}
              </div>
              <div><span className="font-medium">Reserved by This Release:</span> {displayValue(reservedByThisReleaseQty)}</div>
              <div><span className="font-medium">Remaining Available Qty:</span> {displayValue(remainingAvailableQty)}</div>
            </div>
          </SectionCard>

          {releaseSource === "VENDOR_REF" ? (
            <SectionCard title="Vendor Release Documents">
              {vendorReleaseDocumentsLoading ? (
                <div className="text-sm text-muted-foreground">Loading vendor release documents...</div>
              ) : vendorReleaseDocuments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No Vendor Release documents were attached to the selected PO item.
                </div>
              ) : (
                <div className="space-y-2">
                  {vendorReleaseDocuments.map((document, index) => (
                    <div
                      key={document.id}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="font-medium">
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline"
                        >
                          Vendor Release Document {index + 1}
                        </a>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Remark: {displayValue(document.remark)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null}

          {sourcePlan ? (
            <SectionCard title="Source Plan">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div><span className="font-medium">Plan ID:</span> {displayValue(sourcePlan.planId)}</div>
                <div><span className="font-medium">Status:</span> {displayValue(sourcePlan.status)}</div>
                <div><span className="font-medium">Lessee:</span> {displayValue(sourcePlan.lesseeLabel)}</div>
                <div><span className="font-medium">Quantity:</span> {displayValue(sourcePlan.quantity)}</div>
                <div><span className="font-medium">POL:</span> {displayValue(sourcePlan.cityCode)}</div>
                <div><span className="font-medium">Depot:</span> {displayValue(sourcePlan.depotCode)}</div>
                <div><span className="font-medium">Size/Type:</span> {displayValue(sourcePlan.sizeType)}</div>
                <div><span className="font-medium">Condition:</span> {displayValue(sourcePlan.condition)}</div>
                <div><span className="font-medium">Color:</span> {displayValue(sourcePlan.color)}</div>
                <div><span className="font-medium">Machine Type:</span> {displayValue(sourcePlan.machineType)}</div>
                <div><span className="font-medium">Onhire No:</span> {displayValue(sourcePlan.onhireNo)}</div>
                <div className="md:col-span-2 xl:col-span-4">
                  <span className="font-medium">POD candidates:</span>{" "}
                  {displayValue(
                    sourcePlan.podCandidates.length > 0
                      ? sourcePlan.podCandidates.join(" / ")
                      : sourcePlan.pod
                  )}
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Dispatch Plan Reference">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Dispatch Plan No">
                <Input value={draft.dispatchPlanNo} onChange={(e) => updateDraft("dispatchPlanNo", e.target.value)} placeholder="Search or enter dispatch plan" />
              </FieldShell>
              <FieldShell label="Carrier Plan No">
                <Input value={draft.carrierPlanNo} onChange={(e) => updateDraft("carrierPlanNo", e.target.value)} placeholder="Enter carrier plan no" />
              </FieldShell>
              <SearchableAutocompleteInput
                label="Lessee *"
                placeholder="Choose lessee"
                options={lesseeOptions}
                value={draft.dispatchVendor}
                inputValue={lesseeInputValue}
                onInputChange={(value) => {
                  setLesseeInputValue(value);
                  if (draft.dispatchVendor) {
                    updateDraft("dispatchVendor", "");
                  }
                }}
                onSelect={(option) => {
                  updateDraft("dispatchVendor", option?.value ?? "");
                  setLesseeInputValue(formatLesseeDisplay(option));
                }}
                onClear={() => {
                  updateDraft("dispatchVendor", "");
                  setLesseeInputValue("");
                }}
              />
              <FieldShell label="Onhire No">
                <Input value={draft.onhireNo} onChange={(e) => updateDraft("onhireNo", e.target.value)} placeholder="Enter onhire no" />
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard title="Port and Dates">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <FieldShell label="Release Date *">
                <Input type="date" value={draft.releaseDate} onChange={(e) => updateDraft("releaseDate", e.target.value)} />
              </FieldShell>
              <SearchableAutocompleteInput
                label="POL *"
                placeholder="Choose POL"
                options={portCityOptions}
                value={draft.pol}
                inputValue={draft.pol}
                onInputChange={(value) => updateDraft("pol", value)}
                onSelect={(option) => updateDraft("pol", option?.value ?? "")}
              />
              <SearchableAutocompleteInput
                label="POD *"
                placeholder="Choose POD"
                options={portCityOptions}
                value={draft.pod}
                inputValue={draft.pod}
                onInputChange={(value) => updateDraft("pod", value)}
                onSelect={(option) => updateDraft("pod", option?.value ?? "")}
              />
              <FieldShell label="Carrier">
                <Input value={draft.carrier} onChange={(e) => updateDraft("carrier", e.target.value)} placeholder="Enter carrier" />
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard title="Header Cost Information">
            {isEditMode ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FieldShell label="Header Currency">
                  <Select
                    value={draft.headerCurrency}
                    onValueChange={(value) => updateDraft("headerCurrency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPATCH_RELEASE_CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell label="PUC">
                  <Input value={draft.pickupCharge} readOnly />
                </FieldShell>
                <FieldShell label="DPP">
                  <Input value={draft.dpp} readOnly />
                </FieldShell>
                <FieldShell label="RV">
                  <Input value={draft.rv} readOnly />
                </FieldShell>
                <FieldShell label="Free Day">
                  <Input value={draft.freeDays} readOnly />
                </FieldShell>
                <FieldShell label="Per Diem">
                  <Input value={draft.dailyRent} readOnly />
                </FieldShell>
                <FieldShell label="Trucking Cost Total Amount">
                  <Input value={convertedContainerTruckingCostTotal.toFixed(2)} readOnly />
                </FieldShell>
                <FieldShell label="Repair Cost Total Amount">
                  <Input value={convertedContainerRepairCostTotal.toFixed(2)} readOnly />
                </FieldShell>
                <FieldShell label="Repair Recovery Total Amount">
                  <Input value={convertedContainerDamageClaimTotal.toFixed(2)} readOnly />
                </FieldShell>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FieldShell label="Header Currency">
                  <Select
                    value={draft.headerCurrency}
                    onValueChange={(value) => updateDraft("headerCurrency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISPATCH_RELEASE_CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell label="Pick Up Charge *">
                  <ZeroClearingInput
                    value={draft.pickupCharge}
                    onChange={(value) => updateDraft("pickupCharge", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="DPP *">
                  <ZeroClearingInput
                    value={draft.dpp}
                    onChange={(value) => updateDraft("dpp", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="Free Days *">
                  <ZeroClearingInput
                    value={draft.freeDays}
                    onChange={(value) => updateDraft("freeDays", value)}
                    zeroValue="0"
                  />
                </FieldShell>
                <FieldShell label="RV (Return Value) *">
                  <ZeroClearingInput
                    value={draft.rv}
                    onChange={(value) => updateDraft("rv", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="Daily Rent *">
                  <ZeroClearingInput
                    value={draft.dailyRent}
                    onChange={(value) => updateDraft("dailyRent", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="Trucking Cost">
                  <ZeroClearingInput
                    value={draft.truckingCost}
                    onChange={(value) => updateDraft("truckingCost", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="Handling Fee">
                  <ZeroClearingInput
                    value={draft.handlingFee}
                    onChange={(value) => updateDraft("handlingFee", value)}
                    zeroValue="0.00"
                  />
                </FieldShell>
                <FieldShell label="Trucking Cost Total Amount">
                  <Input value="0.00" readOnly />
                </FieldShell>
                <FieldShell label="Repair Cost Total Amount">
                  <Input value="0.00" readOnly />
                </FieldShell>
                <FieldShell label="Repair Recovery Total Amount">
                  <Input value="0.00" readOnly />
                </FieldShell>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Release Information">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberStepperField
                label="Release Qty *"
                value={draft.releaseQty}
                onChange={(next) => updateDraft("releaseQty", next)}
                min={0}
                max={Math.max(0, effectiveSourceLimit)}
              />
              <FieldShell label="Release Mode *">
                <Select
                  value={draft.releaseMode}
                  onValueChange={(value) => updateDraft("releaseMode", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SELF_PICKUP">Self Pickup</SelectItem>
                    <SelectItem value="TRUCK_DELIVERY">Truck Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </FieldShell>
              <FieldShell label="Dispatch Arrange Date">
                <Input
                  type="date"
                  value={draft.dispatchArrangeDate}
                  onChange={(e) => updateDraft("dispatchArrangeDate", e.target.value)}
                />
              </FieldShell>
              <FieldShell label="Self Pickup Depot">
                <Input
                  value={draft.selfPickupDepot}
                  onChange={(e) => updateDraft("selfPickupDepot", e.target.value)}
                  placeholder="Enter self pickup depot"
                />
              </FieldShell>
            </div>
          </SectionCard>

          <SectionCard title="Container Selection">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={draft.containerSelectionMode === "UNSPECIFIED" ? "default" : "outline"}
                  onClick={() => updateDraft("containerSelectionMode", "UNSPECIFIED")}
                >
                  Unspecified Container Numbers
                </Button>
                <Button
                  type="button"
                  variant={draft.containerSelectionMode === "SPECIFIED" ? "default" : "outline"}
                  onClick={() => updateDraft("containerSelectionMode", "SPECIFIED")}
                >
                  Specified Container Numbers
                </Button>
              </div>

              {draft.containerSelectionMode === "UNSPECIFIED" ? (
                <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  When container numbers stay unspecified, the system will later allocate eligible containers
                  during outbound execution.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={draft.specifiedSelectionMethod === "INVENTORY" ? "default" : "outline"}
                      disabled={isSpecifiedSelectionFull}
                      onClick={() => updateDraft("specifiedSelectionMethod", "INVENTORY")}
                    >
                      Inventory Pick
                    </Button>
                    <Button
                      type="button"
                      variant={draft.specifiedSelectionMethod === "MANUAL" ? "default" : "outline"}
                      disabled={isSpecifiedSelectionFull}
                      onClick={() => updateDraft("specifiedSelectionMethod", "MANUAL")}
                    >
                      Manual Entry
                    </Button>
                    <Button
                      type="button"
                      variant={draft.specifiedSelectionMethod === "RANGE" ? "default" : "outline"}
                      disabled={isSpecifiedSelectionFull}
                      onClick={() => updateDraft("specifiedSelectionMethod", "RANGE")}
                    >
                      Range Entry
                    </Button>
                  </div>

                  {isSpecifiedSelectionFull ? (
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                      Specified container count already matches Release Qty. Increase Release Qty before adding
                      more containers.
                    </div>
                  ) : null}

                  {hasTooManySpecifiedContainers ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      Specified container count {resolvedSelection.actualRows.length} exceeds remaining Release Qty{" "}
                      {draft.releaseQty}. Please confirm container numbers.
                    </div>
                  ) : null}

                  {draft.specifiedSelectionMethod === "INVENTORY" ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="text-sm text-muted-foreground">
                          Pick eligible on-yard containers from the current release bucket.
                        </div>
                        <div className="flex w-full items-center gap-2 md:w-[340px]">
                          <Input
                            value={inventorySearch}
                            onChange={(event) => setInventorySearch(event.target.value)}
                            placeholder="Search container number, owner, depot"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border">
                        <div className="border-b bg-muted/20 px-4 py-2 text-sm text-muted-foreground">
                          Eligible: {selectableContainers.length} | Selected: {resolvedSelection.actualRows.length} | Required: {draft.releaseQty}
                        </div>
                        <div className="max-h-[360px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>Container Number</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Size/Type</TableHead>
                                <TableHead>Condition</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Machine Type</TableHead>
                                <TableHead>FLP/LB/EOD</TableHead>
                                {isEditMode ? <TableHead>Picked Up / Delivery Date</TableHead> : null}
                                {!isEditMode ? <TableHead>Gate In Date</TableHead> : null}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectableLoading ? (
                                <TableRow>
                                  <TableCell colSpan={isEditMode ? 10 : 10} className="h-24 text-center text-sm text-muted-foreground">
                                    Loading eligible containers...
                                  </TableCell>
                                </TableRow>
                              ) : filteredSelectableContainers.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={isEditMode ? 10 : 10} className="h-24 text-center text-sm text-muted-foreground">
                                    No eligible containers found for the current bucket.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredSelectableContainers.map((row) => {
                                  const checked = selectedInventoryRowIds.includes(row.id);
                                  return (
                                    <TableRow key={row.id} className={checked ? "bg-muted/30" : undefined}>
                                      <TableCell>
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => toggleInventoryRow(row.id, event.target.checked)}
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">{row.containerNumber}</TableCell>
                                      <TableCell>{row.owner}</TableCell>
                                      <TableCell>{row.sizeType}</TableCell>
                                      <TableCell>{row.condition}</TableCell>
                                      <TableCell>{row.color}</TableCell>
                                      <TableCell>{row.machineType}</TableCell>
                                      <TableCell>{row.flpLbeod}</TableCell>
                                      {isEditMode ? (
                                        <TableCell>
                                          {displayValue(
                                            pickupDateByContainerNumber.get(
                                              normalizeContainerNumber(row.containerNumber)
                                            ) ?? null
                                          )}
                                        </TableCell>
                                      ) : null}
                                      {!isEditMode ? <TableCell>{displayValue(row.gateInDate)}</TableCell> : null}
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {draft.specifiedSelectionMethod === "MANUAL" ? (
                    <div className="space-y-3">
                      <FieldShell label="Container Numbers">
                        <Textarea
                          rows={5}
                          value={draft.manualContainerNumbers}
                          onChange={(e) => updateDraft("manualContainerNumbers", e.target.value)}
                          placeholder="Paste text — container numbers will be detected automatically from mixed formats."
                        />
                      </FieldShell>
                      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                        <div className="font-medium">
                          Smart Paste Detected: {smartPastedManualNumbers.length}
                          {draft.releaseQty > 0 ? ` / Required ${draft.releaseQty}` : ""}
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {smartPastedManualNumbers.length > 0
                            ? smartPastedManualNumbers.join(", ")
                            : "No container numbers detected yet."}
                        </div>
                        {releaseSource === "VENDOR_REF" &&
                        resolvedSelection.manualCandidateNumbers.length > 0 ? (
                          <div className="mt-2 text-emerald-700">
                            Will be written back to source PO on save:{" "}
                            {resolvedSelection.manualCandidateNumbers.join(", ")}
                          </div>
                        ) : null}
                      </div>
                      {releaseSource === "VENDOR_REF" &&
                      (resolvedSelection.duplicateNumbers.length > 0 ||
                        resolvedSelection.invalidNumbers.length > 0) ? (
                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                          {resolvedSelection.duplicateNumbers.length > 0 ? (
                            <div className="text-amber-600">
                              Duplicate: {resolvedSelection.duplicateNumbers.join(", ")}
                            </div>
                          ) : null}
                          {resolvedSelection.invalidNumbers.length > 0 ? (
                            <div className={resolvedSelection.duplicateNumbers.length > 0 ? "mt-1 text-destructive" : "text-destructive"}>
                              Not found in current eligible inventory:{" "}
                              {resolvedSelection.invalidNumbers.join(", ")}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {draft.specifiedSelectionMethod === "RANGE" ? (
                    <div className="space-y-3">
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldShell label="Range Start">
                          <Input
                            value={draft.rangeStart}
                            onChange={(e) => updateDraft("rangeStart", e.target.value)}
                            placeholder="Enter start container number"
                          />
                        </FieldShell>
                        <FieldShell label="Range End">
                          <Input
                            value={draft.rangeEnd}
                            onChange={(e) => updateDraft("rangeEnd", e.target.value)}
                            placeholder="Enter end container number"
                          />
                        </FieldShell>
                      </div>
                      {resolvedSelection.rangeError ? (
                        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-destructive">
                          {resolvedSelection.rangeError}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {shouldShowPickupDateEditor ? (
                    <ContainerPickupDateEditor
                      rows={editableContainerDateRows}
                      batchPickupDate={selectionBatchPickupDate}
                      onBatchPickupDateChange={setSelectionBatchPickupDate}
                      onContainerPickupDateChange={updateResolvedContainerPickupDate}
                    />
                  ) : null}

                  {isEditMode && resolvedContainerDateRows.length > 0 ? (
                    <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">Container Item Costs</div>
                          <div className="text-xs text-muted-foreground">
                            Expand only when you need to record trucking cost, repair cost, or repair recovery.
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setContainerCostsCollapsed((current) => !current)}
                        >
                          {containerCostsCollapsed ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronUp className="size-4" />
                          )}
                          {containerCostsCollapsed ? "Expand" : "Collapse"}
                        </Button>
                      </div>
                      {!containerCostsCollapsed ? (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-muted-foreground">
                              Search one container number from the current specified container set to start recording costs.
                            </div>
                            <div className="flex w-full items-center gap-2 md:w-[420px]">
                              <div ref={costContainerSearchRef} className="relative flex-1">
                                <Input
                                  value={costContainerSearch}
                                  onFocus={() => setCostContainerSearchFocused(true)}
                                  onChange={(event) => {
                                    setCostContainerSearch(event.target.value);
                                    setCostContainerSearchFocused(true);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key === "ArrowDown") {
                                      event.preventDefault();
                                      if (filteredCostContainerNumbers.length === 0) return;
                                      setCostContainerSearchFocused(true);
                                      setCostContainerSuggestionIndex((current) =>
                                        current >= filteredCostContainerNumbers.length - 1 ? 0 : current + 1
                                      );
                                      return;
                                    }

                                    if (event.key === "ArrowUp") {
                                      event.preventDefault();
                                      if (filteredCostContainerNumbers.length === 0) return;
                                      setCostContainerSearchFocused(true);
                                      setCostContainerSuggestionIndex((current) =>
                                        current <= 0 ? filteredCostContainerNumbers.length - 1 : current - 1
                                      );
                                      return;
                                    }

                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      const highlightedContainer =
                                        filteredCostContainerNumbers[costContainerSuggestionIndex];
                                      if (costContainerSearchFocused && highlightedContainer) {
                                        addContainerItemCostRow(highlightedContainer);
                                        return;
                                      }
                                      addContainerItemCostRow();
                                      return;
                                    }

                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      setCostContainerSearchFocused(false);
                                    }
                                  }}
                                  placeholder="Search container number"
                                  className="h-9"
                                />
                                {costContainerSearchFocused ? (
                                  <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md">
                                    {filteredCostContainerNumbers.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        No matching specified container numbers.
                                      </div>
                                    ) : (
                                      <div className="max-h-60 overflow-auto py-1">
                                        {filteredCostContainerNumbers.map((containerNumber, index) => {
                                          const highlighted = index === costContainerSuggestionIndex;
                                          return (
                                            <button
                                              key={containerNumber}
                                              type="button"
                                              className={`flex w-full items-center px-3 py-2 text-left text-sm transition ${
                                                highlighted
                                                  ? "bg-accent text-accent-foreground"
                                                  : "hover:bg-accent/60"
                                              }`}
                                              onMouseDown={(event) => {
                                                event.preventDefault();
                                                addContainerItemCostRow(containerNumber);
                                              }}
                                              onMouseEnter={() => setCostContainerSuggestionIndex(index)}
                                            >
                                              {containerNumber}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => addContainerItemCostRow()}
                              >
                                Add
                              </Button>
                            </div>
                          </div>
                          <div className="overflow-x-auto rounded-md border bg-background">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-9 py-2">Container Number</TableHead>
                                  <TableHead className="h-9 py-2">Trucking Cost</TableHead>
                                  <TableHead className="h-9 py-2">Trucking Currency</TableHead>
                                  <TableHead className="h-9 py-2">Repair Cost</TableHead>
                                  <TableHead className="h-9 py-2">Repair Cost Currency</TableHead>
                                  <TableHead className="h-9 py-2">Repair Recovery</TableHead>
                                  <TableHead className="h-9 py-2">Repair Recovery Currency</TableHead>
                                  <TableHead className="h-9 py-2">Remark</TableHead>
                                  <TableHead className="h-9 py-2 text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {activeCostContainerRows.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={9} className="h-20 text-center text-sm text-muted-foreground">
                                      Search a specified container number to add it to the item cost table.
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  activeCostContainerRows.map(({ row }) => (
                                    <TableRow key={`cost-${row.id}`}>
                                      <TableCell className="py-2 font-medium">{row.containerNumber}</TableCell>
                                      <TableCell className="py-2">
                                        <ZeroClearingInput
                                          value={resolveContainerFieldValue(row.containerNumber, containerTruckingCosts, "0.00")}
                                          onChange={(value) =>
                                            updateResolvedContainerMoneyField(row.containerNumber, "trucking", value)
                                          }
                                          zeroValue="0.00"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Select
                                          value={resolveContainerFieldValue(
                                            row.containerNumber,
                                            containerTruckingCostCurrencies,
                                            "USD"
                                          )}
                                          onValueChange={(value) =>
                                            updateResolvedContainerCurrencyField(row.containerNumber, "trucking", value)
                                          }
                                        >
                                          <SelectTrigger className="h-9 min-w-[100px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {DISPATCH_RELEASE_CURRENCY_OPTIONS.map((currency) => (
                                              <SelectItem key={currency} value={currency}>
                                                {currency}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <ZeroClearingInput
                                          value={resolveContainerFieldValue(row.containerNumber, containerRepairCosts, "0.00")}
                                          onChange={(value) =>
                                            updateResolvedContainerMoneyField(row.containerNumber, "repair", value)
                                          }
                                          zeroValue="0.00"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Select
                                          value={resolveContainerFieldValue(
                                            row.containerNumber,
                                            containerRepairCostCurrencies,
                                            "USD"
                                          )}
                                          onValueChange={(value) =>
                                            updateResolvedContainerCurrencyField(row.containerNumber, "repair", value)
                                          }
                                        >
                                          <SelectTrigger className="h-9 min-w-[100px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {DISPATCH_RELEASE_CURRENCY_OPTIONS.map((currency) => (
                                              <SelectItem key={currency} value={currency}>
                                                {currency}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <ZeroClearingInput
                                          value={resolveContainerFieldValue(row.containerNumber, containerDamageClaims, "0.00")}
                                          onChange={(value) =>
                                            updateResolvedContainerMoneyField(row.containerNumber, "recovery", value)
                                          }
                                          zeroValue="0.00"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Select
                                          value={resolveContainerFieldValue(
                                            row.containerNumber,
                                            containerDamageClaimCurrencies,
                                            "USD"
                                          )}
                                          onValueChange={(value) =>
                                            updateResolvedContainerCurrencyField(row.containerNumber, "recovery", value)
                                          }
                                        >
                                          <SelectTrigger className="h-9 min-w-[100px]">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {DISPATCH_RELEASE_CURRENCY_OPTIONS.map((currency) => (
                                              <SelectItem key={currency} value={currency}>
                                                {currency}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Input
                                          value={resolveContainerFieldValue(row.containerNumber, containerRemarks)}
                                          onChange={(event) =>
                                            updateResolvedContainerRemark(row.containerNumber, event.target.value)
                                          }
                                          className="h-8 min-w-[180px]"
                                          placeholder="Enter remark"
                                        />
                                      </TableCell>
                                      <TableCell className="py-2 text-right">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeContainerItemCostRow(row.containerNumber)}
                                        >
                                          Remove
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {draft.releaseQty > 0 &&
                  draft.containerSelectionMode === "SPECIFIED" &&
                  hasTooManySpecifiedContainers ? (
                    <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-destructive">
                      Selected eligible container count cannot exceed Release Qty.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Other Information">
            <FieldShell label="Remarks">
              <Textarea
                rows={4}
                value={draft.remarks}
                onChange={(e) => updateDraft("remarks", e.target.value)}
                placeholder="Enter remarks"
              />
            </FieldShell>
          </SectionCard>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() =>
                router.push(
                  isEditMode
                    ? `/dispatch/dispatch-release/${editData?.transferOrderId ?? ""}`
                    : "/depot-inventory/summary-for-dispatch"
                )
              }
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={submitting}>
              <PackageCheck className="size-4" />
              {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Confirm Release"}
            </Button>
          </div>
        </>
      )}

      <Dialog open={Boolean(sourceSelectorRow)} onOpenChange={(open) => !open && setSourceSelectorRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Release Source</DialogTitle>
            <DialogDescription>
              Choose whether this release uses our depot inventory or references a vendor release.
            </DialogDescription>
          </DialogHeader>
          {sourceSelectorRow ? (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm md:grid-cols-2">
              <div><span className="font-medium">City:</span> {sourceSelectorRow.city}</div>
              <div><span className="font-medium">Depot:</span> {sourceSelectorRow.depot}</div>
              <div><span className="font-medium">Size/Type:</span> {sourceSelectorRow.sizeType}</div>
              <div><span className="font-medium">Condition:</span> {sourceSelectorRow.condition}</div>
              <div><span className="font-medium">Color:</span> {sourceSelectorRow.color}</div>
              <div><span className="font-medium">Machine Type:</span> {sourceSelectorRow.machineType}</div>
              <div><span className="font-medium">Available Depot Qty:</span> {sourceSelectorRow.availableDepotQty}</div>
              <div><span className="font-medium">Source Mix:</span> {buildSourceMixLabel(sourceSelectorRow)}</div>
            </div>
          ) : null}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setSourceSelectorRow(null)}>
              Cancel
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleSelectDepotInventory}>
                Depot Inventory
              </Button>
              <Button type="button" onClick={() => void handleSelectVendorReference()} disabled={vendorLoading}>
                Reference Vendor Release
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(vendorSelectorRow)} onOpenChange={(open) => !open && setVendorSelectorRow(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Vendor Release Selector</DialogTitle>
            <DialogDescription>
              Choose one vendor release source with remaining quantity greater than zero.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Vendor Release Number</TableHead>
                  <TableHead className="min-w-[140px]">Expiry Date</TableHead>
                  <TableHead>PO Item</TableHead>
                  <TableHead>Depot</TableHead>
                  <TableHead className="text-right">Total Qty</TableHead>
                  <TableHead className="text-right">Used Qty</TableHead>
                  <TableHead className="text-right">Remaining Qty</TableHead>
                  <TableHead className="text-center">Attachment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-sm text-muted-foreground">
                      No vendor release rows found for this bucket.
                    </TableCell>
                  </TableRow>
                ) : (
                  vendorRows.map((row) => (
                    <TableRow
                      key={row.purchaseOrderItemId}
                      className={
                        selectedVendorReleaseId === row.purchaseOrderItemId ? "bg-muted/40" : undefined
                      }
                    >
                      <TableCell>
                        <input
                          type="radio"
                          name="vendor-release-row"
                          checked={selectedVendorReleaseId === row.purchaseOrderItemId}
                          onChange={() => setSelectedVendorReleaseId(row.purchaseOrderItemId)}
                        />
                      </TableCell>
                      <TableCell>{formatVendorReleaseLabel(row)}</TableCell>
                      <TableCell className="min-w-[140px] whitespace-nowrap">{displayValue(row.expiryDate)}</TableCell>
                      <TableCell>{row.lineNo}</TableCell>
                      <TableCell>{row.depotName}</TableCell>
                      <TableCell className="text-right">{row.sourceTotalQty}</TableCell>
                      <TableCell className="text-right">{row.vendorReleaseUsedQty}</TableCell>
                      <TableCell className="text-right">{row.remainingQty}</TableCell>
                      <TableCell className="text-center">
                        {row.hasVendorReleaseAttachment ? "Yes" : "No"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setVendorSelectorRow(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleContinueVendorRelease} disabled={!selectedVendorReleaseId}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
