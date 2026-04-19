"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileDown,
  Package,
  PackageSearch,
  Pencil,
  Truck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  // PopoverPortal,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrangeToDepotModal } from "@/components/inventory/arrange-to-depot-modal";
import { BulkPasteUpdateModal, type BulkChange } from "@/components/inventory/bulk-paste-update-modal";
import { SaleToCustomerModal } from "@/components/inventory/sale-to-customer-modal";
import { toast } from "@/hooks/use-toast";
import { INVENTORY_IS_ADMIN } from "@/lib/inventory/inventory-config";
import { createBrowserClient } from "@/lib/supabase/client";
import { fetchInventoryData, updateInventoryData } from "@/lib/supabase/inventory-api";
import { cn } from "@/lib/utils";
import type { InventoryDateFilters, InventoryRow } from "@/types/inventory";

const CHECK_COL_PX = 40;
const STICKY_UNIT_LEFT = `${CHECK_COL_PX}px`;

const PAGE_SIZES = [20, 50, 100, 500] as const;
const EDITABLE_STATUS_OPTIONS = [
  "Unsold",
  "Gatebuy",
  "EW Depot",
  "Misuse",
  "Invoiced",
  "Consignment",
  "Other",
] as const;
const MOCK_USER = "OpsUser";

type EditableField =
  | "eta"
  | "pod"
  | "carrier"
  | "gateInRef"
  | "customerOrderNum"
  | "status"
  | "salesDate"
  | "salesRep"
  | "customer"
  | "price"
  | "depotName"
  | "actual_depot_id"
  | "remark1"
  | "remark2";
type NavigableField = keyof InventoryRow;
type DirtyCellMap = Record<string, string>;
type EditingCell = { rowId: string; field: EditableField };
type OptionsCache = {
  salesReps: string[];
  customers: string[];
  depots: { id: string; name: string }[];
};
type SelectionRect = {
  startR: number;
  startC: number;
  endR: number;
  endC: number;
};

export const EDITABLE_GRID_ORDER: EditableField[] = [
  "pod",
  "eta",
  "carrier",
  "status",
  "salesDate",
  "salesRep",
  "customer",
  "price",
  "customerOrderNum",
  "depotName",
  "gateInRef",
  "remark2",
  "remark1",
];

export const ALL_GRID_COLUMNS: (keyof InventoryRow)[] = [
  "unit",
  "specs",
  "condition",
  "color",
  "yom",
  "flpLbEod",
  "vents",
  "engine",
  "pod",
  "eta",
  "carrier",
  "status",
  "salesDate",
  "salesRep",
  "sales_region",
  "customer",
  "price",
  "customerOrderNum",
  "depotName",
  "gateInRef",
  "transitCompany",
  "pol",
  "onhire_no",
  "onhire_date",
  "cost",
  "remark2",
  "remark1",
];

const VALID_POD_CITIES = ["CNSHA", "VNSGN", "HKHKG", "USLAX", "DEHAM"] as const;
const DATE_SLASH_RE = /^\d{4}\/\d{1,2}\/\d{1,2}$/;

type FilterField = { key: keyof InventoryRow | "pic"; label: string };

const ROW_CORE_FILTERS: FilterField[] = [
  { key: "specs", label: "Size/Type" },
  { key: "condition", label: "Condition" },
  { key: "color", label: "Color" },
  { key: "engine", label: "Machine Type" },
  { key: "status", label: "Status" },
];

const ROW_LOGISTICS_FILTERS: FilterField[] = [
  { key: "pol", label: "POL" },
  { key: "pod", label: "POD" },
  { key: "carrier", label: "Carrier" },
  { key: "transitCompany", label: "Lessee" },
  { key: "onhire_no", label: "Onhire#" },
];

const ROW_SALES_FILTERS: FilterField[] = [
  { key: "salesRep", label: "SalesRep" },
  { key: "pic", label: "PIC" },
  { key: "sales_region", label: "Sales Region" },
  { key: "customer", label: "CUSTOMER" },
  { key: "customerOrderNum", label: "CUSTOMERORDER No." },
];

type SortableColumn = Exclude<
  keyof InventoryRow,
  "id" | "size" | "type"
>;

const EMPTY_DATES: InventoryDateFilters = {
  etaFrom: "",
  etaTo: "",
  salesDateFrom: "",
  salesDateTo: "",
  onHireFrom: "",
  onHireTo: "",
};

function InventoryFilterInput({
  field,
  value,
  onChange,
  onEnter,
}: {
  field: FilterField;
  value: string;
  onChange: (key: keyof InventoryRow | "pic", value: string) => void;
  onEnter?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      <label
        className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
        htmlFor={`flt-${String(field.key)}`}
      >
        {field.label}
      </label>
      <Input
        id={`flt-${String(field.key)}`}
        className="h-8 text-xs"
        placeholder="Contains…"
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    </div>
  );
}

function extractUnitCodes(raw: string): string[] {
  // Matches 4 letters, optional spaces, 5-6 digits, optional space/hyphen, optional 1 digit
  const regex = /[A-Z]{4}[\s]*\d{5,6}[\s-]*\d{0,1}/gi;
  const matches = raw.match(regex);
  if (!matches?.length) return [];
  // Clean the matches by removing all spaces and hyphens, and uppercase them
  return Array.from(
    new Set(matches.map((m) => m.replace(/[\s-]/g, "").toUpperCase()))
  );
}

function isEtaStale(eta: string): boolean {
  const d = new Date(`${eta}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) / 86_400_000 >= 14;
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2,
  }).format(n);
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function appendRemark(existing: string, remark: string): string {
  const text = remark.trim();
  if (!text) return existing;
  const prefixed = `[${todayStamp()} ${MOCK_USER}] ${text}`;
  return existing ? `${existing}\n${prefixed}` : prefixed;
}

function inferDepotFromCustomer(customer: string): string {
  const base = customer.trim() || "Customer";
  return `${base} Default Depot`;
}

function dirtyKey(rowId: string, field: EditableField): string {
  return `${rowId}::${field}`;
}

function parseDirtyKey(key: string): { rowId: string; field: EditableField } | null {
  const [rowId, field] = key.split("::");
  if (!rowId || !field) return null;
  return { rowId, field: field as EditableField };
}

function rowFieldToString(row: InventoryRow, field: NavigableField): string {
  if (field === "price") return String(row.price);
  return String(row[field] ?? "");
}

function shallowMapEqual(a: DirtyCellMap, b: DirtyCellMap): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

const CSV_HEADERS: string[] = [
  "Unit#",
  "Specs",
  "Condition",
  "Color",
  "YOM",
  "FLP/LB/EOD",
  "Engine",
  "POD",
  "ETA",
  "Carrier",
  "Status",
  "SalesDate",
  "SalesRep",
  "Sales Region",
  "Customer",
  "Price",
  "CustomerOrder#",
  "DepotName",
  "DepotAddr",
  "DepotTel",
  "Gate-in Ref",
  "调运公司",
  "POL",
  "OnHire#",
  "OnHireDate",
  "Cost",
  "Other Redelivery Instruction",
  "Followup Remark",
];

function rowToCsvCells(row: InventoryRow, includeCost: boolean): string[] {
  const cells = [
    row.unit,
    row.specs,
    row.condition,
    row.color,
    row.yom,
    row.flpLbEod,
    row.engine,
    row.pod,
    row.eta,
    row.carrier,
    row.status,
    row.salesDate,
    row.salesRep,
    row.sales_region,
    row.customer,
    String(row.price),
    row.customerOrderNum,
    row.depotName,
    row.depotAddr,
    row.depotTel,
    row.gateInRef,
    row.transitCompany,
    row.pol,
    row.onhire_no,
    row.onhire_date,
  ];
  if (includeCost) cells.push(String(row.cost));
  cells.push(row.remark2);
  cells.push(row.remark1);
  return cells.map((c) => csvEscape(String(c)));
}

function compareByColumn(
  a: InventoryRow,
  b: InventoryRow,
  key: SortableColumn,
  dir: 1 | -1
): number {
  const va = a[key];
  const vb = b[key];
  if (key === "price" || key === "cost") {
    return (Number(va) - Number(vb)) * dir;
  }
  const sa = String(va ?? "").toLowerCase();
  const sb = String(vb ?? "").toLowerCase();
  if (sa < sb) return -1 * dir;
  if (sa > sb) return 1 * dir;
  return 0;
}

const cellCn =
  "border-r border-border px-2 py-1 align-middle text-[11px] leading-tight whitespace-nowrap";
const headCn =
  "border-r border-border px-2 py-1 text-left align-middle text-[10px] font-semibold leading-tight";

type SortHeaderProps = {
  label: React.ReactNode;
  colKey: SortableColumn;
  sortKey: SortableColumn;
  sortDir: 1 | -1;
  onSort: (k: SortableColumn) => void;
  className?: string;
  headerSticky: string;
};

function SortHeader({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
  headerSticky,
}: SortHeaderProps) {
  const active = sortKey === colKey;
  return (
    <th
      className={cn("sticky top-0 z-20", headCn, headerSticky, className)}
    >
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className="flex w-full items-center justify-start gap-0.5 rounded px-0.5 py-0 text-left hover:bg-muted/80"
      >
        <span className="min-w-0 flex-1 break-words">{label}</span>
        {active ? (
          sortDir === 1 ? (
            <ArrowUp className="size-3 shrink-0 text-primary" aria-hidden />
          ) : (
            <ArrowDown className="size-3 shrink-0 text-primary" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-3 shrink-0 opacity-35" aria-hidden />
        )}
      </button>
    </th>
  );
}

function DateRangeGroup({
  label,
  from,
  to,
  onFrom,
  onTo,
  onEnter,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onEnter?: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <label className="shrink-0 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-1 items-center gap-1.5">
        <Input
          type="date"
          className="h-8 flex-1 px-2 text-xs"
          value={from}
          onChange={(e) => onFrom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              onEnter();
            }
          }}
        />
        <span className="shrink-0 select-none text-muted-foreground" aria-hidden>
          –
        </span>
        <Input
          type="date"
          className="h-8 flex-1 px-2 text-xs"
          value={to}
          onChange={(e) => onTo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) {
              onEnter();
            }
          }}
        />
      </div>
    </div>
  );
}

type DataRowProps = {
  row: InventoryRow;
  rowIndex: number;
  selected: boolean;
  onToggle: (id: string) => void;
  isAdmin: boolean;
  editingCell: EditingCell | null;
  editValue: string;
  dirtyCells: DirtyCellMap;
  invalidCells: DirtyCellMap;
  selection: SelectionRect | null;
  activeColumns: NavigableField[];
  onStartEdit: (rowId: string, field: EditableField, initialValue: string) => void;
  onEditValueChange: (v: string) => void;
  onStageEdit: (rowId: string, field: EditableField, value: string) => void;
  onCancelEdit: () => void;
  onFocusCell: (rowId: string, field: NavigableField) => void;
  onSelectDepot: (rowId: string, depotId: string | null, depotName: string) => void;
  onCellPaste: (
    e: React.ClipboardEvent<HTMLElement>,
    rowId: string,
    field: NavigableField
  ) => void;
  optionsCache: OptionsCache;
};

type GridCellProps = {
  rowId: string;
  rowIndex: number;
  colIndex: number;
  field: NavigableField;
  isEditable: boolean;
  value: string;
  editingCell: EditingCell | null;
  editValue: string;
  dirtyCells: DirtyCellMap;
  invalidCells: DirtyCellMap;
  selection: SelectionRect | null;
  tdClassName?: string;
  displayClassName?: string;
  displayValue?: string;
  tdStyle?: React.CSSProperties;
  onStartEdit: (rowId: string, field: EditableField, initialValue: string) => void;
  onEditValueChange: (v: string) => void;
  onStageEdit: (rowId: string, field: EditableField, value: string) => void;
  onCancelEdit: () => void;
  onFocusCell: (rowId: string, field: NavigableField) => void;
  onSelectDepot?: (rowId: string, depotId: string | null, depotName: string) => void;
  onCellPaste: (
    e: React.ClipboardEvent<HTMLElement>,
    rowId: string,
    field: NavigableField
  ) => void;
  titleValue?: string;
  tooltipContent?: React.ReactNode;
  optionsCache?: OptionsCache;
};

function GridCell({
  rowId,
  rowIndex,
  colIndex,
  field,
  isEditable,
  value,
  editingCell,
  editValue,
  dirtyCells,
  invalidCells,
  selection,
  tdClassName,
  displayClassName,
  displayValue,
  tdStyle,
  onStartEdit,
  onEditValueChange,
  onStageEdit,
  onCancelEdit,
  onFocusCell,
  onSelectDepot,
  onCellPaste,
  titleValue,
  tooltipContent,
  optionsCache,
}: GridCellProps) {
  const active =
    isEditable && editingCell?.rowId === rowId && editingCell.field === field;
  const key =
    isEditable && EDITABLE_GRID_ORDER.includes(field as EditableField)
      ? dirtyKey(rowId, field as EditableField)
      : "";
  const dirtyValue = key ? dirtyCells[key] : undefined;
  const hasDirty = dirtyValue != null;
  const hasError = invalidCells[key] != null;
  const minR = selection ? Math.min(selection.startR, selection.endR) : -1;
  const maxR = selection ? Math.max(selection.startR, selection.endR) : -1;
  const minC = selection ? Math.min(selection.startC, selection.endC) : -1;
  const maxC = selection ? Math.max(selection.startC, selection.endC) : -1;
  const inSelection =
    selection != null &&
    rowIndex >= minR &&
    rowIndex <= maxR &&
    colIndex >= minC &&
    colIndex <= maxC;
  const isCursor =
    selection != null &&
    rowIndex === selection.endR &&
    colIndex === selection.endC;
  const effectiveValue = hasDirty ? dirtyValue : value;
  const isSearchableLookupField =
    field === "salesRep" || field === "customer" || field === "depotName";
  const depotLookupOptions = useMemo(
    () => (field === "depotName" ? optionsCache?.depots ?? [] : []),
    [field, optionsCache]
  );
  const lookupOptions = useMemo(
    () =>
      field === "salesRep"
        ? optionsCache?.salesReps ?? []
        : field === "customer"
          ? optionsCache?.customers ?? []
          : field === "depotName"
            ? depotLookupOptions.map((d) => d.name)
          : [],
    [depotLookupOptions, field, optionsCache]
  );
  const filteredLookupOptions = useMemo(() => {
    const q = editValue.trim().toLowerCase();
    if (!q) return lookupOptions;
    return lookupOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [editValue, lookupOptions]);
  const [highlightedLookupIndex, setHighlightedLookupIndex] = useState(0);
  const lookupInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!active || !isSearchableLookupField) return;
    setHighlightedLookupIndex(0);
    window.setTimeout(() => {
      lookupInputRef.current?.focus();
      lookupInputRef.current?.select();
    }, 0);
  }, [active, isSearchableLookupField, rowId, field]);
  useEffect(() => {
    if (highlightedLookupIndex > filteredLookupOptions.length - 1) {
      setHighlightedLookupIndex(0);
    }
  }, [highlightedLookupIndex, filteredLookupOptions.length]);
  const inputType = "text";
  const commitLookupSelection = useCallback(
    (selectedName: string) => {
      if (field === "depotName" && onSelectDepot) {
        const normalized = selectedName.trim().toLowerCase();
        const matchedDepot =
          depotLookupOptions.find((d) => d.name.trim().toLowerCase() === normalized) ?? null;
        onSelectDepot(rowId, matchedDepot?.id ?? null, selectedName);
      } else {
        onStageEdit(rowId, field as EditableField, selectedName);
      }
      onCancelEdit();
    },
    [depotLookupOptions, field, onCancelEdit, onSelectDepot, onStageEdit, rowId]
  );

  return (
    <td
      style={tdStyle}
      className={cn(
        cellCn,
        tdClassName,
        "cursor-cell",
        active && "!p-0",
        hasDirty && "bg-yellow-100 dark:bg-yellow-950/20",
        hasDirty && !hasError && "border border-blue-400",
        hasError && "border border-red-500",
        inSelection && "bg-blue-100/40 dark:bg-blue-900/30",
        isCursor && !active && "ring-2 ring-blue-500 z-10",
        isCursor && active && "ring-1 ring-primary/60"
      )}
      onClick={() => onFocusCell(rowId, field)}
      onDoubleClick={() => {
        if (!isEditable) return;
        onStartEdit(rowId, field as EditableField, effectiveValue);
      }}
      onPaste={(e) => onCellPaste(e, rowId, field)}
      data-row-index={rowIndex}
      data-col-key={field}
      title={titleValue ?? effectiveValue}
    >
      {active ? (
        field === "status" ? (
          <Select
            value={editValue || effectiveValue}
            onValueChange={(next) => {
              onStageEdit(rowId, field as EditableField, next);
              onCancelEdit();
            }}
          >
            <SelectTrigger
              className="h-full w-full rounded-none border-0 px-2 text-sm focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onStageEdit(rowId, field as EditableField, editValue || effectiveValue);
                  onCancelEdit();
                }
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EDITABLE_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : isSearchableLookupField ? (
          <Popover open={active}>
            <PopoverTrigger asChild>
              <div className="relative h-full min-h-[24px]">
                <Input
                  ref={lookupInputRef}
                  autoFocus
                  type="text"
                  className={cn(
                    "absolute inset-0 h-full w-full rounded-none border-0 px-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-400",
                    displayClassName
                  )}
                  value={editValue}
                  onPaste={(e) => onCellPaste(e, rowId, field)}
                  onChange={(e) => onEditValueChange(e.target.value)}
                  onBlur={(e) => {
                    if (!e.relatedTarget) {
                      commitLookupSelection(editValue);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      e.stopPropagation();
                      setHighlightedLookupIndex((prev) =>
                        Math.min(prev + 1, Math.max(0, filteredLookupOptions.length - 1))
                      );
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      e.stopPropagation();
                      setHighlightedLookupIndex((prev) => Math.max(prev - 1, 0));
                      return;
                    }
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                      const selected =
                        filteredLookupOptions[highlightedLookupIndex] ?? editValue;
                      commitLookupSelection(selected);
                      return;
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      onCancelEdit();
                    }
                  }}
                />
              </div>
            </PopoverTrigger>
              <PopoverContent
                align="start"
                className="z-[100] w-[var(--radix-popover-trigger-width)] min-w-[220px] bg-popover p-1"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-h-56 overflow-auto">
                  {filteredLookupOptions.length === 0 ? (
                    <p className="p-2 text-xs text-muted-foreground">
                      No matches. Press Enter to use custom input.
                    </p>
                  ) : (
                    filteredLookupOptions.map((option, idx) => {
                      const isCurrent = option === (editValue || effectiveValue);
                      const isHighlighted = idx === highlightedLookupIndex;
                      return (
                        <button
                          key={`${field}-${option}-${idx}`}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                            isHighlighted ? "bg-accent" : "hover:bg-accent"
                          )}
                          onMouseEnter={() => setHighlightedLookupIndex(idx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            commitLookupSelection(option);
                          }}
                        >
                          <Check
                            className={cn("size-4", isCurrent ? "opacity-100" : "opacity-0")}
                          />
                          <span className="truncate">{option}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
          </Popover>
        ) : (
          <div className="relative h-full min-h-[24px]">
            <Input
              autoFocus
              type={inputType}
              className={cn(
                "absolute inset-0 h-full w-full rounded-none border-0 px-2 text-sm focus-visible:ring-2 focus-visible:ring-blue-400",
                displayClassName
              )}
              value={editValue}
              onPaste={(e) => onCellPaste(e, rowId, field)}
              onChange={(e) => onEditValueChange(e.target.value)}
              onBlur={() => {
                onStageEdit(rowId, field as EditableField, editValue);
                onCancelEdit();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onStageEdit(rowId, field as EditableField, editValue);
                  onCancelEdit();
                }
                if (e.key === "Escape") onCancelEdit();
              }}
            />
          </div>
        )
      ) : tooltipContent ? (
        <TooltipProvider delayDuration={120}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn("group relative min-h-[24px] overflow-hidden pr-4 text-sm", displayClassName)}
              >
                <span>{displayValue ?? (effectiveValue || "—")}</span>
                <Pencil className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {tooltipContent}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <div className={cn("group relative min-h-[24px] overflow-hidden pr-4 text-sm", displayClassName)}>
          <span>{displayValue ?? (effectiveValue || "—")}</span>
          <Pencil className="pointer-events-none absolute right-0 top-1/2 size-3 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-50" />
        </div>
      )}
    </td>
  );
}

const InventoryDataRow = React.memo(function InventoryDataRow({
  row,
  rowIndex,
  selected,
  onToggle,
  isAdmin,
  editingCell,
  editValue,
  dirtyCells,
  invalidCells,
  selection,
  activeColumns,
  onStartEdit,
  onEditValueChange,
  onStageEdit,
  onCancelEdit,
  onFocusCell,
  onSelectDepot,
  onCellPaste,
  optionsCache,
}: DataRowProps) {
  const depotNameDisplay = row.actual_depot?.depot_name || row.planned_depot_name || "";
  const depotAddressDisplay = row.actual_depot?.depot_address || "-";
  const depotTelDisplay = row.actual_depot?.depot_tel || "-";
  const podDisplay = row.pod_city?.city_name || row.pod || "";

  return (
    <tr className="border-b border-border bg-background hover:bg-muted/30">
      <td
        className={cn(
          "sticky left-0 z-[30] border-r border-border bg-background px-1 py-0.5 text-center",
          cellCn
        )}
        style={{ width: CHECK_COL_PX }}
      >
        <input
          type="checkbox"
          className="size-3.5 rounded border-input accent-primary"
          aria-label={`Select ${row.unit}`}
          checked={selected}
          onChange={() => onToggle(row.id)}
        />
      </td>
      <GridCell
        rowId={row.id}
        field="unit"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("unit")}
        isEditable={false}
        value={row.unit}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName={cn(
          "sticky z-[30] border-r border-border bg-background font-mono text-[11px] font-medium",
          "shadow-[4px_0_12px_-6px_rgba(0,0,0,0.18)]"
        )}
        tdStyle={{ left: STICKY_UNIT_LEFT }}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onSelectDepot={onSelectDepot}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="specs"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("specs")}
        isEditable={false}
        value={row.specs}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="condition"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("condition")}
        isEditable={false}
        value={row.condition}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="color"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("color")}
        isEditable={false}
        value={row.color}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="yom"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("yom")}
        isEditable={false}
        value={row.yom}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="flpLbEod"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("flpLbEod")}
        isEditable={false}
        value={row.flpLbEod}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="vents"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("vents")}
        isEditable={false}
        value={row.vents || ""}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="engine"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("engine")}
        isEditable={false}
        value={row.engine}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        field="pod"
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("pod")}
        isEditable={true}
        value={podDisplay}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("eta")}
        field="eta"
        isEditable={true}
        value={row.eta}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName={cn(
          "font-mono",
          isEtaStale(row.eta) &&
            "bg-red-50 font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400"
        )}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("carrier")}
        field="carrier"
        isEditable={true}
        value={row.carrier}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("status")}
        field="status"
        isEditable={true}
        value={row.status}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("salesDate")}
        field="salesDate"
        isEditable={true}
        value={row.salesDate}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("salesRep")}
        field="salesRep"
        isEditable={true}
        value={row.salesRep}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
        optionsCache={optionsCache}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("sales_region")}
        field="sales_region"
        isEditable={false}
        value={row.sales_region}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("customer")}
        field="customer"
        isEditable={true}
        value={row.customer}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
        optionsCache={optionsCache}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("price")}
        field="price"
        isEditable={true}
        value={String(row.price)}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="text-right font-mono tabular-nums"
        displayValue={formatUsd(Number(dirtyCells[dirtyKey(row.id, "price")] ?? row.price))}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("customerOrderNum")}
        field="customerOrderNum"
        isEditable={true}
        value={row.customerOrderNum}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("depotName")}
        field="depotName"
        isEditable={true}
        value={depotNameDisplay}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tooltipContent={
          <div className="space-y-1 text-xs">
            <p>
              <span className="font-medium">Address:</span> {depotAddressDisplay}
            </p>
            <p>
              <span className="font-medium">Tel:</span> {depotTelDisplay}
            </p>
          </div>
        }
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("gateInRef")}
        field="gateInRef"
        isEditable={true}
        value={row.gateInRef}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("transitCompany")}
        field="transitCompany"
        isEditable={false}
        value={row.transitCompany}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("pol")}
        field="pol"
        isEditable={false}
        value={row.pol ?? ""}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("onhire_no")}
        field="onhire_no"
        isEditable={false}
        value={row.onhire_no}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("onhire_date")}
        field="onhire_date"
        isEditable={false}
        value={row.onhire_date}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="font-mono text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
      />
      {isAdmin && (
        <GridCell
          rowId={row.id}
          rowIndex={rowIndex}
          colIndex={activeColumns.indexOf("cost")}
          field="cost"
          isEditable={false}
          value={String(row.cost)}
          displayValue={formatUsd(row.cost)}
          editingCell={editingCell}
          editValue={editValue}
          dirtyCells={dirtyCells}
          invalidCells={invalidCells}
          selection={selection}
          tdClassName="text-right font-mono tabular-nums text-muted-foreground"
          onStartEdit={onStartEdit}
          onEditValueChange={onEditValueChange}
          onStageEdit={onStageEdit}
          onCancelEdit={onCancelEdit}
          onFocusCell={onFocusCell}
          onCellPaste={onCellPaste}
        />
      )}
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("remark2")}
        field="remark2"
        isEditable={true}
        value={row.remark2}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="w-[150px] max-w-[150px] overflow-hidden truncate whitespace-nowrap text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
        titleValue={row.remark2}
      />
      <GridCell
        rowId={row.id}
        rowIndex={rowIndex}
        colIndex={activeColumns.indexOf("remark1")}
        field="remark1"
        isEditable={true}
        value={row.remark1}
        editingCell={editingCell}
        editValue={editValue}
        dirtyCells={dirtyCells}
        invalidCells={invalidCells}
        selection={selection}
        tdClassName="w-[150px] max-w-[150px] overflow-hidden truncate whitespace-nowrap text-muted-foreground"
        onStartEdit={onStartEdit}
        onEditValueChange={onEditValueChange}
        onStageEdit={onStageEdit}
        onCancelEdit={onCancelEdit}
        onFocusCell={onFocusCell}
        onCellPaste={onCellPaste}
        titleValue={row.remark1}
      />
    </tr>
  );
});

export function InventoryCommandCenter() {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedDbUnits, setSearchedDbUnits] = useState<Set<string>>(
    () => new Set()
  );
  const [optionsCache, setOptionsCache] = useState<OptionsCache>({
    salesReps: [],
    customers: [],
    depots: [],
  });

  const [smartPaste, setSmartPaste] = useState("");
  const [textFilters, setTextFilters] = useState<Record<string, string>>({});
  const [dateFilters, setDateFilters] =
    useState<InventoryDateFilters>(EMPTY_DATES);
  const [isSearchVisible, setIsSearchVisible] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [topNInput, setTopNInput] = useState("");
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [arrangeModalOpen, setArrangeModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [dirtyCells, setDirtyCells] = useState<DirtyCellMap>({});
  const [invalidCells, setInvalidCells] = useState<DirtyCellMap>({});
  const [isSavingDirty, setIsSavingDirty] = useState(false);
  const [history, setHistory] = useState<{ dirty: DirtyCellMap; errors: DirtyCellMap }[]>([]);
  const auditLogsRef = useRef<string[]>([]);

  const [sortKey, setSortKey] = useState<SortableColumn>("unit");
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50);
  const activeColumns = useMemo(
    () => ALL_GRID_COLUMNS.filter((c) => INVENTORY_IS_ADMIN || c !== "cost"),
    [INVENTORY_IS_ADMIN]
  );

  const filterSignature = useMemo(
    () => JSON.stringify({ smartPaste, textFilters, dateFilters }),
    [smartPaste, textFilters, dateFilters]
  );
  const prevSig = useRef(filterSignature);
  useEffect(() => {
    if (prevSig.current !== filterSignature) {
      prevSig.current = filterSignature;
      setPage(0);
    }
  }, [filterSignature]);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserClient();

    async function preloadLookupOptions() {
      try {
        const [{ data: users }, { data: customers }, { data: depots }] = await Promise.all([
          supabase
            .from("users")
            .select("full_name")
            .not("full_name", "is", null),
          supabase
            .from("customers")
            .select("company_name")
            .not("company_name", "is", null),
          supabase
            .from("depots")
            .select("id, depot_name")
            .not("depot_name", "is", null),
        ]);
        if (!active) return;
        const salesReps = Array.from(
          new Set((users ?? []).map((u) => String(u.full_name ?? "").trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        const customerNames = Array.from(
          new Set(
            (customers ?? [])
              .map((c) => String(c.company_name ?? "").trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        const depotOptions = (depots ?? [])
          .map((d) => ({
            id: String((d as { id?: string | null }).id ?? "").trim(),
            name: String((d as { depot_name?: string | null }).depot_name ?? "").trim(),
          }))
          .filter((d) => d.id.length > 0 && d.name.length > 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        setOptionsCache({ salesReps, customers: customerNames, depots: depotOptions });
      } catch (error) {
        console.error("Failed to preload SalesRep/Customer/Depot options:", error);
      }
    }

    void preloadLookupOptions();
    return () => {
      active = false;
    };
  }, []);

  const pasteUnits = useMemo(
    () => extractUnitCodes(smartPaste),
    [smartPaste]
  );
  const missingPasteUnits = useMemo(
    () => (hasSearched ? pasteUnits.filter((u) => !searchedDbUnits.has(u)) : []),
    [hasSearched, pasteUnits, searchedDbUnits]
  );
  const missingListText = useMemo(() => {
    if (missingPasteUnits.length === 0) return "—";
    return missingPasteUnits.join(", ");
  }, [missingPasteUnits]);

  const handleSearch = useCallback(async () => {
    setHasSearched(true);
    const hasTextCriteria = Object.values(textFilters).some(
      (v) => v.trim().length > 0
    );
    const hasDateCriteria = Object.values(dateFilters).some(
      (v) => v.trim().length > 0
    );
    const hasPasteCriteria = pasteUnits.length > 0;

    if (!hasPasteCriteria && !hasTextCriteria && !hasDateCriteria) {
      toast({
        title: "Please enter at least one search criteria.",
        variant: "destructive",
      });
      return;
    }

    const validateDateRange = (from: string, to: string, label: string): string | null => {
      if (from && Number.isNaN(new Date(from).getTime())) {
        return `Invalid 'From' date in ${label}.`;
      }
      if (to && Number.isNaN(new Date(to).getTime())) {
        return `Invalid 'To' date in ${label}.`;
      }
      if (from && to && new Date(from) > new Date(to)) {
        return `${label}: 'From' date cannot be later than 'To' date.`;
      }
      return null;
    };

    const dateErrors = [
      validateDateRange(dateFilters.etaFrom, dateFilters.etaTo, "ETA"),
      validateDateRange(
        dateFilters.salesDateFrom,
        dateFilters.salesDateTo,
        "Sales Date"
      ),
      validateDateRange(dateFilters.onHireFrom, dateFilters.onHireTo, "On Hire"),
    ].filter((v): v is string => Boolean(v));

    if (dateErrors.length > 0) {
      toast({
        title: "Invalid Date Filter",
        description: dateErrors[0],
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setIsSearchVisible(false);
    try {
      const data = await fetchInventoryData({
        pasteUnits,
        textFilters,
        dateFilters,
      });
      setInventory(data);
      setSearchedDbUnits(new Set(data.map((r) => r.unit.toUpperCase())));
    } catch (error) {
      console.error("Failed to fetch inventory:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pasteUnits, textFilters, dateFilters]);

  const sortedRows = useMemo(() => {
    const copy = [...inventory];
    copy.sort((a, b) => compareByColumn(a, b, sortKey, sortDir));
    return copy;
  }, [inventory, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageStart = safePage * pageSize;
  const pageRows = sortedRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  const onSort = useCallback(
    (k: SortableColumn) => {
      if (k === sortKey) {
        setSortDir((d) => (d === 1 ? -1 : 1));
      } else {
        setSortKey(k);
        setSortDir(1);
      }
    },
    [sortKey]
  );

  const clearAllFilters = useCallback(() => {
    setSmartPaste("");
    setTextFilters({});
    setDateFilters(EMPTY_DATES);
    setInventory([]);
    setHasSearched(false);
    setSearchedDbUnits(new Set());
  }, []);

  const hasActiveFilters =
    smartPaste.trim().length > 0 ||
    Object.values(textFilters).some((v) => v.trim().length > 0) ||
    Object.values(dateFilters).some((v) => v.trim().length > 0);

  const writeAuditLog = useCallback(
    (row: InventoryRow, field: keyof InventoryRow, from: string, to: string) => {
      const stamp = new Date().toISOString();
      const line = `[${stamp}] ${MOCK_USER} updated ${row.unit} ${String(field)} from "${from}" to "${to}"`;
      auditLogsRef.current.push(line);
      console.log(line);
    },
    []
  );

  const rowById = useMemo(() => {
    const m = new Map<string, InventoryRow>();
    for (const row of inventory) m.set(row.id, row);
    return m;
  }, [inventory]);

  const validateField = useCallback((field: EditableField, value: string): string => {
    const v = value.trim();
    
    // 如果为空，允许放行（如果你的业务要求某些字段必填，可以在这里加判断）
    if (!v) return ""; 

    if (field === "pod") {
      const ok = VALID_POD_CITIES.some((city) => city.toLowerCase() === v.toLowerCase());
      return ok ? "" : "POD must match an allowed city";
    }

    // 1. 严格日期校验 (ETA / SalesDate)
    if (field === "eta" || field === "salesDate") {
      // 第一关：检查格式长相必须是 yyyy/mm/dd (月份和日期允许 1位 或 2位)
      if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(v)) {
        return "Format must be yyyy/mm/dd";
      }
      
      // 第二关：检查是否是真实的日历日期 (拦截 2026/13/45)
      const dateObj = new Date(v);
      if (isNaN(dateObj.getTime())) {
        return "Invalid calendar date";
      }
      
      // 第三关：防止 Date 对象自动纠错 (比如 Date 把 2/31 变成 3/3)
      const [y, m, d] = v.split('/').map(Number);
      if (dateObj.getFullYear() !== y || dateObj.getMonth() + 1 !== m || dateObj.getDate() !== d) {
        return "Date does not exist on calendar";
      }

      return ""; // 完全合法
    }

    // 2. 严格数字校验 (Price)
    if (field === "price") {
      // 必须匹配纯数字或带小数点的格式，防止输入 "1e3" 或 "Infinity"
      if (!/^\d+(\.\d+)?$/.test(v)) {
        return "Price must be a valid positive number";
      }
      
      const num = Number(v);
      if (isNaN(num) || !Number.isFinite(num) || num < 0) {
        return "Price cannot be negative";
      }

      return ""; // 完全合法
    }

    return "";
  }, []);

  const getDisplayValue = useCallback(
    (rowId: string, field: NavigableField, dirtyDraft: DirtyCellMap = dirtyCells): string => {
      if (EDITABLE_GRID_ORDER.includes(field as EditableField)) {
        const key = dirtyKey(rowId, field as EditableField);
        const maybeDirty = dirtyDraft[key];
        if (maybeDirty != null) return maybeDirty;
      }
      const row = rowById.get(rowId);
      if (!row) return "";
      return rowFieldToString(row, field as NavigableField);
    },
    [dirtyCells, rowById]
  );

  const pushHistory = useCallback(
    () =>
      setHistory((prev) => [
        ...prev.slice(-49),
        { dirty: { ...dirtyCells }, errors: { ...invalidCells } },
      ]),
    [dirtyCells, invalidCells]
  );

  const stageCellValue = useCallback(
    (
      rowId: string,
      field: EditableField,
      rawValue: string,
      dirtyDraft?: DirtyCellMap,
      errorDraft?: DirtyCellMap
    ): { dirty: DirtyCellMap; errors: DirtyCellMap } => {
      const dirty = dirtyDraft ? { ...dirtyDraft } : { ...dirtyCells };
      const errors = errorDraft ? { ...errorDraft } : { ...invalidCells };
      const row = rowById.get(rowId);
      if (!row) return { dirty, errors };

      const key = dirtyKey(rowId, field);
      const baseValue = rowFieldToString(row, field);
      const previousDisplay = getDisplayValue(rowId, field, dirty);
      const nextValue =
        field === "remark1"
          ? appendRemark(previousDisplay, rawValue)
          : rawValue;

      if (nextValue === baseValue) delete dirty[key];
      else dirty[key] = nextValue;

      const err = validateField(field, nextValue);
      if (err) errors[key] = err;
      else delete errors[key];

      if (
        field === "status" &&
        nextValue.trim().toLowerCase() === "gatebuy" &&
        previousDisplay.trim().toLowerCase() !== "gatebuy"
      ) {
        toast({
          title: "Status changed to Gatebuy",
          description: "Create sales order?",
        });
      }

      // Customer -> infer a default planned depot name; keep relation fields read-only.
      if (field === "customer" && !err) {
        const nextDepotName = inferDepotFromCustomer(nextValue);
        const depotNameKey = dirtyKey(rowId, "depotName");
        const baseDepotName = rowFieldToString(row, "depotName");
        if (nextDepotName === baseDepotName) delete dirty[depotNameKey];
        else dirty[depotNameKey] = nextDepotName;
        delete errors[depotNameKey];

        // Inferred customer depot is only a planned hint; clear linked actual depot relation.
        const depotIdKey = dirtyKey(rowId, "actual_depot_id");
        delete dirty[depotIdKey];
        delete errors[depotIdKey];
      }

      return { dirty, errors };
    },
    [dirtyCells, getDisplayValue, invalidCells, rowById, validateField]
  );

  const startCellEdit = useCallback((
    rowId: string,
    field: EditableField,
    initialValue: string
  ) => {
    setEditingCell({ rowId, field });
    setEditValue(initialValue ?? "");
  }, []);

  const stageCellEdit = useCallback((rowId: string, field: EditableField, value: string) => {
    if (!editingCell) return;
    if (editingCell.rowId !== rowId || editingCell.field !== field) return;
    const next = stageCellValue(rowId, field, value);
    if (!shallowMapEqual(next.dirty, dirtyCells) || !shallowMapEqual(next.errors, invalidCells)) {
      pushHistory();
    }
    setDirtyCells(next.dirty);
    setInvalidCells(next.errors);
  }, [editingCell, stageCellValue, dirtyCells, invalidCells, pushHistory]);

  const stageDepotSelection = useCallback(
    (rowId: string, depotId: string | null, depotName: string) => {
      let nextDirty = { ...dirtyCells };
      let nextErrors = { ...invalidCells };

      const stagedName = stageCellValue(rowId, "depotName", depotName, nextDirty, nextErrors);
      nextDirty = stagedName.dirty;
      nextErrors = stagedName.errors;

      const stagedDepotId = stageCellValue(
        rowId,
        "actual_depot_id",
        depotId ?? "",
        nextDirty,
        nextErrors
      );
      nextDirty = stagedDepotId.dirty;
      nextErrors = stagedDepotId.errors;

      if (!shallowMapEqual(nextDirty, dirtyCells) || !shallowMapEqual(nextErrors, invalidCells)) {
        pushHistory();
      }
      setDirtyCells(nextDirty);
      setInvalidCells(nextErrors);
    },
    [dirtyCells, invalidCells, pushHistory, stageCellValue]
  );

  const cancelCellEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
    // Force the browser to return focus to the table wrapper so keyboard nav continues working
    setTimeout(() => {
      tableContainerRef.current?.focus();
    }, 0);
  }, []);

  const focusCell = useCallback(
    (rowId: string, field: NavigableField) => {
      const r = pageRows.findIndex((row) => row.id === rowId);
      const c = activeColumns.indexOf(field);
      if (r < 0 || c < 0) return;
      setSelection({ startR: r, startC: c, endR: r, endC: c });
    },
    [pageRows, activeColumns]
  );

  const distributePasteFromCell = useCallback(
    (clipboardText: string, startRowId: string, startField: NavigableField) => {
      const startRow = pageRows.findIndex((row) => row.id === startRowId);
      const startCol = activeColumns.indexOf(startField);
      if (startRow < 0 || startCol < 0) return;

      const rows = clipboardText
        .split(/\r?\n/)
        .filter((line) => line.length > 0)
  .map((line) => line.split(/\t|\s{2,}/));

      let nextDirty = { ...dirtyCells };
      let nextErrors = { ...invalidCells };
      for (let i = 0; i < rows.length; i++) {
        const targetRow = pageRows[startRow + i];
        if (!targetRow) continue;
        for (let j = 0; j < rows[i].length; j++) {
          const targetField = activeColumns[startCol + j];
          if (!targetField) continue;
          if (!EDITABLE_GRID_ORDER.includes(targetField as EditableField)) continue;
          const staged = stageCellValue(
            targetRow.id,
            targetField as EditableField,
            rows[i][j] ?? "",
            nextDirty,
            nextErrors
          );
          nextDirty = staged.dirty;
          nextErrors = staged.errors;
        }
      }
      if (!shallowMapEqual(nextDirty, dirtyCells) || !shallowMapEqual(nextErrors, invalidCells)) {
        pushHistory();
      }
      setDirtyCells(nextDirty);
      setInvalidCells(nextErrors);
    },
    [dirtyCells, invalidCells, pageRows, pushHistory, stageCellValue]
  );

  const handleCellPaste = useCallback(
    (
      e: React.ClipboardEvent<HTMLElement>,
      rowId: string,
      field: NavigableField
    ) => {
      e.preventDefault();
      const pasteData =
        e.clipboardData.getData("Text") || e.clipboardData.getData("text/plain");
      if (!pasteData.trim()) return;
      distributePasteFromCell(pasteData, rowId, field);
    },
    [distributePasteFromCell]
  );

  const handleTablePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!selection) return;
      e.preventDefault();
      const pasteData =
        e.clipboardData.getData("Text") || e.clipboardData.getData("text/plain");
      if (!pasteData.trim()) return;
      const anchorRow = pageRows[selection.endR];
      const anchorField = activeColumns[selection.endC];
      if (!anchorRow || !anchorField) return;
      distributePasteFromCell(pasteData, anchorRow.id, anchorField);
    },
    [selection, pageRows, activeColumns, distributePasteFromCell]
  );

  const handleTableKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (editingCell) return;
      if (!selection) return;

      const minR = Math.min(selection.startR, selection.endR);
      const maxR = Math.max(selection.startR, selection.endR);
      const minC = Math.min(selection.startC, selection.endC);
      const maxC = Math.max(selection.startC, selection.endC);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          setDirtyCells(last.dirty);
          setInvalidCells(last.errors);
          return prev.slice(0, -1);
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        let tsv = "";
        for (let r = minR; r <= maxR; r++) {
          const rowData: string[] = [];
          const row = pageRows[r];
          if (!row) continue;
          for (let c = minC; c <= maxC; c++) {
            const field = activeColumns[c];
            if (!field) continue;
            rowData.push(getDisplayValue(row.id, field));
          }
          tsv += rowData.join("\t") + "\n";
        }
        void navigator.clipboard.writeText(tsv.trim());
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const startRow = pageRows[minR];
        const startField = activeColumns[minC];
        if (!startRow || !startField) return;
        void navigator.clipboard
          .readText()
          .then((text) => distributePasteFromCell(text, startRow.id, startField));
        return;
      }

      if (!e.key.startsWith("Arrow")) {
        if (e.key === "Enter") {
          e.preventDefault();
          const row = pageRows[selection.endR];
          const field = activeColumns[selection.endC];
          if (!row || !field) return;
          if (!EDITABLE_GRID_ORDER.includes(field as EditableField)) return;
          const displayVal = getDisplayValue(row.id, field);
          startCellEdit(row.id, field as EditableField, displayVal);
        }
        return;
      }

      e.preventDefault();
      const currentR = selection.endR;
      const currentC = selection.endC;
      let nextR = currentR;
      let nextC = currentC;
      if (e.key === "ArrowUp") nextR = Math.max(0, currentR - 1);
      if (e.key === "ArrowDown") nextR = Math.min(pageRows.length - 1, currentR + 1);
      if (e.key === "ArrowLeft") nextC = Math.max(0, currentC - 1);
      if (e.key === "ArrowRight")
        nextC = Math.min(activeColumns.length - 1, currentC + 1);

      if (e.shiftKey) {
        setSelection({
          startR: selection.startR,
          startC: selection.startC,
          endR: nextR,
          endC: nextC,
        });
      } else {
        setSelection({ startR: nextR, startC: nextC, endR: nextR, endC: nextC });
      }

      setTimeout(() => {
        const nextField = activeColumns[nextC];
        const cellSelector = `td[data-row-index="${nextR}"][data-col-key="${nextField}"]`;
        const cellElement = tableContainerRef.current?.querySelector(cellSelector);
        if (cellElement) {
          cellElement.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "nearest",
          });
        }
      }, 0);
    },
    [
      editingCell,
      selection,
      pageRows,
      activeColumns,
      distributePasteFromCell,
      getDisplayValue,
      startCellEdit,
    ]
  );

  const applyTopN = useCallback(() => {
    const n = Math.max(0, Math.floor(Number.parseInt(topNInput, 10) || 0));
    if (n <= 0) return;
    const next = new Set<string>();
    for (let i = 0; i < Math.min(n, sortedRows.length); i++) {
      next.add(sortedRows[i].id);
    }
    setSelectedIds(next);
  }, [topNInput, sortedRows]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const pageRowIds = useMemo(() => pageRows.map((r) => r.id), [pageRows]);
  const allPageSelected =
    pageRowIds.length > 0 && pageRowIds.every((id) => selectedIds.has(id));

  const togglePageSelection = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageRowIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageRowIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [allPageSelected, pageRowIds]);

  const selectedRows = useMemo(
    () => inventory.filter((r) => selectedIds.has(r.id)),
    [inventory, selectedIds]
  );
  // 核心逻辑：确保防弹级的 POD 一致性校验（无视大小写和前后空格）
  const conflictPod = useMemo(() => {
    if (selectedRows.length <= 1) return false;
    const baseline = (selectedRows[0]?.pod || "").trim().toLowerCase();
    return selectedRows.some((r) => (r.pod || "").trim().toLowerCase() !== baseline);
  }, [selectedRows]);

  const saleSelectionConsistent = selectedRows.length > 0 && !conflictPod;

  const totalRevenue = useMemo(
    () => selectedRows.reduce((s, r) => s + r.price, 0),
    [selectedRows]
  );
  const dirtyCount = Object.keys(dirtyCells).length;
  const hasValidationErrors = Object.keys(invalidCells).length > 0;

  const saveAllDirtyChanges = useCallback(async () => {
    if (dirtyCount === 0 || hasValidationErrors) return;
    setIsSavingDirty(true);
    try {
      const summary = await updateInventoryData(dirtyCells);
      if (summary.failed > 0) {
        throw new Error(
          `Failed to save ${summary.failed} row(s).`
        );
      }
      setDirtyCells({});
      setInvalidCells({});
      setHistory([]);
      await handleSearch();
      toast({
        title: "All changes saved.",
      });
    } catch (error) {
      console.error("Failed to save inventory changes:", error);
      toast({
        title: "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDirty(false);
    }
  }, [dirtyCount, hasValidationErrors, dirtyCells, handleSearch]);

  const applyBulkChanges = useCallback(
    (changes: BulkChange[]) => {
      let nextDirty = { ...dirtyCells };
      let nextErrors = { ...invalidCells };
      for (const change of changes) {
        const staged = stageCellValue(
          change.rowId,
          change.field as EditableField,
          change.newValue,
          nextDirty,
          nextErrors
        );
        nextDirty = staged.dirty;
        nextErrors = staged.errors;
      }
      setDirtyCells(nextDirty);
      setInvalidCells(nextErrors);
    },
    [dirtyCells, invalidCells, stageCellValue]
  );

  const buildCsv = useCallback((rows: InventoryRow[]) => {
    const headers = CSV_HEADERS.filter((h) => h !== "Cost" || INVENTORY_IS_ADMIN);
    const lines = [
      headers.map(csvEscape).join(","),
      ...rows.map((r) => rowToCsvCells(r, INVENTORY_IS_ADMIN).join(",")),
    ];
    return lines.join("\n");
  }, []);

  const downloadCsv = useCallback((csv: string, name: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const exportSelection = useCallback(() => {
    downloadCsv(
      buildCsv(selectedRows),
      `inventory-selection-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }, [buildCsv, downloadCsv, selectedRows]);

  const exportAllFiltered = useCallback(() => {
    downloadCsv(
      buildCsv(sortedRows),
      `inventory-all-${new Date().toISOString().slice(0, 10)}.csv`
    );
  }, [buildCsv, downloadCsv, sortedRows]);

  const headerSticky =
    "bg-muted/95 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/90";

  const fromRow = sortedRows.length === 0 ? 0 : pageStart + 1;
  const toRow = Math.min(pageStart + pageSize, sortedRows.length);

  const pageNumbers = useMemo(() => {
    const window = 2;
    const start = Math.max(0, safePage - window);
    const end = Math.min(pageCount, safePage + window + 1);
    const nums: number[] = [];
    for (let i = start; i < end; i++) nums.push(i);
    return nums;
  }, [safePage, pageCount]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 space-y-3 border-b border-border bg-card px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Inventory Command Center
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Power table · sticky columns · sort · pagination · export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setBulkModalOpen(true)}
            >
              Excel Bulk Update
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Search criteria</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setIsSearchVisible((v) => !v)}
                aria-expanded={isSearchVisible}
              >
                {isSearchVisible ? "Hide" : "Show"}
                <ChevronDown
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    isSearchVisible && "rotate-180"
                  )}
                  aria-hidden
                />
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={handleSearch}
              >
                Search
              </Button>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={clearAllFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {isSearchVisible && (
            <div className="grid grid-cols-1 gap-3 p-3">
              <div className="col-span-full">
                <label
                  className="mb-1.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
                  htmlFor="smart-paste"
                >
                  SMART PASTE — UNIT NUMBER DETECTION
                </label>
                <Textarea
                  id="smart-paste"
                  className="min-h-[88px] w-full resize-y font-mono text-xs"
                  placeholder="Paste text — unit numbers: 4 letters + 7 digits (e.g. MSCU1234567)… Press Cmd/Ctrl+Enter to search."
                  value={smartPaste}
                  onChange={(e) => setSmartPaste(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                />
                <Badge
                  variant="secondary"
                  className="mt-2 max-w-full whitespace-normal text-left text-xs font-normal leading-snug"
                  title={missingListText}
                >
                  Detected: {pasteUnits.length} | Missing in DB: {missingListText}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {ROW_CORE_FILTERS.map((field) => (
                  <InventoryFilterInput
                    key={field.key}
                    field={field}
                    value={textFilters[field.key] ?? ""}
                    onChange={(key, v) =>
                      setTextFilters((f) => ({ ...f, [key]: v }))
                    }
                    onEnter={handleSearch}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {ROW_LOGISTICS_FILTERS.map((field) => (
                  <InventoryFilterInput
                    key={field.key}
                    field={field}
                    value={textFilters[field.key] ?? ""}
                    onChange={(key, v) =>
                      setTextFilters((f) => ({ ...f, [key]: v }))
                    }
                    onEnter={handleSearch}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                {ROW_SALES_FILTERS.map((field) => (
                  <InventoryFilterInput
                    key={field.key}
                    field={field}
                    value={textFilters[field.key] ?? ""}
                    onChange={(key, v) =>
                      setTextFilters((f) => ({ ...f, [key]: v }))
                    }
                    onEnter={handleSearch}
                  />
                ))}
              </div>

              <div className="grid w-full grid-cols-1 gap-2 lg:grid-cols-3">
                <DateRangeGroup
                  label="ETA"
                  from={dateFilters.etaFrom}
                  to={dateFilters.etaTo}
                  onFrom={(v) =>
                    setDateFilters((d) => ({ ...d, etaFrom: v }))
                  }
                  onTo={(v) => setDateFilters((d) => ({ ...d, etaTo: v }))}
                  onEnter={handleSearch}
                />
                <DateRangeGroup
                  label="Sales date"
                  from={dateFilters.salesDateFrom}
                  to={dateFilters.salesDateTo}
                  onFrom={(v) =>
                    setDateFilters((d) => ({ ...d, salesDateFrom: v }))
                  }
                  onTo={(v) =>
                    setDateFilters((d) => ({ ...d, salesDateTo: v }))
                  }
                  onEnter={handleSearch}
                />
                <DateRangeGroup
                  label="On hire"
                  from={dateFilters.onHireFrom}
                  to={dateFilters.onHireTo}
                  onFrom={(v) =>
                    setDateFilters((d) => ({ ...d, onHireFrom: v }))
                  }
                  onTo={(v) =>
                    setDateFilters((d) => ({ ...d, onHireTo: v }))
                  }
                  onEnter={handleSearch}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
        <div className="mb-2 flex items-center gap-4 px-1 py-2">
          <span className="text-sm font-medium">Quick Select:</span>
          <Input
            type="number"
            min={0}
            placeholder="N"
            className="h-8 w-20 text-sm"
            value={topNInput}
            onChange={(e) => setTopNInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyTopN();
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            className="h-8"
            onClick={applyTopN}
          >
            Select Top N
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={selectedIds.size === 0}
            onClick={exportSelection}
          >
            <FileDown className="mr-1 size-3.5" aria-hidden />
            Export Selection
          </Button>
          {selectedIds.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection ({selectedIds.size})
            </Button>
          )}
          {hasValidationErrors && (
            <span className="text-xs font-medium text-red-600">
              {Object.keys(invalidCells).length} invalid cell(s) must be fixed before save.
            </span>
          )}
        </div>

        <div
          ref={tableContainerRef}
          className="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card"
          onPaste={handleTablePaste}
          onKeyDown={handleTableKeyDown}
          tabIndex={0}
        >
          <table
            className="w-full min-w-[3400px] border-collapse"
            style={{ tableLayout: "fixed" }}
          >
            <thead>
              <tr className="border-b border-border">
                <th
                  className={cn(
                    "sticky left-0 top-0 z-40 w-[40px] border-r border-border px-1 py-1 text-center",
                    headerSticky
                  )}
                  style={{ width: CHECK_COL_PX }}
                >
                  <input
                    type="checkbox"
                    className="size-3.5 rounded border-input accent-primary"
                    aria-label="Select all rows on this page"
                    checked={allPageSelected}
                    ref={(el) => {
                      if (!el) return;
                      const some =
                        pageRowIds.some((id) => selectedIds.has(id)) &&
                        !allPageSelected;
                      el.indeterminate = some;
                    }}
                    onChange={togglePageSelection}
                  />
                </th>
                <th
                  className={cn(
                    "sticky top-0 z-40 w-[7.5rem] border-r border-border px-1.5 py-1",
                    headCn,
                    headerSticky,
                    "shadow-[4px_0_14px_-6px_rgba(0,0,0,0.22)]"
                  )}
                  style={{ left: STICKY_UNIT_LEFT }}
                >
                  <button
                    type="button"
                    onClick={() => onSort("unit")}
                    className="flex w-full items-center justify-start gap-0.5 rounded px-0.5 py-0 hover:bg-muted/80"
                  >
                    <span>Unit#</span>
                    {sortKey === "unit" ? (
                      sortDir === 1 ? (
                        <ArrowUp className="size-3 text-primary" />
                      ) : (
                        <ArrowDown className="size-3 text-primary" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-35" />
                    )}
                  </button>
                </th>
                <SortHeader
                  label="Size/Type"
                  colKey="specs"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-[120px]"
                />
                <SortHeader
                  label="Condition"
                  colKey="condition"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="Color"
                  colKey="color"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="YOM"
                  colKey="yom"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-14"
                />
                <SortHeader
                  label="FLP/LB/EOD"
                  colKey="flpLbEod"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="Vents"
                  colKey="vents"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-20"
                />
                <SortHeader
                  label="Machine Type"
                  colKey="engine"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="POD"
                  colKey="pod"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-20"
                />
                <SortHeader
                  label="ETA"
                  colKey="eta"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="Carrier"
                  colKey="carrier"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="Status"
                  colKey="status"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="SalesDate"
                  colKey="salesDate"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="SalesRep"
                  colKey="salesRep"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="Sales Region"
                  colKey="sales_region"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="Customer"
                  colKey="customer"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-32"
                />
                <SortHeader
                  label="Price"
                  colKey="price"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-20 text-right [&_button]:justify-end"
                />
                <SortHeader
                  label="CustomerOrder#"
                  colKey="customerOrderNum"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="DepotName"
                  colKey="depotName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="Gate-in Ref"
                  colKey="gateInRef"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                <SortHeader
                  label="Lessee"
                  colKey="transitCompany"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-32"
                />
                <SortHeader
                  label="POL"
                  colKey="pol"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-20"
                />
                <SortHeader
                  label="OnHire#"
                  colKey="onhire_no"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-24"
                />
                <SortHeader
                  label="OnHireDate"
                  colKey="onhire_date"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-28"
                />
                {INVENTORY_IS_ADMIN && (
                  <SortHeader
                    label="Cost"
                    colKey="cost"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                    headerSticky={headerSticky}
                    className="w-20 text-right [&_button]:justify-end"
                  />
                )}
                <SortHeader
                  label="Other Redelivery Instruction"
                  colKey="remark2"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-[150px]"
                />
                <SortHeader
                  label="Followup Remark"
                  colKey="remark1"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                  headerSticky={headerSticky}
                  className="w-[150px]"
                />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, rowIndex) => (
                <InventoryDataRow
                  key={row.id}
                  row={row}
                  rowIndex={rowIndex}
                  selected={selectedIds.has(row.id)}
                  onToggle={toggleRow}
                  isAdmin={INVENTORY_IS_ADMIN}
                  editingCell={editingCell}
                  editValue={editValue}
                  dirtyCells={dirtyCells}
                  invalidCells={invalidCells}
                  selection={selection}
                  activeColumns={activeColumns}
                  onStartEdit={startCellEdit}
                  onEditValueChange={setEditValue}
                  onStageEdit={stageCellEdit}
                  onCancelEdit={cancelCellEdit}
                  onFocusCell={focusCell}
                  onSelectDepot={stageDepotSelection}
                  onCellPaste={handleCellPaste}
                  optionsCache={optionsCache}
                />
              ))}
              {isLoading && (
                <tr>
                  <td className={cn(cellCn, "text-sm text-muted-foreground")} colSpan={30}>
                    Loading inventory...
                  </td>
                </tr>
              )}
              {!isLoading && inventory.length === 0 && (
                <tr>
                  <td className={cn(cellCn, "py-10")} colSpan={30}>
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <PackageSearch
                        className="size-10 text-muted-foreground/40"
                        aria-hidden
                      />
                      <p className="text-sm text-muted-foreground">
                        No data to display. Paste unit numbers or apply filters, then
                        click Search.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex shrink-0 flex-col gap-2 rounded-md border border-border bg-muted/20 px-2 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rows / page</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v) as (typeof PAGE_SIZES)[number]);
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-[76px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-muted-foreground">
              Total:{" "}
              <span className="font-medium text-foreground tabular-nums">
                {sortedRows.length}
              </span>
              {" · "}
              Showing{" "}
              <span className="font-medium text-foreground tabular-nums">
                {fromRow}–{toRow}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={exportAllFiltered}
            >
              <FileDown className="size-3.5" aria-hidden />
              Export All to CSV
            </Button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={safePage <= 0}
                onClick={() => setPage(0)}
                aria-label="First page"
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={safePage <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-0.5 px-1">
                {pageNumbers.map((i) => (
                  <Button
                    key={i}
                    type="button"
                    variant={i === safePage ? "default" : "ghost"}
                    size="sm"
                    className="h-8 min-w-8 px-2 text-xs"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={safePage >= pageCount - 1}
                onClick={() =>
                  setPage((p) => Math.min(pageCount - 1, p + 1))
                }
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(pageCount - 1)}
                aria-label="Last page"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {(selectedIds.size > 0 || dirtyCount > 0) && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-[min(100%,960px)] -translate-x-1/2 px-3">
          <div className="pointer-events-auto flex items-center justify-between gap-3 overflow-x-auto rounded-xl border border-border/80 bg-background/85 px-3 py-2 text-xs shadow-xl backdrop-blur-md sm:text-sm">
            <div className="flex shrink-0 items-center gap-3 whitespace-nowrap">
              <span className="font-medium">
                Selected:{" "}
                <span className="tabular-nums">{selectedIds.size}</span>
              </span>
              <span className="text-muted-foreground">
                Total revenue:{" "}
                <span className="font-semibold text-foreground">
                  {formatUsd(totalRevenue)}
                </span>
              </span>
              {dirtyCount > 0 && (
                <span className="text-muted-foreground">
                  Dirty cells:{" "}
                  <span className="font-semibold text-foreground">{dirtyCount}</span>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={!saleSelectionConsistent}
                        onClick={() => setSaleModalOpen(true)}
                      >
                        <Package className="size-3.5" aria-hidden />
                        Sale to Customer
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!saleSelectionConsistent && (
                    <TooltipContent side="top" className="max-w-[320px]">
                      Selected units must share the exact same POD to proceed.
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setArrangeModalOpen(true)}
              >
                <Truck className="size-3.5" aria-hidden />
                Arrange to Depot
              </Button>
            </div>
            <div className="shrink-0">
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                disabled={dirtyCount === 0 || isSavingDirty || hasValidationErrors}
                onClick={saveAllDirtyChanges}
              >
                {isSavingDirty ? "Saving..." : "SAVE ALL CHANGES"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <BulkPasteUpdateModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        rows={inventory}
        onApply={applyBulkChanges}
      />
      <SaleToCustomerModal
        open={saleModalOpen}
        onOpenChange={setSaleModalOpen}
        selectedRows={selectedRows}
        onConfirmSuccess={() => {
          setSelectedIds(new Set());
          void handleSearch();
        }}
      />
      <ArrangeToDepotModal
        open={arrangeModalOpen}
        onOpenChange={setArrangeModalOpen}
        selectedRows={selectedRows}
        onConfirmSuccess={() => {
          setSelectedIds(new Set());
          void handleSearch();
        }}
      />
    </div>
  );
}
