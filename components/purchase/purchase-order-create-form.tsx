"use client";

import { Copy, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createPurchaseOrderDraft,
  getPurchaseOrderEditContainerPage,
  getPurchaseOrderEditContainersByNumbers,
  createPurchaseOrderSubmit,
  submitPurchaseOrderPending,
  submitPurchaseOrderDraftUpdate,
  type PurchaseDraftFormOptions,
  type PurchaseDraftMaterialVendorOption,
  type PurchaseDraftSupplierOption,
  updatePurchaseOrderDraft,
  updatePurchaseOrderPending,
} from "@/app/purchase/po-management/actions";
import {
  buildDefaultDraftContainersForItem,
  computeLineAmount,
  computeTotals,
  generatePurchaseOrderNumber,
  getDefaultConditionCode,
  getNextPurchaseOrderSequence,
  PURCHASE_MATERIAL_TYPE_OPTIONS,
  PURCHASE_PAYMENT_MODE_OPTIONS,
  PURCHASE_TYPE_OPTIONS,
  shouldShowEstimatedOfflineTime,
  shouldShowMaterialTypes,
  shouldShowVendorReleaseFields,
} from "@/app/purchase/po-management/create-helpers";
import { AutocompleteFilterInput } from "@/components/shared/page-standard/autocomplete-filter-input";
import { PurchaseContainerBulkUpdateModal } from "@/components/purchase/purchase-container-bulk-update-modal";
import { StandardTablePagination } from "@/components/shared/page-standard/standard-table-pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { getPurchaseOrderEditPermissions } from "@/types/purchase";
import type {
  PurchaseBankInformationSnapshot,
  PurchaseDraftMaterialTypeInput,
  PurchaseEditFieldSet,
  PurchaseOrderItemAttachmentInput,
  PurchaseOrderItemAttachmentType,
  PurchaseOrderEditPermissions,
  PurchaseOrderDetail,
  PurchaseOrderDraftContainerInput,
  PurchaseOrderContainer,
  PurchaseOrderContainerEditPatchInput,
  PurchaseOrderEditContainerPage,
  PurchaseOrderDraftInput,
  PurchaseOrderDraftItemInput,
  PurchasePaymentMode,
  PurchaseType,
} from "@/types/purchase";

type Props = {
  options: PurchaseDraftFormOptions;
  initialOrder?: PurchaseOrderDetail | null;
  mode?: "create" | "edit";
  editPermissions?: PurchaseOrderEditPermissions;
};

type DraftItemRow = PurchaseOrderDraftItemInput & {
  key: string;
  containerNumberRange?: string | null;
  cancelledQty?: number | null;
  remainingQty?: number | null;
  conditionDirty: boolean;
  flpDirty: boolean;
  lbxDirty: boolean;
  lockingBarsDirty: boolean;
  yomDirty: boolean;
};

type DraftContainerRow = PurchaseOrderDraftContainerInput & {
  key: string;
};

type EditContainerPageState = PurchaseOrderEditContainerPage & {
  loading: boolean;
};

type DraftMaterialTypeRow = PurchaseDraftMaterialTypeInput & {
  key: string;
};

type DraftAttachmentRow = PurchaseOrderItemAttachmentInput & {
  key: string;
  id?: string;
};

type EditableCellKey = {
  rowKey: string;
  column:
    | "location"
    | "depot"
    | "sizeType"
    | "condition"
    | "color"
    | "flp"
    | "lbx"
    | "lockingBars"
    | "vents"
    | "machineType"
    | "yom"
    | "estimatedOfflineDate"
    | "tareWeight"
    | "maximumWeight"
    | "payloadWeight"
    | "cscNumber"
    | "vendorReleaseNumber"
    | "plannedPod"
    | "plannedQty"
    | "unitPrice"
    | "offlineDate";
};

type EditableContainerField =
  | "estimatedOfflineDate"
  | "offlineDate"
  | "tareWeight"
  | "maximumWeight"
  | "cscNumber";

const FACTORY_PROGRESS_EDITABLE_COLUMNS = new Set<EditableCellKey["column"]>([
  "estimatedOfflineDate",
  "offlineDate",
  "tareWeight",
  "maximumWeight",
  "cscNumber",
]);

const PURCHASE_ORDER_ATTACHMENT_TYPE_OPTIONS: Array<{
  value: PurchaseOrderItemAttachmentType;
  label: string;
}> = [
  { value: "VENDOR_RELEASE", label: "Vendor Release" },
  { value: "GENERAL", label: "General" },
  { value: "INVOICE", label: "Invoice" },
  { value: "CONTRACT", label: "Contract" },
];

const FACTORY_PROGRESS_EDITABLE_CONTAINER_COLUMNS = new Set<EditableContainerField>([
  "estimatedOfflineDate",
  "offlineDate",
  "tareWeight",
  "maximumWeight",
  "cscNumber",
]);

type DraftFormState = Omit<
  PurchaseOrderDraftInput,
  | "orderNo"
  | "items"
  | "containers"
  | "materialTypes"
  | "itemAttachments"
  | "vendorBankInformation"
> & {
  vendorBankInformation: PurchaseBankInformationSnapshot | null;
};

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

function parseNumberInput(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const MANUAL_CONTAINER_NUMBER_PATTERN = /^[A-Z]{4}\d{7}$/;

function isValidManualContainerNumber(value: string | null | undefined) {
  if (!value) return true;
  return MANUAL_CONTAINER_NUMBER_PATTERN.test(value.trim().toUpperCase());
}

function findConditionIdByCode(options: PurchaseDraftFormOptions["conditions"], code: string) {
  return options.find((option) => option.code === code)?.id ?? null;
}

function createEmptyItem(
  purchaseType: PurchaseType,
  conditions: PurchaseDraftFormOptions["conditions"]
): DraftItemRow {
  const key = makeKey();
  const defaultYear =
    purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER"
      ? new Date().getFullYear()
      : null;
  const defaultToggle = purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER";
  return {
    key,
    itemKey: key,
    locationCityId: null,
    depotId: null,
    containerSizeCodeId: null,
    containerTypeCodeId: null,
    containerConditionCodeId: findConditionIdByCode(
      conditions,
      getDefaultConditionCode(purchaseType)
    ),
    color: null,
    flp: defaultToggle,
    lbx: defaultToggle,
    lockingBarsCount: purchaseType === "FACTORY_ORDER" ? 3 : null,
    ventsCount: null,
    machineType: null,
    yom: defaultYear,
    estimatedOfflineDate: null,
    offlineDate: null,
    vendorReleaseNumber: null,
    plannedPod: null,
    tareWeight: null,
    maximumWeight: null,
    cscNumber: null,
    containerNumberRange: null,
    plannedQty: 0,
    unitPrice: null,
    lineAmount: 0,
    remark: null,
    cancelQty: null,
    cancelledQty: null,
    remainingQty: null,
    conditionDirty: false,
    flpDirty: false,
    lbxDirty: false,
    lockingBarsDirty: false,
    yomDirty: false,
  };
}

function companyLabel(
  option:
    | PurchaseDraftSupplierOption
    | { vendor_code?: string | null; legal_company_name?: string | null; company_name?: string | null }
    | undefined
) {
  if (!option) return "";
  if ("label" in option) {
    return option.vendorName ?? option.vendorCode ?? option.label;
  }
  return option.legal_company_name ?? option.company_name ?? option.vendor_code ?? "";
}

function materialVendorLabel(option: PurchaseDraftMaterialVendorOption) {
  return [option.vendorCode, option.vendorName].filter(Boolean).join(" · ");
}

function getDefaultFlp(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER";
}

function getDefaultLbx(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER";
}

function getDefaultYom(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER"
    ? new Date().getFullYear()
    : null;
}

function getDefaultLockingBars(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER" ? 3 : null;
}

function createDraftContainerRow(input: PurchaseOrderDraftContainerInput): DraftContainerRow {
  return {
    ...input,
    key: makeKey(),
  };
}

const ITEM_OWNED_DRAFT_CONTAINER_FIELDS = [
  "color",
  "flp",
  "lbx",
  "lockingBarsCount",
  "ventsCount",
  "machineType",
  "yom",
  "estimatedOfflineDate",
  "offlineDate",
  "tareWeight",
  "maximumWeight",
  "cscNumber",
] as const;

type ItemOwnedDraftContainerField = (typeof ITEM_OWNED_DRAFT_CONTAINER_FIELDS)[number];

function buildDraftContainerSharedFieldsFromItem(
  item: DraftItemRow,
  purchaseType: PurchaseType
): Pick<PurchaseOrderDraftContainerInput, ItemOwnedDraftContainerField> {
  return {
    color: item.color ?? null,
    flp: item.flp,
    lbx: item.lbx,
    lockingBarsCount: item.lockingBarsCount,
    ventsCount: item.ventsCount,
    machineType: item.machineType ?? null,
    yom: item.yom ?? null,
    estimatedOfflineDate: purchaseType === "FACTORY_ORDER" ? item.estimatedOfflineDate ?? null : null,
    offlineDate: item.offlineDate ?? null,
    tareWeight: item.tareWeight ?? null,
    maximumWeight: item.maximumWeight ?? null,
    cscNumber: item.cscNumber ?? null,
  };
}

function getChangedDraftContainerSharedFields(args: {
  previousItem?: DraftItemRow;
  nextItem: DraftItemRow;
  previousPurchaseType?: PurchaseType;
  purchaseType: PurchaseType;
}) {
  if (!args.previousItem) return new Set<ItemOwnedDraftContainerField>();
  const previousShared = buildDraftContainerSharedFieldsFromItem(
    args.previousItem,
    args.previousPurchaseType ?? args.purchaseType
  );
  const nextShared = buildDraftContainerSharedFieldsFromItem(args.nextItem, args.purchaseType);
  const changed = new Set<ItemOwnedDraftContainerField>();

  ITEM_OWNED_DRAFT_CONTAINER_FIELDS.forEach((field) => {
    if (previousShared[field] !== nextShared[field]) {
      changed.add(field);
    }
  });

  return changed;
}

function patchToDraftContainerRow(
  row: PurchaseOrderContainer,
  patch?: PurchaseOrderContainerEditPatchInput
): DraftContainerRow {
  return {
    key: row.id,
    itemKey: row.purchaseOrderItemId ?? "",
    containerNumber: patch?.containerNumber ?? row.containerNumber,
    color: row.color,
    flp: row.flp,
    lbx: row.lbx,
    lockingBarsCount: row.lockingBarsCount,
    ventsCount: row.ventsCount,
    machineType: patch?.machineType ?? row.machineType,
    yom: patch?.yom ?? row.yom,
    estimatedOfflineDate: patch?.estimatedOfflineDate ?? row.estimatedOfflineDate,
    offlineDate: patch?.offlineDate ?? row.offlineDate,
    tareWeight: patch?.tareWeight ?? row.tareWeight,
    maximumWeight: patch?.maximumWeight ?? row.maximumWeight,
    cscNumber: patch?.cscNumber ?? row.cscNumber,
  };
}

function syncContainersWithItems(input: {
  current: DraftContainerRow[];
  items: DraftItemRow[];
  previousItemsByKey: Map<string, DraftItemRow>;
  previousPurchaseType: PurchaseType;
  purchaseType: PurchaseType;
  vendorReleaseDate: string | null;
}) {
  const next: DraftContainerRow[] = [];
  for (const item of input.items) {
    const existing = input.current.filter((row) => row.itemKey === item.itemKey);
    const defaults = buildDefaultDraftContainersForItem({
      itemKey: item.itemKey,
      item,
      purchaseType: input.purchaseType,
      vendorReleaseDate: input.vendorReleaseDate,
    });
    const count = defaults.length;
    const previousItem = input.previousItemsByKey.get(item.itemKey);
    const changedFields = getChangedDraftContainerSharedFields({
      previousItem,
      previousPurchaseType: input.previousPurchaseType,
      nextItem: item,
      purchaseType: input.purchaseType,
    });
    for (let index = 0; index < count; index += 1) {
      const base = defaults[index];
      const prior = existing[index];
      next.push(
        prior
          ? {
              ...prior,
              itemKey: item.itemKey,
              ...Object.fromEntries(
                ITEM_OWNED_DRAFT_CONTAINER_FIELDS
                  .filter((field) => changedFields.has(field))
                  .map((field) => [field, base[field]])
              ),
            }
          : createDraftContainerRow(base)
      );
    }
  }
  return next;
}

function syncNewContainerDraftsWithItems(input: {
  current: Record<string, DraftContainerRow[]>;
  items: DraftItemRow[];
  previousItemsByKey: Map<string, DraftItemRow>;
  previousPurchaseType: PurchaseType;
  purchaseType: PurchaseType;
}) {
  const next: Record<string, DraftContainerRow[]> = {};

  for (const item of input.items) {
    const existingRows = input.current[item.itemKey] ?? [];
    if (existingRows.length === 0) continue;

    const base = buildDraftContainerSharedFieldsFromItem(item, input.purchaseType);
    const previousItem = input.previousItemsByKey.get(item.itemKey);
    const changedFields = getChangedDraftContainerSharedFields({
      previousItem,
      previousPurchaseType: input.previousPurchaseType,
      nextItem: item,
      purchaseType: input.purchaseType,
    });

    next[item.itemKey] = existingRows.map((row) => ({
      ...row,
      ...Object.fromEntries(
        ITEM_OWNED_DRAFT_CONTAINER_FIELDS
          .filter((field) => changedFields.has(field))
          .map((field) => [field, base[field]])
      ),
    }));
  }

  return next;
}

function displayValue(value?: string | number | null, placeholder = "-") {
  if (value == null || value === "") return placeholder;
  return String(value);
}

function displayWeight(value?: number | null) {
  if (value == null) return "-";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function RequiredLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <Label>
      {children}
      {required ? <span className="ml-0.5 text-current">*</span> : null}
    </Label>
  );
}

const PURCHASE_ITEM_COLUMNS = [
  { key: "location", label: "Location", width: 140 },
  { key: "depot", label: "Depot", width: 140 },
  { key: "sizeType", label: "Size/Type", width: 140 },
  { key: "condition", label: "Condition", width: 140 },
  { key: "color", label: "Color", width: 130 },
  { key: "flp", label: "FLP", width: 90 },
  { key: "lbx", label: "LBX", width: 90 },
  { key: "lockingBars", label: "Locking Bars", width: 150 },
  { key: "vents", label: "Vents", width: 110 },
  { key: "machineType", label: "Machine Type", width: 150 },
  { key: "yom", label: "YOM", width: 100 },
  { key: "estimatedOfflineDate", label: "Estimated Offline Date", width: 170 },
  { key: "tareWeight", label: "Tare Weight", width: 120 },
  { key: "maximumWeight", label: "Maximum Weight", width: 140 },
  { key: "payloadWeight", label: "Payload Weight", width: 130 },
  { key: "cscNumber", label: "CSC Number", width: 150 },
  { key: "containerNumberRange", label: "Container Number Range", width: 220 },
  { key: "plannedQty", label: "Planned Qty", width: 120 },
  { key: "unitPrice", label: "Unit Price", width: 130 },
  { key: "lineAmount", label: "Line Amount", width: 140 },
  { key: "cancelQty", label: "Cancel Qty", width: 120 },
  { key: "cancelledQty", label: "Cancelled Qty", width: 120 },
  { key: "remainingQty", label: "Remaining Qty", width: 120 },
  { key: "vendorReleaseNumber", label: "Vendor Release Number", width: 170 },
  { key: "offlineDate", label: "Offline Date / Release Date", width: 170 },
  { key: "plannedPod", label: "Planned POD", width: 170 },
  { key: "actions", label: "Actions", width: 180 },
] as const;

function isRequiredItemColumn(
  column: (typeof PURCHASE_ITEM_COLUMNS)[number]["key"],
  purchaseType: PurchaseType
) {
  if (
    ["location", "depot", "sizeType", "condition", "plannedQty", "unitPrice"].includes(column)
  ) {
    return true;
  }
  if (
    purchaseType !== "USED_CONTAINER" &&
    ["color", "flp", "lbx", "lockingBars", "vents"].includes(column)
  ) {
    return true;
  }
  return false;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function CellDisplayButton({
  value,
  placeholder = "-",
  onActivate,
  disabled = false,
  testId,
}: {
  value?: string | number | null;
  placeholder?: string;
  onActivate: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  const content = displayValue(value, placeholder);
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={disabled ? undefined : onActivate}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full items-center justify-center px-2 text-center text-sm",
        disabled
          ? "cursor-default text-muted-foreground"
          : "hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
      )}
    >
      <span className={cn("truncate", content === placeholder ? "text-muted-foreground" : "")}>
        {content}
      </span>
    </button>
  );
}

function EditableSelectCell({
  active,
  value,
  display,
  options,
  onChange,
  onActivate,
  onDeactivate,
  disabled = false,
  testId,
}: {
  active: boolean;
  value: string;
  display: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  const EMPTY_SENTINEL = "__empty__";
  if (!active || disabled) {
    return (
      <CellDisplayButton
        value={display}
        onActivate={onActivate}
        disabled={disabled}
        testId={testId}
      />
    );
  }

  return (
    <Select
      open={active}
      value={value || EMPTY_SENTINEL}
      onValueChange={(nextValue) => {
        onChange(nextValue === EMPTY_SENTINEL ? "" : nextValue);
        onDeactivate();
      }}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onDeactivate();
        }
      }}
    >
      <SelectTrigger
        autoFocus
        data-testid={testId}
        className="h-10 rounded-none border-0 px-2 text-center shadow-none ring-1 ring-ring focus:ring-1 focus:ring-ring focus:ring-offset-0 [&>span]:w-full [&>span]:text-center"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDeactivate();
          }
        }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="center">
        {options.map((option) => (
          <SelectItem
            key={option.value || EMPTY_SENTINEL}
            value={option.value || EMPTY_SENTINEL}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditableInputCell({
  active,
  value,
  display,
  type = "text",
  disableSpinner = false,
  preventWheelChange = false,
  onChange,
  onActivate,
  onDeactivate,
  disabled = false,
  testId,
}: {
  active: boolean;
  value: string;
  display: string;
  type?: "text" | "number" | "date";
  disableSpinner?: boolean;
  preventWheelChange?: boolean;
  onChange: (value: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  if (!active || disabled) {
    return (
      <CellDisplayButton
        value={display}
        onActivate={onActivate}
        disabled={disabled}
        testId={testId}
      />
    );
  }

  return (
    <Input
      autoFocus
      data-testid={testId}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDeactivate}
      onWheel={
        preventWheelChange
          ? (event) => {
              event.preventDefault();
              event.currentTarget.blur();
            }
          : undefined
      }
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === "Escape") {
          event.preventDefault();
          onDeactivate();
        }
      }}
      className={cn(
        "h-10 rounded-none border-0 px-2 text-center shadow-none ring-1 ring-ring",
        disableSpinner
          ? "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          : ""
      )}
    />
  );
}

function EditableAutocompleteCell({
  active,
  value,
  display,
  options,
  onCommit,
  onActivate,
  onDeactivate,
  placeholder = "-",
  disabled = false,
  testId,
}: {
  active: boolean;
  value: string | null;
  display: string;
  options: { value: string; label: string; searchText?: string }[];
  onCommit: (value: string | null) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(display);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setQuery(value ? display : "");
    setOpen(true);
    setHighlightedIndex(0);
  }, [active, display, value]);

  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [active]);

  const filteredOptions = useMemo(() => {
    const normalized = normalizeText(query);
    if (!normalized) return options;
    return options.filter((option) =>
      normalizeText([option.label, option.searchText].filter(Boolean).join(" ")).includes(
        normalized
      )
    );
  }, [options, query]);

  if (!active || disabled) {
    return (
      <CellDisplayButton
        value={display}
        placeholder={placeholder}
        onActivate={onActivate}
        disabled={disabled}
        testId={testId}
      />
    );
  }

  return (
    <Popover
      open={active && open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) onDeactivate();
      }}
      modal={false}
    >
      <PopoverAnchor asChild>
        <Input
          ref={inputRef}
          data-testid={testId}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setHighlightedIndex(0);
            if (!event.target.value) {
              onCommit(null);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (filteredOptions.length === 0) return;
              setOpen(true);
              setHighlightedIndex((current) =>
                current >= filteredOptions.length - 1 ? 0 : current + 1
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              if (filteredOptions.length === 0) return;
              setOpen(true);
              setHighlightedIndex((current) =>
                current <= 0 ? filteredOptions.length - 1 : current - 1
              );
              return;
            }

            if (event.key === "Enter") {
              if (open && filteredOptions.length > 0) {
                event.preventDefault();
                const option = filteredOptions[highlightedIndex] ?? filteredOptions[0];
                if (!option) return;
                onCommit(option.value);
                setQuery(option.label);
                setOpen(false);
                return;
              }
              event.preventDefault();
              onDeactivate();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              onDeactivate();
            }
          }}
          className="h-10 rounded-none border-0 px-2 text-center shadow-none ring-1 ring-ring"
        />
      </PopoverAnchor>

      <PopoverContent
        align="center"
        sideOffset={2}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className="z-[40] max-h-52 w-[var(--radix-popover-trigger-width)] overflow-auto rounded-none border border-border bg-popover p-0 shadow-md"
      >
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-2 text-center text-sm text-muted-foreground">
            No matches found.
          </div>
        ) : (
          filteredOptions.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={cn(
                "block w-full px-3 py-2 text-center text-sm",
                index === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
              )}
              onMouseDown={(event) => {
                event.preventDefault();
                onCommit(option.value);
                setQuery(option.label);
                setOpen(false);
                onDeactivate();
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

function buildInitialFinanceState(): DraftFormState {
  return {
    purchaseType: "FACTORY_ORDER",
    supplierId: null,
    ownerId: null,
    buyerId: null,
    purchaseDate: new Date().toISOString().slice(0, 10),
    estimatedOfflineTime: null,
    contractNumber: null,
    invoiceNumber: null,
    freeday: null,
    vendorReleaseDate: null,
    paymentMode: "PREPAYMENT",
    paymentAccount: null,
    dueDate: null,
    settlementPaymentTerm: null,
    settlementCreditDays: null,
    settlementCreditLimit: null,
    settlementAdvancePaymentPercentage: null,
    settlementBalanceTriggerEvent: null,
    settlementCurrency: "USD",
    settlementPrepaymentPool: true,
    settlementPrepaymentThreshold: null,
    settlementCurrentPrepaidBalance: null,
    vendorBankInformation: null,
    remark: null,
  };
}

function buildFactoryMaterialTypeRows(
  materialVendors: PurchaseDraftFormOptions["materialVendors"]
): DraftMaterialTypeRow[] {
  return PURCHASE_MATERIAL_TYPE_OPTIONS.map((materialType) => {
    const defaultVendor = materialVendors.find(
      (vendor) => vendor.materialCategory === materialType && vendor.isDefaultVendor
    );
    return {
      key: makeKey(),
      materialType,
      materialVendorId: defaultVendor?.id ?? null,
    };
  });
}

function buildFormStateFromOrder(order: PurchaseOrderDetail): DraftFormState {
  return {
    purchaseType: order.purchaseType,
    supplierId: order.supplierId,
    ownerId: order.ownerId,
    buyerId: order.buyerId,
    purchaseDate: order.purchaseDate,
    estimatedOfflineTime: order.estimatedOfflineTime,
    contractNumber: order.contractNumber,
    invoiceNumber: order.invoiceNumber,
    freeday: order.freeday,
    vendorReleaseDate: order.vendorReleaseDate,
    paymentMode: order.paymentMode,
    paymentAccount: order.paymentAccount,
    dueDate: order.dueDate,
    settlementPaymentTerm: order.settlementPaymentTerm,
    settlementCreditDays: order.settlementCreditDays,
    settlementCreditLimit: order.settlementCreditLimit,
    settlementAdvancePaymentPercentage: order.settlementAdvancePaymentPercentage,
    settlementBalanceTriggerEvent: order.settlementBalanceTriggerEvent,
    settlementCurrency: order.settlementCurrency,
    settlementPrepaymentPool: order.settlementPrepaymentPool,
    settlementPrepaymentThreshold: order.settlementPrepaymentThreshold,
    settlementCurrentPrepaidBalance: order.settlementCurrentPrepaidBalance,
    vendorBankInformation: order.vendorBankInformation,
    remark: order.remark,
  };
}

function buildDraftItemsFromOrder(order: PurchaseOrderDetail): DraftItemRow[] {
  return order.items.map((item) => ({
    key: item.id,
    itemKey: item.id,
    locationCityId: item.locationCityId,
    depotId: item.depotId,
    containerSizeCodeId: item.containerSizeCodeId,
    containerTypeCodeId: item.containerTypeCodeId,
    containerConditionCodeId: item.containerConditionCodeId,
    color: item.color,
    flp: item.flp,
    lbx: item.lbx,
    lockingBarsCount: item.lockingBarsCount,
    ventsCount: item.ventsCount,
    machineType: item.machineType,
    yom: item.yom,
    estimatedOfflineDate: item.estimatedOfflineDate,
    offlineDate: item.offlineDate,
    vendorReleaseNumber: item.vendorReleaseNumber,
    plannedPod: item.plannedPod,
    tareWeight: item.tareWeight,
    maximumWeight: item.maximumWeight,
    cscNumber: item.cscNumber,
    containerNumberRange: item.containerNumberRange,
    plannedQty: item.plannedQty,
    unitPrice: item.unitPrice,
    lineAmount: item.lineAmount,
    remark: item.remark,
    cancelQty: null,
    cancelledQty: item.cancelledQty,
    remainingQty: item.remainingQty,
    conditionDirty: false,
    flpDirty: false,
    lbxDirty: false,
    lockingBarsDirty: false,
    yomDirty: false,
  }));
}

function buildDraftContainersFromOrder(order: PurchaseOrderDetail): DraftContainerRow[] {
  return order.containers.map((container) => ({
    key: container.id,
    itemKey: container.purchaseOrderItemId ?? "",
    containerNumber: container.containerNumber,
    color: container.color,
    flp: container.flp,
    lbx: container.lbx,
    lockingBarsCount: container.lockingBarsCount,
    ventsCount: container.ventsCount,
    machineType: container.machineType,
    yom: container.yom,
    estimatedOfflineDate: container.estimatedOfflineDate,
    offlineDate: container.offlineDate,
    tareWeight: container.tareWeight,
    maximumWeight: container.maximumWeight,
    cscNumber: container.cscNumber,
  }));
}

function buildDraftMaterialTypesFromOrder(order: PurchaseOrderDetail): DraftMaterialTypeRow[] {
  return order.materialTypes.map((row) => ({
    key: row.id,
    materialType: row.materialType,
    materialVendorId: row.materialVendorId,
  }));
}

function buildDraftItemAttachmentsFromOrder(order: PurchaseOrderDetail): DraftAttachmentRow[] {
  return order.itemAttachments.map((attachment) => ({
    key: attachment.id,
    id: attachment.id,
    purchaseOrderItemId: attachment.purchaseOrderItemId,
    attachmentType: attachment.attachmentType,
    url: attachment.url,
    remark: attachment.remark,
  }));
}

export function PurchaseOrderCreateForm({
  options,
  initialOrder = null,
  mode = "create",
  editPermissions,
}: Props) {
  const initialDraftItems = useMemo(
    () => (initialOrder ? buildDraftItemsFromOrder(initialOrder) : []),
    [initialOrder]
  );
  const initialItem = useMemo(
    () =>
      initialOrder
        ? initialDraftItems[0] ?? createEmptyItem(initialOrder.purchaseType, options.conditions)
        : createEmptyItem("FACTORY_ORDER", options.conditions),
    [initialDraftItems, initialOrder, options.conditions]
  );
  const router = useRouter();
  const isEditMode = mode === "edit" && Boolean(initialOrder);
  const resolvedEditPermissions = useMemo(
    () =>
      isEditMode && initialOrder
        ? editPermissions ?? getPurchaseOrderEditPermissions(initialOrder.purchaseType, initialOrder.orderStatus)
        : null,
    [editPermissions, initialOrder, isEditMode]
  );
  const [form, setForm] = useState<DraftFormState>(() =>
    initialOrder ? buildFormStateFromOrder(initialOrder) : buildInitialFinanceState()
  );
  const [supplierInput, setSupplierInput] = useState(() =>
    initialOrder?.supplier
      ? [initialOrder.supplier.vendor_code, companyLabel(initialOrder.supplier)].filter(Boolean).join(" · ")
      : ""
  );
  const [items, setItems] = useState<DraftItemRow[]>(() =>
    initialOrder ? initialDraftItems : [initialItem]
  );
  const [containers, setContainers] = useState<DraftContainerRow[]>(() =>
    initialOrder && (!isEditMode || initialOrder.orderStatus === "DRAFT")
      ? initialOrder.containers.length > 0
        ? buildDraftContainersFromOrder(initialOrder)
        : syncContainersWithItems({
            current: [],
            items: buildDraftItemsFromOrder(initialOrder),
            previousItemsByKey: new Map(),
            previousPurchaseType: initialOrder.purchaseType,
            purchaseType: initialOrder.purchaseType,
            vendorReleaseDate: initialOrder.vendorReleaseDate,
          })
      : buildDefaultDraftContainersForItem({
          itemKey: initialItem.itemKey,
          item: initialItem,
          purchaseType: "FACTORY_ORDER",
          vendorReleaseDate: null,
        }).map((row) => ({ ...row, key: makeKey() }))
  );
  const [editContainerPages, setEditContainerPages] = useState<Record<string, EditContainerPageState>>({});
  const [containerEditPatches, setContainerEditPatches] = useState<
    Record<string, PurchaseOrderContainerEditPatchInput>
  >({});
  const [newContainerDraftsByItem, setNewContainerDraftsByItem] = useState<
    Record<string, DraftContainerRow[]>
  >({});
  const [bulkUpdateItemKey, setBulkUpdateItemKey] = useState<string | null>(null);
  const [materialTypes, setMaterialTypes] = useState<DraftMaterialTypeRow[]>(() =>
    initialOrder
      ? buildDraftMaterialTypesFromOrder(initialOrder)
      : buildFactoryMaterialTypeRows(options.materialVendors)
  );
  const [itemAttachments, setItemAttachments] = useState<DraftAttachmentRow[]>(() =>
    initialOrder ? buildDraftItemAttachmentsFromOrder(initialOrder) : []
  );
  const [editingCell, setEditingCell] = useState<EditableCellKey | null>(null);
  const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedSupplier = useMemo(
    () => options.suppliers.find((option) => option.id === form.supplierId),
    [form.supplierId, options.suppliers]
  );
  const selectedOwner = useMemo(
    () => options.owners.find((option) => option.id === form.ownerId),
    [form.ownerId, options.owners]
  );
  const itemAttachmentOptions = useMemo(() => {
    const sizeMap = new Map(options.sizeCodes.map((option) => [option.id, option.code]));
    const typeMap = new Map(options.typeCodes.map((option) => [option.id, option.code]));
    const conditionMap = new Map(options.conditions.map((option) => [option.id, option.code]));

    return items.map((item, index) => {
      const sizeType = `${sizeMap.get(item.containerSizeCodeId ?? "") ?? "-"}${typeMap.get(item.containerTypeCodeId ?? "") ?? ""}` || "-";
      const condition = conditionMap.get(item.containerConditionCodeId ?? "") ?? "-";
      const color = item.color?.trim() || "-";
      return {
        value: item.itemKey,
        label: `Line ${index + 1} · ${sizeType || "-"} · ${condition} · ${color}`,
      };
    });
  }, [items, options.conditions, options.sizeCodes, options.typeCodes]);
  const useServerPagedContainerEditing = Boolean(
    isEditMode && initialOrder && initialOrder.orderStatus !== "DRAFT"
  );
  const factoryUsesInternalContainerNumbering =
    form.purchaseType === "FACTORY_ORDER" &&
    selectedOwner?.usesInternalContainerNumbering === true;
  const previousItemsRef = useRef<Map<string, DraftItemRow>>(
    new Map(
      (initialOrder ? initialDraftItems : [initialItem]).map((item) => [
        item.itemKey,
        item,
      ])
    )
  );
  const previousPurchaseTypeRef = useRef<PurchaseType>(
    initialOrder?.purchaseType ?? "FACTORY_ORDER"
  );
  const initialOrderItemsByKey = useMemo(
    () =>
      new Map(
        initialDraftItems.map((item) => [item.itemKey, item] as const)
      ),
    [initialDraftItems]
  );

  useEffect(() => {
    const previousItemsByKey = previousItemsRef.current;
    const previousPurchaseType = previousPurchaseTypeRef.current;
    if (useServerPagedContainerEditing) {
      setNewContainerDraftsByItem((current) =>
        syncNewContainerDraftsWithItems({
          current,
          items,
          previousItemsByKey,
          previousPurchaseType,
          purchaseType: form.purchaseType,
        })
      );
    } else {
      setContainers((current) =>
        syncContainersWithItems({
          current,
          items,
          previousItemsByKey,
          previousPurchaseType,
          purchaseType: form.purchaseType,
          vendorReleaseDate: form.vendorReleaseDate,
        })
      );
    }
    previousItemsRef.current = new Map(items.map((item) => [item.itemKey, item]));
    previousPurchaseTypeRef.current = form.purchaseType;
  }, [form.purchaseType, form.vendorReleaseDate, items, useServerPagedContainerEditing]);

  async function loadEditContainerPage(itemKey: string, page = 1, pageSize = 20) {
    if (!useServerPagedContainerEditing || !initialOrder) {
      setEditContainerPages((current) => ({
        ...current,
        [itemKey]: {
          itemId: itemKey,
          page,
          pageSize,
          totalCount: current[itemKey]?.totalCount ?? 0,
          rows: current[itemKey]?.rows ?? [],
          loading: false,
        },
      }));
      return;
    }
    setEditContainerPages((current) => ({
      ...current,
      [itemKey]: {
        itemId: itemKey,
        page,
        pageSize,
        totalCount: current[itemKey]?.totalCount ?? 0,
        rows: current[itemKey]?.rows ?? [],
        loading: true,
      },
    }));
    try {
      const result = await getPurchaseOrderEditContainerPage(initialOrder.id, itemKey, page, pageSize);
      setEditContainerPages((current) => ({
        ...current,
        [itemKey]: {
          ...result,
          loading: false,
        },
      }));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not load containers",
        description: getErrorMessage(error),
      });
      setEditContainerPages((current) => ({
        ...current,
        [itemKey]: {
          itemId: itemKey,
          page,
          pageSize,
          totalCount: current[itemKey]?.totalCount ?? 0,
          rows: current[itemKey]?.rows ?? [],
          loading: false,
        },
      }));
    }
  }

  const totals = useMemo(
    () =>
      computeTotals(
        items.map((item) => ({
          ...item,
          lineAmount: computeLineAmount(item.plannedQty, item.unitPrice),
        }))
      ),
    [items]
  );

  const sizeTypeOptions = useMemo(
    () =>
      options.sizeCodes.flatMap((size) =>
        options.typeCodes.map((type) => ({
          value: `${size.id}:${type.id}`,
          label: `${size.code}${type.code}`,
          sizeId: size.id,
          typeId: type.id,
        }))
      ),
    [options.sizeCodes, options.typeCodes]
  );

  const locationMap = useMemo(
    () => new Map(options.locations.map((location) => [location.id, location.code])),
    [options.locations]
  );
  const depotMap = useMemo(
    () => new Map(options.depots.map((depot) => [depot.id, depot.code])),
    [options.depots]
  );
  const conditionMap = useMemo(
    () => new Map(options.conditions.map((condition) => [condition.id, condition.code])),
    [options.conditions]
  );
  const sizeTypeMap = useMemo(
    () => new Map(sizeTypeOptions.map((option) => [option.value, option.label])),
    [sizeTypeOptions]
  );

  const generatedOrderNo = useMemo(() => {
    if (initialOrder) return initialOrder.orderNo;
    if (!selectedSupplier) return "PO___00001";
    const sequence = getNextPurchaseOrderSequence({
      existingOrderNumbers: options.existingOrderNumbers,
      supplierCode: selectedSupplier.vendorCode,
      supplierName: companyLabel(selectedSupplier),
      purchaseDate: form.purchaseDate,
    });
    return generatePurchaseOrderNumber({
      supplierCode: selectedSupplier.vendorCode,
      supplierName: companyLabel(selectedSupplier),
      purchaseDate: form.purchaseDate,
      sequence,
    });
  }, [form.purchaseDate, initialOrder, options.existingOrderNumbers, selectedSupplier]);

  const editableFieldSet: PurchaseEditFieldSet =
    resolvedEditPermissions?.editableFieldSet ?? "all";
  const fullEditAllowed = editableFieldSet === "all";
  const canSaveDraftLikeChanges = isEditMode
    ? Boolean(resolvedEditPermissions?.canSaveDraftLikeChanges)
    : true;
  const canSubmitChanges = isEditMode
    ? Boolean(resolvedEditPermissions?.canSubmitChanges)
    : true;
  const headerFieldsLocked = isEditMode && !fullEditAllowed;
  const financeFieldsLocked = isEditMode && !fullEditAllowed;
  const materialTypesLocked = isEditMode && !fullEditAllowed;
  const itemStructureLocked = isEditMode && !fullEditAllowed;
  const canSavePlannedPodOnly = Boolean(
    isEditMode &&
      resolvedEditPermissions?.canEditPlannedPod &&
      !resolvedEditPermissions?.canSaveDraftLikeChanges &&
      !resolvedEditPermissions?.canSubmitChanges
  );
  const showCancelQtyColumn = Boolean(
    isEditMode &&
      resolvedEditPermissions &&
      !resolvedEditPermissions.canSaveDraftLikeChanges &&
      resolvedEditPermissions.canSubmitChanges
  );
  const visibleItemColumns = useMemo(
    () =>
      PURCHASE_ITEM_COLUMNS.filter(
        (column) =>
          (column.key !== "estimatedOfflineDate" || form.purchaseType === "FACTORY_ORDER") &&
          (column.key !== "containerNumberRange" || form.purchaseType === "FACTORY_ORDER") &&
          (column.key !== "vendorReleaseNumber" || shouldShowVendorReleaseFields(form.purchaseType)) &&
          ((column.key !== "cancelQty" &&
            column.key !== "cancelledQty" &&
            column.key !== "remainingQty") ||
            showCancelQtyColumn)
      ),
    [form.purchaseType, showCancelQtyColumn]
  );
  const purchaseItemTableMinWidth = useMemo(
    () => visibleItemColumns.reduce((total, column) => total + column.width, 0),
    [visibleItemColumns]
  );

  function getDesiredActiveContainerCount(item: DraftItemRow) {
    if (!isEditMode) return Math.max(0, Math.floor(item.plannedQty ?? 0));
    return Math.max(0, Math.floor(item.plannedQty ?? 0) - Number(item.cancelledQty ?? 0));
  }

  function buildDefaultContainerDraft(item: DraftItemRow): DraftContainerRow {
    return createDraftContainerRow(
      buildDefaultDraftContainersForItem({
        itemKey: item.itemKey,
        item: {
          ...item,
          plannedQty: 1,
        },
        purchaseType: form.purchaseType,
        vendorReleaseDate: form.vendorReleaseDate,
      })[0] ?? {
        itemKey: item.itemKey,
        containerNumber: null,
        color: item.color ?? null,
        flp: item.flp,
        lbx: item.lbx,
        lockingBarsCount: item.lockingBarsCount,
        ventsCount: item.ventsCount,
        machineType: item.machineType ?? null,
        yom: item.yom ?? null,
        estimatedOfflineDate:
          form.purchaseType === "FACTORY_ORDER" ? item.estimatedOfflineDate ?? null : null,
        offlineDate: item.offlineDate ?? null,
        tareWeight: item.tareWeight ?? null,
        maximumWeight: item.maximumWeight ?? null,
        cscNumber: item.cscNumber ?? null,
      }
    );
  }

  function getDisplayContainersForItem(item: DraftItemRow) {
    if (!useServerPagedContainerEditing || !initialOrder) {
      const pageState = editContainerPages[item.itemKey] ?? {
        itemId: item.itemKey,
        page: 1,
        pageSize: 20,
        totalCount: 0,
        rows: [],
        loading: false,
      };
      const localRows = containers.filter((row) => row.itemKey === item.itemKey);
      const start = (pageState.page - 1) * pageState.pageSize;
      return localRows.slice(start, start + pageState.pageSize);
    }

    const pageState = editContainerPages[item.itemKey] ?? {
      itemId: item.itemKey,
      page: 1,
      pageSize: 20,
      totalCount: 0,
      rows: [],
      loading: false,
    };
    const desiredActiveCount = getDesiredActiveContainerCount(item);
    const pageStart = (pageState.page - 1) * pageState.pageSize;
    const pageEnd = pageStart + pageState.pageSize;
    const changedFields = getChangedDraftContainerSharedFields({
      previousItem: initialOrderItemsByKey.get(item.itemKey),
      nextItem: item,
      purchaseType: form.purchaseType,
    });
    const sharedFieldValues = buildDraftContainerSharedFieldsFromItem(item, form.purchaseType);
    const existingRows = pageState.rows.map((row) => {
      const patch = containerEditPatches[row.id];
      const draft = patchToDraftContainerRow(row, patch);
      return {
        ...draft,
        ...Object.fromEntries(
          ITEM_OWNED_DRAFT_CONTAINER_FIELDS
            .filter((field) => changedFields.has(field))
            .map((field) => [field, sharedFieldValues[field]])
        ),
      };
    });

    if (pageEnd <= pageState.totalCount) {
      return existingRows;
    }

    const newDrafts = newContainerDraftsByItem[item.itemKey] ?? [];
    const newRowsBeforePage = Math.max(0, pageStart - pageState.totalCount);
    const newRowsOnPageCount = Math.max(
      0,
      Math.min(desiredActiveCount, pageEnd) - Math.max(pageState.totalCount, pageStart)
    );

    const syntheticRows = Array.from({ length: newRowsOnPageCount }, (_, index) => {
      return (
        newDrafts[newRowsBeforePage + index] ??
        buildDefaultContainerDraft(item)
      );
    });

    return [...existingRows, ...syntheticRows];
  }

  function canEditItemColumn(column: EditableCellKey["column"]) {
    if (column === "plannedPod") {
      return !isEditMode || Boolean(resolvedEditPermissions?.canEditPlannedPod);
    }
    if (editableFieldSet === "all") return true;
    if (editableFieldSet === "factory_progress_limited") {
      return FACTORY_PROGRESS_EDITABLE_COLUMNS.has(column);
    }
    return false;
  }

  function canEditContainerColumn(column: EditableContainerField) {
    if (editableFieldSet === "all") return true;
    if (editableFieldSet === "factory_progress_limited") {
      return FACTORY_PROGRESS_EDITABLE_CONTAINER_COLUMNS.has(column);
    }
    return false;
  }

  function updateForm<K extends keyof DraftFormState>(key: K, value: DraftFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applySupplier(option: PurchaseDraftSupplierOption | null) {
    setSupplierInput(option?.label ?? "");
    setForm((current) => ({
      ...current,
      supplierId: option?.id ?? null,
      settlementPaymentTerm: option?.settlementPaymentTerm ?? null,
      settlementCreditDays: option?.settlementCreditDays ?? null,
      settlementCreditLimit: option?.settlementCreditLimit ?? null,
      settlementAdvancePaymentPercentage: option?.settlementAdvancePaymentPercentage ?? null,
      settlementBalanceTriggerEvent: option?.settlementBalanceTriggerEvent ?? null,
      settlementCurrency: option?.settlementCurrency ?? "USD",
      settlementPrepaymentPool: option?.settlementPrepaymentPool ?? true,
      settlementPrepaymentThreshold: option?.settlementPrepaymentThreshold ?? null,
      settlementCurrentPrepaidBalance: option?.settlementCurrentPrepaidBalance ?? null,
      vendorBankInformation: option?.vendorBankInformation ?? null,
    }));
  }

  function handlePurchaseTypeChange(value: PurchaseType) {
    setForm((current) => ({
      ...current,
      purchaseType: value,
      estimatedOfflineTime: shouldShowEstimatedOfflineTime(value)
        ? current.estimatedOfflineTime
        : null,
      freeday: shouldShowVendorReleaseFields(value) ? current.freeday : null,
      vendorReleaseDate: shouldShowVendorReleaseFields(value)
        ? current.vendorReleaseDate
        : null,
    }));
    setItems((current) =>
      current.map((item) =>
        ({
          ...item,
          vendorReleaseNumber: shouldShowVendorReleaseFields(value)
            ? item.vendorReleaseNumber
            : null,
          containerConditionCodeId: item.conditionDirty
            ? item.containerConditionCodeId
            : findConditionIdByCode(options.conditions, getDefaultConditionCode(value)),
          flp: item.flpDirty ? item.flp : getDefaultFlp(value),
          lbx: item.lbxDirty ? item.lbx : getDefaultLbx(value),
          lockingBarsCount: item.lockingBarsDirty
            ? item.lockingBarsCount
            : getDefaultLockingBars(value),
          yom: item.yomDirty ? item.yom : getDefaultYom(value),
        })
      )
    );
    if (!shouldShowMaterialTypes(value)) {
      setMaterialTypes([]);
      return;
    }
    setMaterialTypes(buildFactoryMaterialTypeRows(options.materialVendors));
  }

  function handlePaymentModeChange(value: PurchasePaymentMode) {
    setForm((current) => ({
      ...current,
      paymentMode: value,
      settlementAdvancePaymentPercentage:
        value === "ADVANCE_PAYMENT" ? current.settlementAdvancePaymentPercentage : null,
      settlementCreditDays: value === "CREDIT" ? current.settlementCreditDays : null,
      settlementCreditLimit: value === "CREDIT" ? current.settlementCreditLimit : null,
      settlementPrepaymentPool:
        value === "PREPAYMENT"
          ? current.settlementPrepaymentPool ?? true
          : current.settlementPrepaymentPool,
    }));
  }

  function updateItem(
    key: string,
    updater: (current: DraftItemRow) => DraftItemRow
  ) {
    setItems((current) =>
      current.map((item) => (item.key === key ? updater(item) : item))
    );
  }

  function addItem() {
    if (itemStructureLocked) return;
    setItems((current) => [...current, createEmptyItem(form.purchaseType, options.conditions)]);
  }

  function removeItem(key: string) {
    if (itemStructureLocked) return;
    setItems((current) => current.filter((item) => item.key !== key));
    setContainers((current) => current.filter((container) => container.itemKey !== key));
    setItemAttachments((current) =>
      current.filter((attachment) => attachment.purchaseOrderItemId !== key)
    );
    setEditContainerPages((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    setNewContainerDraftsByItem((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (expandedItemKey === key) {
      setExpandedItemKey(null);
    }
  }

  function addItemAttachment() {
    setItemAttachments((current) => [
      ...current,
      {
        key: makeKey(),
        purchaseOrderItemId: null,
        attachmentType: "",
        url: "",
        remark: null,
      },
    ]);
  }

  function updateItemAttachment(
    key: string,
    updater: (current: DraftAttachmentRow) => DraftAttachmentRow
  ) {
    setItemAttachments((current) =>
      current.map((attachment) => (attachment.key === key ? updater(attachment) : attachment))
    );
  }

  function removeItemAttachment(key: string) {
    setItemAttachments((current) => current.filter((attachment) => attachment.key !== key));
  }

  function activateCell(rowKey: string, column: EditableCellKey["column"]) {
    if (!canEditItemColumn(column)) return;
    setEditingCell({ rowKey, column });
  }

  function deactivateCell() {
    setEditingCell(null);
  }

  function updateContainer(
    key: string,
    updater: (current: DraftContainerRow) => DraftContainerRow
  ) {
    if (useServerPagedContainerEditing && initialOrder) {
      const existingPageRow = Object.values(editContainerPages)
        .flatMap((page) => page.rows)
        .find((row) => row.id === key);
      if (existingPageRow) {
        const currentDraft = patchToDraftContainerRow(existingPageRow, containerEditPatches[key]);
        const nextDraft = updater(currentDraft);
        const nextPatch: PurchaseOrderContainerEditPatchInput = {
          id: key,
          itemKey: nextDraft.itemKey,
        };

        if (nextDraft.containerNumber !== existingPageRow.containerNumber) {
          nextPatch.containerNumber = nextDraft.containerNumber;
        }
        if (nextDraft.machineType !== existingPageRow.machineType) {
          nextPatch.machineType = nextDraft.machineType;
        }
        if (nextDraft.yom !== existingPageRow.yom) {
          nextPatch.yom = nextDraft.yom;
        }
        if (nextDraft.estimatedOfflineDate !== existingPageRow.estimatedOfflineDate) {
          nextPatch.estimatedOfflineDate = nextDraft.estimatedOfflineDate;
        }
        if (nextDraft.offlineDate !== existingPageRow.offlineDate) {
          nextPatch.offlineDate = nextDraft.offlineDate;
        }
        if (nextDraft.tareWeight !== existingPageRow.tareWeight) {
          nextPatch.tareWeight = nextDraft.tareWeight;
        }
        if (nextDraft.maximumWeight !== existingPageRow.maximumWeight) {
          nextPatch.maximumWeight = nextDraft.maximumWeight;
        }
        if (nextDraft.cscNumber !== existingPageRow.cscNumber) {
          nextPatch.cscNumber = nextDraft.cscNumber;
        }
        setContainerEditPatches((current) => ({
          ...current,
          [key]: nextPatch,
        }));
        return;
      }

      setNewContainerDraftsByItem((current) => {
        const next = { ...current };
        for (const [itemKey, rows] of Object.entries(current)) {
          const rowIndex = rows.findIndex((row) => row.key === key);
          if (rowIndex === -1) continue;
          const updatedRows = [...rows];
          updatedRows[rowIndex] = updater(updatedRows[rowIndex]!);
          next[itemKey] = updatedRows;
          break;
        }
        return next;
      });
      return;
    }

    setContainers((current) =>
      current.map((row) => (row.key === key ? updater(row) : row))
    );
  }

  function validateManualContainerNumbers(requireFactoryContainerNumbers = false) {
    if (form.purchaseType === "FACTORY_ORDER" && factoryUsesInternalContainerNumbering) return;
    const containerRows = useServerPagedContainerEditing && initialOrder
      ? [
          ...Object.values(containerEditPatches),
          ...Object.values(newContainerDraftsByItem).flat(),
        ]
      : containers;
    const invalidContainer = containerRows.find(
      (container) => !isValidManualContainerNumber(container.containerNumber)
    );
    if (invalidContainer) {
      throw new Error("Container Number must match 4 letters followed by 7 digits.");
    }
    if (
      requireFactoryContainerNumbers &&
      form.purchaseType === "FACTORY_ORDER" &&
      !factoryUsesInternalContainerNumbering
    ) {
      const missingContainer = containerRows.find((container) => !container.containerNumber?.trim());
      if (missingContainer) {
        throw new Error(
          "Container Number is required for factory orders when the owner uses manual numbering."
        );
      }
    }
  }

  async function handleSaveDraft() {
    if (!canSaveDraftLikeChanges && !canSavePlannedPodOnly) return;
    setSaving(true);
    try {
      validateManualContainerNumbers(false);
      const payload: PurchaseOrderDraftInput = {
        ...form,
        orderNo: generatedOrderNo,
        items: items.map((item) => ({
          ...item,
          lineAmount: computeLineAmount(item.plannedQty, item.unitPrice),
        })),
        containers:
          useServerPagedContainerEditing && initialOrder
            ? []
            : containers.map(({ key, ...container }) => container),
        containerEdits:
          useServerPagedContainerEditing && initialOrder
            ? Object.values(containerEditPatches)
            : undefined,
        newContainers:
          useServerPagedContainerEditing && initialOrder
            ? Object.values(newContainerDraftsByItem).flat().map(({ key, ...container }) => container)
            : undefined,
        itemAttachments: itemAttachments.map(({ key, id, ...attachment }) => ({
          ...attachment,
          url: attachment.url.trim(),
          remark: attachment.remark?.trim() || null,
        })),
        materialTypes,
      };
      const result =
        isEditMode && initialOrder
          ? await (canSaveDraftLikeChanges
              ? updatePurchaseOrderDraft(initialOrder.id, payload)
              : updatePurchaseOrderPending(initialOrder.id, payload))
          : await createPurchaseOrderDraft(payload);
      toast({
        title: isEditMode ? "Purchase order updated" : "Draft saved",
        description: isEditMode
          ? `${result.orderNo} has been updated.`
          : `${result.orderNo} has been created as DRAFT.`,
      });
      router.push(`/purchase/po-management/${result.orderId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not save purchase order draft",
        description: getErrorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitOrder() {
    if (!canSubmitChanges) return;
    setSubmitting(true);
    try {
      validateManualContainerNumbers(true);
      const payload: PurchaseOrderDraftInput = {
        ...form,
        orderNo: generatedOrderNo,
        items: items.map((item) => ({
          ...item,
          lineAmount: computeLineAmount(item.plannedQty, item.unitPrice),
        })),
        containers:
          useServerPagedContainerEditing && initialOrder
            ? []
            : containers.map(({ key, ...container }) => container),
        containerEdits:
          useServerPagedContainerEditing && initialOrder
            ? Object.values(containerEditPatches)
            : undefined,
        newContainers:
          useServerPagedContainerEditing && initialOrder
            ? Object.values(newContainerDraftsByItem).flat().map(({ key, ...container }) => container)
            : undefined,
        itemAttachments: itemAttachments.map(({ key, id, ...attachment }) => ({
          ...attachment,
          url: attachment.url.trim(),
          remark: attachment.remark?.trim() || null,
        })),
        materialTypes,
      };
      const result =
        isEditMode && initialOrder
          ? await (resolvedEditPermissions?.canSaveDraftLikeChanges
              ? submitPurchaseOrderDraftUpdate(initialOrder.id, payload)
              : submitPurchaseOrderPending(initialOrder.id, payload))
          : await createPurchaseOrderSubmit(payload);
      toast({
        title: isEditMode ? "Purchase order updated" : "Purchase order submitted",
        description: `${result.orderNo} has been submitted as ${result.orderStatus}.`,
      });
      router.push(`/purchase/po-management/${result.orderId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Could not submit purchase order",
        description: getErrorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {isEditMode ? "Edit Purchase Order" : "Create Purchase Order"}
            </h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <RequiredLabel>PO Number</RequiredLabel>
              <Input readOnly value={generatedOrderNo} className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <RequiredLabel required>Purchase Type</RequiredLabel>
              <Select
                value={form.purchaseType}
                onValueChange={(value) => handlePurchaseTypeChange(value as PurchaseType)}
                disabled={headerFieldsLocked}
              >
                <SelectTrigger data-testid="purchase-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AutocompleteFilterInput
              label="Supplier"
              required
              placeholder="Vendor code or vendor name"
              options={options.suppliers}
              value={form.supplierId ?? ""}
              inputValue={supplierInput}
              onInputChange={(value) => {
                setSupplierInput(value);
                updateForm("supplierId", null);
              }}
              onSelect={(option) => applySupplier((option as PurchaseDraftSupplierOption | null) ?? null)}
              onClear={() => applySupplier(null)}
              emptyMessage="No matching suppliers."
              disabled={saving || headerFieldsLocked}
            />

            <div className="space-y-1.5">
              <RequiredLabel required>Owner</RequiredLabel>
              <Select
                value={form.ownerId ?? "__empty__"}
                onValueChange={(value) => updateForm("ownerId", value === "__empty__" ? null : value)}
                disabled={headerFieldsLocked}
              >
                <SelectTrigger
                  data-testid="purchase-owner-trigger"
                  className="[&>span]:flex-1 [&>span]:text-left"
                >
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Select owner</SelectItem>
                  {options.owners.map((owner) => (
                    <SelectItem key={owner.id} value={owner.id}>
                      {owner.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.purchaseType === "FACTORY_ORDER" && selectedOwner ? (
                <p className="text-xs text-muted-foreground">
                  {selectedOwner.usesInternalContainerNumbering
                    ? "Container numbers will be auto-generated on Submit for this owner."
                    : "This owner uses manual container numbering. Enter container numbers before Submit."}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <RequiredLabel required>Buyer</RequiredLabel>
              <Select
                value={form.buyerId ?? "__empty__"}
                onValueChange={(value) => updateForm("buyerId", value === "__empty__" ? null : value)}
                disabled={headerFieldsLocked}
              >
                <SelectTrigger
                  data-testid="purchase-buyer-trigger"
                  className="[&>span]:flex-1 [&>span]:text-left"
                >
                  <SelectValue placeholder="Select buyer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty__">Unassigned</SelectItem>
                  {options.buyers.map((buyer) => (
                    <SelectItem key={buyer.id} value={buyer.id}>
                      {buyer.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <RequiredLabel required>Purchase Date</RequiredLabel>
              <Input
                type="date"
                value={form.purchaseDate ?? ""}
                onChange={(event) => updateForm("purchaseDate", event.target.value || null)}
                disabled={headerFieldsLocked}
              />
            </div>

            {!shouldShowVendorReleaseFields(form.purchaseType) ? (
              <>
                <div className="space-y-1.5">
                  <RequiredLabel>Contract Number</RequiredLabel>
                  <Input
                    value={form.contractNumber ?? ""}
                    onChange={(event) => updateForm("contractNumber", event.target.value || null)}
                    disabled={headerFieldsLocked}
                  />
                </div>

                <div className="space-y-1.5">
                  <RequiredLabel>Invoice Number</RequiredLabel>
                  <Input
                    value={form.invoiceNumber ?? ""}
                    onChange={(event) => updateForm("invoiceNumber", event.target.value || null)}
                    disabled={headerFieldsLocked}
                  />
                </div>
              </>
            ) : null}

            {shouldShowVendorReleaseFields(form.purchaseType) ? (
              <>
                <div className="space-y-1.5">
                  <RequiredLabel>Freeday</RequiredLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.freeday ?? ""}
                    onChange={(event) => updateForm("freeday", parseNumberInput(event.target.value))}
                    disabled={headerFieldsLocked}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
              <RequiredLabel>Remark</RequiredLabel>
              <Textarea
                value={form.remark ?? ""}
                onChange={(event) => updateForm("remark", event.target.value || null)}
                disabled={headerFieldsLocked}
              />
            </div>
          </CardContent>
        </Card>

        {shouldShowMaterialTypes(form.purchaseType) ? (
          <Card>
            <CardHeader>
              <CardTitle>Material Vendors</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 xl:grid-cols-2">
              {materialTypes.map((row) => {
                const availableVendors = options.materialVendors.filter(
                  (vendor) => vendor.materialCategory === row.materialType
                );
                return (
                  <div
                    key={row.key}
                    className="grid gap-3 rounded-lg border p-3 md:grid-cols-[140px_minmax(0,1fr)] md:items-center"
                  >
                    <Input readOnly className="h-9 bg-muted/50" value={row.materialType} />

                    <Select
                      value={row.materialVendorId ?? "__empty__"}
                      disabled={materialTypesLocked}
                      onValueChange={(value) =>
                        setMaterialTypes((current) =>
                          current.map((entry) =>
                            entry.key === row.key
                              ? { ...entry, materialVendorId: value === "__empty__" ? null : value }
                              : entry
                          )
                        )
                      }
                    >
                      <SelectTrigger className="h-9 w-full justify-between px-3 text-left [&>span]:block [&>span]:overflow-hidden [&>span]:text-ellipsis [&>span]:text-left [&>span]:whitespace-nowrap">
                        <SelectValue placeholder="Select material vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty__">Select material vendor</SelectItem>
                        {availableVendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {materialVendorLabel(vendor)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Purchase Order Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={itemStructureLocked}>
              <Plus className="mr-1 size-4" />
              Add Line
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
            <div className="border-b bg-muted/20" style={{ minWidth: purchaseItemTableMinWidth }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: visibleItemColumns.map((column) => `${column.width}px`).join(" "),
                }}
              >
                  {visibleItemColumns.map((column) =>
                    column.key === "actions" ? (
                      <div
                        key={column.key}
                        className="sticky right-0 z-10 flex h-12 items-center justify-center border-l bg-card px-2 text-center text-sm font-medium text-muted-foreground shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.18)]"
                      >
                        <span className="sticky right-0 text-muted-foreground">
                          {column.label}
                          {isRequiredItemColumn(column.key, form.purchaseType) ? (
                            <span className="ml-0.5 text-current">*</span>
                          ) : null}
                        </span>
                      </div>
                    ) : (
                      <div
                        key={column.key}
                        className="flex h-12 items-center justify-center px-2 text-center text-sm font-medium text-muted-foreground"
                      >
                        <span className="text-muted-foreground">
                          {column.label}
                          {isRequiredItemColumn(column.key, form.purchaseType) ? (
                            <span className="ml-0.5 text-current">*</span>
                          ) : null}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              <table
                className="w-full caption-bottom border-separate border-spacing-0 text-sm"
                style={{ minWidth: purchaseItemTableMinWidth }}
              >
                <colgroup>
                  {visibleItemColumns.map((column) => (
                    <col key={column.key} style={{ width: column.width }} />
                  ))}
                </colgroup>
                <TableBody>
                {items.map((item, index) => {
                  const selectedSizeType =
                    item.containerSizeCodeId && item.containerTypeCodeId
                      ? `${item.containerSizeCodeId}:${item.containerTypeCodeId}`
                      : null;
                  const itemContainers = getDisplayContainersForItem(item);
                  const containersExpanded = expandedItemKey === item.itemKey;
                  const editContainerPage = editContainerPages[item.itemKey] ?? {
                    itemId: item.itemKey,
                    page: 1,
                    pageSize: 20,
                    totalCount: 0,
                    rows: [],
                    loading: false,
                  };
                  const desiredActiveContainerCount = getDesiredActiveContainerCount(item);
                  const totalContainerPages = Math.max(
                    1,
                    Math.ceil(desiredActiveContainerCount / editContainerPage.pageSize)
                  );
                  const filteredDepots = options.depots.filter(
                    (depot) => !item.locationCityId || depot.cityId === item.locationCityId
                  );
                  const isEditing = (column: EditableCellKey["column"]) =>
                    editingCell?.rowKey === item.key && editingCell.column === column;

                  return (
                <Fragment key={item.key}>
                <TableRow>
                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("location")}
                      value={item.locationCityId}
                      display={displayValue(locationMap.get(item.locationCityId ?? ""))}
                      testId={`purchase-item-${index}-location`}
                      options={options.locations.map((location) => ({
                        value: location.id,
                        label: [location.code, location.name].filter(Boolean).join(" · "),
                        searchText: `${location.code} ${location.name}`,
                      }))}
                      onActivate={() => activateCell(item.key, "location")}
                      onDeactivate={deactivateCell}
                      onCommit={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          locationCityId: value,
                          depotId:
                            value && options.depots.some((depot) => depot.id === current.depotId && depot.cityId === value)
                              ? current.depotId
                              : null,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("depot")}
                      value={item.depotId}
                      display={displayValue(depotMap.get(item.depotId ?? ""))}
                      testId={`purchase-item-${index}-depot`}
                      options={filteredDepots.map((depot) => ({
                        value: depot.id,
                        label: [depot.code, depot.name].filter(Boolean).join(" · "),
                        searchText: `${depot.code} ${depot.name}`,
                      }))}
                      onActivate={() => activateCell(item.key, "depot")}
                      onDeactivate={deactivateCell}
                      onCommit={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          depotId: value,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("sizeType")}
                      value={selectedSizeType}
                      display={displayValue(selectedSizeType ? sizeTypeMap.get(selectedSizeType) : null)}
                      testId={`purchase-item-${index}-size-type`}
                      options={sizeTypeOptions.map((option) => ({
                        value: option.value,
                        label: option.label,
                        searchText: option.label,
                      }))}
                      onActivate={() => activateCell(item.key, "sizeType")}
                      onDeactivate={deactivateCell}
                      onCommit={(value) =>
                        updateItem(item.key, (current) => {
                          if (!value) {
                            return {
                              ...current,
                              containerSizeCodeId: null,
                              containerTypeCodeId: null,
                            };
                          }
                          const [sizeId, typeId] = value.split(":");
                          return {
                            ...current,
                            containerSizeCodeId: sizeId,
                            containerTypeCodeId: typeId,
                          };
                        })
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("condition")}
                      value={item.containerConditionCodeId}
                      display={displayValue(conditionMap.get(item.containerConditionCodeId ?? ""))}
                      testId={`purchase-item-${index}-condition`}
                      options={options.conditions.map((condition) => ({
                        value: condition.id,
                        label: condition.code,
                        searchText: condition.code,
                      }))}
                      onActivate={() => activateCell(item.key, "condition")}
                      onDeactivate={deactivateCell}
                      onCommit={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          containerConditionCodeId: value,
                          conditionDirty: true,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("color")}
                      value={item.color}
                      display={displayValue(item.color)}
                      testId={`purchase-item-${index}-color`}
                      options={options.colors.map((color) => ({
                        value: color,
                        label: color,
                        searchText: color,
                      }))}
                      onActivate={() => activateCell(item.key, "color")}
                      onDeactivate={deactivateCell}
                      onCommit={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          color: value,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableSelectCell
                      active={isEditing("flp")}
                      value={item.flp ? "FLP" : "-"}
                      display={item.flp ? "FLP" : "-"}
                      options={[
                        { value: "FLP", label: "FLP" },
                        { value: "-", label: "-" },
                      ]}
                      onActivate={() => activateCell(item.key, "flp")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          flp: value === "FLP",
                          flpDirty: true,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableSelectCell
                      active={isEditing("lbx")}
                      value={item.lbx ? "LBX" : "-"}
                      display={item.lbx ? "LBX" : "-"}
                      options={[
                        { value: "LBX", label: "LBX" },
                        { value: "-", label: "-" },
                      ]}
                      onActivate={() => activateCell(item.key, "lbx")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          lbx: value === "LBX",
                          lbxDirty: true,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableSelectCell
                      active={isEditing("lockingBars")}
                      value={item.lockingBarsCount != null ? String(item.lockingBarsCount) : ""}
                      display={
                        item.lockingBarsCount != null ? `${item.lockingBarsCount} Locking Bars` : "-"
                      }
                      options={[
                        { value: "", label: "-" },
                        { value: "3", label: "3 Locking Bars" },
                        { value: "4", label: "4 Locking Bars" },
                      ]}
                      onActivate={() => activateCell(item.key, "lockingBars")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          lockingBarsCount: value ? Number(value) : null,
                          lockingBarsDirty: true,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("vents")}
                      value={item.ventsCount != null ? String(item.ventsCount) : ""}
                      display={displayValue(item.ventsCount)}
                      testId={`purchase-item-${index}-vents`}
                      type="number"
                      disableSpinner
                      onActivate={() => activateCell(item.key, "vents")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          ventsCount: parseNumberInput(value),
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("machineType")}
                      value={item.machineType ?? ""}
                      display={displayValue(item.machineType)}
                      testId={`purchase-item-${index}-machine-type`}
                      onActivate={() => activateCell(item.key, "machineType")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          machineType: value || null,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("yom")}
                      value={item.yom != null ? String(item.yom) : ""}
                      display={displayValue(item.yom)}
                      testId={`purchase-item-${index}-yom`}
                      type="number"
                      disableSpinner
                      onActivate={() => activateCell(item.key, "yom")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          yom: parseNumberInput(value),
                          yomDirty: true,
                        }))
                      }
                    />
                  </TableCell>

                  {form.purchaseType === "FACTORY_ORDER" ? (
                    <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                      <EditableInputCell
                        active={isEditing("estimatedOfflineDate")}
                        value={item.estimatedOfflineDate ?? ""}
                        display={displayValue(item.estimatedOfflineDate)}
                        testId={`purchase-item-${index}-estimated-offline-date`}
                        type="date"
                        onActivate={() => activateCell(item.key, "estimatedOfflineDate")}
                        onDeactivate={deactivateCell}
                        onChange={(value) =>
                          updateItem(item.key, (current) => ({
                            ...current,
                            estimatedOfflineDate: value || null,
                          }))
                        }
                      />
                    </TableCell>
                  ) : null}

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("tareWeight")}
                      value={item.tareWeight != null ? String(item.tareWeight) : ""}
                      display={displayWeight(item.tareWeight)}
                      testId={`purchase-item-${index}-tare-weight`}
                      type="number"
                      disableSpinner
                      preventWheelChange
                      onActivate={() => activateCell(item.key, "tareWeight")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          tareWeight: parseNumberInput(value),
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("maximumWeight")}
                      value={item.maximumWeight != null ? String(item.maximumWeight) : ""}
                      display={displayWeight(item.maximumWeight)}
                      testId={`purchase-item-${index}-maximum-weight`}
                      type="number"
                      disableSpinner
                      preventWheelChange
                      onActivate={() => activateCell(item.key, "maximumWeight")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          maximumWeight: parseNumberInput(value),
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <div className="flex h-10 items-center justify-center px-2 text-sm">
                      {displayWeight(
                        item.tareWeight != null && item.maximumWeight != null
                          ? item.maximumWeight - item.tareWeight
                          : null
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("cscNumber")}
                      value={item.cscNumber ?? ""}
                      display={displayValue(item.cscNumber)}
                      testId={`purchase-item-${index}-csc-number`}
                      onActivate={() => activateCell(item.key, "cscNumber")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          cscNumber: value || null,
                        }))
                      }
                    />
                  </TableCell>

                  {form.purchaseType === "FACTORY_ORDER" ? (
                    <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                      <div className="flex h-10 items-center justify-center px-2 text-sm">
                        {displayValue(item.containerNumberRange)}
                      </div>
                    </TableCell>
                  ) : null}

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("plannedQty")}
                      value={String(item.plannedQty)}
                      display={displayValue(item.plannedQty)}
                      testId={`purchase-item-${index}-planned-qty`}
                      type="number"
                      disableSpinner
                      onActivate={() => activateCell(item.key, "plannedQty")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => {
                          const plannedQty = Number(value || 0);
                          return {
                            ...current,
                            plannedQty,
                            lineAmount: computeLineAmount(plannedQty, current.unitPrice),
                          };
                        })
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("unitPrice")}
                      value={item.unitPrice != null ? String(item.unitPrice) : ""}
                      display={displayValue(item.unitPrice)}
                      testId={`purchase-item-${index}-unit-price`}
                      type="number"
                      disableSpinner
                      preventWheelChange
                      onActivate={() => activateCell(item.key, "unitPrice")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => {
                          const unitPrice = parseNumberInput(value);
                          return {
                            ...current,
                            unitPrice,
                            lineAmount: computeLineAmount(current.plannedQty, unitPrice),
                          };
                        })
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <div className="flex h-10 items-center justify-center px-2 text-sm">
                      {computeLineAmount(item.plannedQty, item.unitPrice).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </TableCell>

                  {showCancelQtyColumn ? (
                    <>
                      <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.cancelQty ?? ""}
                          className="h-8 border-0 px-2 text-center shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          onChange={(event) =>
                            updateItem(item.key, (current) => ({
                              ...current,
                              cancelQty: parseNumberInput(event.target.value),
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                        <div className="flex h-10 items-center justify-center px-2 text-sm">
                          {displayValue(item.cancelledQty)}
                        </div>
                      </TableCell>
                      <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                        <div className="flex h-10 items-center justify-center px-2 text-sm">
                          {displayValue(item.remainingQty)}
                        </div>
                      </TableCell>
                    </>
                  ) : null}

                  {shouldShowVendorReleaseFields(form.purchaseType) ? (
                    <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                      <EditableInputCell
                        active={isEditing("vendorReleaseNumber")}
                        value={item.vendorReleaseNumber ?? ""}
                        display={displayValue(item.vendorReleaseNumber)}
                        testId={`purchase-item-${index}-vendor-release-number`}
                        onActivate={() => activateCell(item.key, "vendorReleaseNumber")}
                        onDeactivate={deactivateCell}
                        onChange={(value) =>
                          updateItem(item.key, (current) => ({
                            ...current,
                            vendorReleaseNumber: value || null,
                          }))
                        }
                      />
                    </TableCell>
                  ) : null}

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("offlineDate")}
                      value={item.offlineDate ?? ""}
                      display={displayValue(item.offlineDate)}
                      testId={`purchase-item-${index}-offline-date`}
                      type="date"
                      onActivate={() => activateCell(item.key, "offlineDate")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          offlineDate: value || null,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("plannedPod")}
                      value={item.plannedPod ?? ""}
                      display={displayValue(item.plannedPod)}
                      testId={`purchase-item-${index}-planned-pod`}
                      onActivate={() => activateCell(item.key, "plannedPod")}
                      onDeactivate={deactivateCell}
                      onChange={(value) =>
                        updateItem(item.key, (current) => ({
                          ...current,
                          plannedPod: value || null,
                        }))
                      }
                    />
                  </TableCell>

                  <TableCell className="sticky right-0 z-10 h-11 border-b border-l bg-card px-1 py-0 text-center align-middle shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.18)]">
                    <div className="flex h-9 items-center justify-center gap-1 px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        data-testid={`purchase-item-${index}-edit`}
                        onClick={async () => {
                          const nextOpen = expandedItemKey !== item.itemKey;
                          setExpandedItemKey(nextOpen ? item.itemKey : null);
                          if (nextOpen) {
                            await loadEditContainerPage(
                              item.itemKey,
                              editContainerPage.page,
                              editContainerPage.pageSize
                            );
                          }
                        }}
                      >
                        Edit
                      </Button>
                      {!useServerPagedContainerEditing ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          data-testid={`purchase-item-${index}-delete`}
                          onClick={() => removeItem(item.key)}
                          aria-label="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                      {useServerPagedContainerEditing ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          data-testid={`purchase-item-${index}-bulk-update`}
                          onClick={() => setBulkUpdateItemKey(item.itemKey)}
                        >
                          Bulk Update
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
                {containersExpanded ? (
                <TableRow>
                  <TableCell colSpan={visibleItemColumns.length} className="border-b bg-muted/10 px-3 py-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Page Size</span>
                            <Select
                              value={String(editContainerPage.pageSize)}
                              onValueChange={(value) =>
                                void loadEditContainerPage(item.itemKey, 1, Number(value))
                              }
                            >
                              <SelectTrigger
                                className="h-8 w-[90px]"
                                data-testid={`purchase-item-${index}-container-page-size`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[10, 20, 50, 100].map((value) => (
                                  <SelectItem key={value} value={String(value)}>
                                    {value}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            Containers for line {index + 1}: {desiredActiveContainerCount}
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <div
                          className="grid border border-border bg-background"
                          style={{
                            gridTemplateColumns:
                              form.purchaseType === "FACTORY_ORDER"
                                ? "180px 100px 170px 160px 130px 90px 90px 140px 90px 160px 120px 140px 130px 150px"
                                : "180px 100px 160px 130px 90px 90px 140px 90px 160px 120px 140px 130px 150px",
                          }}
                        >
                          {[
                            "Container Number",
                            "YOM",
                            ...(form.purchaseType === "FACTORY_ORDER"
                              ? ["Estimated Offline Date"]
                              : []),
                            "Offline Date / Release Date",
                            "Color",
                            "FLP",
                            "LBX",
                            "Locking Bars",
                            "Vents",
                            "Machine Type",
                            "Tare Weight",
                            "Maximum Weight",
                            "Payload Weight",
                            "CSC Number",
                          ].map((label) => (
                            <div
                              key={label}
                              className="flex h-10 items-center justify-center border-b border-r bg-muted/20 px-2 text-center text-xs font-medium text-muted-foreground last:border-r-0"
                            >
                              {label === "Container Number" ? (
                                <div className="flex items-center justify-center gap-1">
                                  <span>{label}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-6"
                                    aria-label="Copy all container numbers"
                                    onClick={() => {
                                      const numbers = itemContainers
                                        .map((container) => container.containerNumber?.trim() ?? "")
                                        .filter(Boolean)
                                        .join("\n");
                                      if (!numbers) {
                                        toast({
                                          title: "No container numbers to copy on this page.",
                                        });
                                        return;
                                      }
                                      void navigator.clipboard.writeText(numbers);
                                      toast({ title: "All container numbers on this page copied." });
                                    }}
                                  >
                                    <Copy className="size-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                label
                              )}
                            </div>
                          ))}
                          {itemContainers.map((container) => (
                            <Fragment key={container.key}>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2 text-center text-sm last:border-r-0">
                                {form.purchaseType === "FACTORY_ORDER" && factoryUsesInternalContainerNumbering ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">
                                      {container.containerNumber || "Auto-generated"}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={container.containerNumber ?? ""}
                                      disabled={!fullEditAllowed}
                                      onChange={(event) =>
                                        updateContainer(container.key, (current) => ({
                                          ...current,
                                          containerNumber: event.target.value.toUpperCase() || null,
                                        }))
                                      }
                                      className="h-8 border-0 px-2 text-center shadow-none"
                                      placeholder="ABCD1234567"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Input
                                  type="number"
                                  value={container.yom ?? ""}
                                  disabled={!fullEditAllowed}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      yom: parseNumberInput(event.target.value),
                                    }))
                                  }
                                  className="[appearance:textfield] h-8 border-0 px-2 text-center shadow-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                              {form.purchaseType === "FACTORY_ORDER" ? (
                                <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                  <Input
                                    type="date"
                                    value={container.estimatedOfflineDate ?? ""}
                                    readOnly={!canEditContainerColumn("estimatedOfflineDate")}
                                    disabled={!canEditContainerColumn("estimatedOfflineDate")}
                                    onChange={(event) =>
                                      updateContainer(container.key, (current) => ({
                                        ...current,
                                        estimatedOfflineDate: event.target.value || null,
                                      }))
                                    }
                                    className="h-8 border-0 px-2 text-center shadow-none"
                                  />
                                </div>
                              ) : null}
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Input
                                  type="date"
                                  value={container.offlineDate ?? ""}
                                  readOnly={form.purchaseType !== "FACTORY_ORDER" || !canEditContainerColumn("offlineDate")}
                                  disabled={!canEditContainerColumn("offlineDate")}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      offlineDate: event.target.value || null,
                                    }))
                                  }
                                  className="h-8 border-0 px-2 text-center shadow-none"
                                />
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <div className="flex h-8 items-center justify-center text-sm">
                                  {displayValue(container.color)}
                                </div>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <div className="flex h-8 items-center justify-center text-sm">
                                  {container.flp ? "FLP" : "-"}
                                </div>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <div className="flex h-8 items-center justify-center text-sm">
                                  {container.lbx ? "LBX" : "-"}
                                </div>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <div className="flex h-8 items-center justify-center text-sm">
                                  {container.lockingBarsCount != null ? `${container.lockingBarsCount} Locking Bars` : "-"}
                                </div>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <div className="flex h-8 items-center justify-center text-sm">
                                  {displayValue(container.ventsCount)}
                                </div>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b px-2">
                                <Input
                                  value={container.machineType ?? ""}
                                  disabled={!fullEditAllowed}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      machineType: event.target.value || null,
                                    }))
                                  }
                                  className="h-8 border-0 px-2 text-center shadow-none"
                                />
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-l px-2">
                                <Input
                                  type="number"
                                  value={container.tareWeight ?? ""}
                                  disabled={!canEditContainerColumn("tareWeight")}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      tareWeight: parseNumberInput(event.target.value),
                                    }))
                                  }
                                  className="[appearance:textfield] h-8 border-0 px-2 text-center shadow-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-l px-2">
                                <Input
                                  type="number"
                                  value={container.maximumWeight ?? ""}
                                  disabled={!canEditContainerColumn("maximumWeight")}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      maximumWeight: parseNumberInput(event.target.value),
                                    }))
                                  }
                                  className="[appearance:textfield] h-8 border-0 px-2 text-center shadow-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-l px-2 text-sm">
                                {displayWeight(
                                  container.tareWeight != null &&
                                    container.maximumWeight != null
                                    ? container.maximumWeight - container.tareWeight
                                    : null
                                )}
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-l px-2">
                                <Input
                                  value={container.cscNumber ?? ""}
                                  disabled={!canEditContainerColumn("cscNumber")}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      cscNumber: event.target.value || null,
                                    }))
                                  }
                                  className="h-8 border-0 px-2 text-center shadow-none"
                                />
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </div>
                      <StandardTablePagination
                        summary={
                          editContainerPage.loading
                            ? "Loading containers..."
                            : `Showing ${
                                desiredActiveContainerCount === 0
                                  ? 0
                                  : (editContainerPage.page - 1) * editContainerPage.pageSize + 1
                              }-${Math.min(
                                editContainerPage.page * editContainerPage.pageSize,
                                desiredActiveContainerCount
                              )} of ${desiredActiveContainerCount} containers`
                        }
                        page={editContainerPage.page}
                        totalPages={totalContainerPages}
                        previousDisabled={editContainerPage.page <= 1 || editContainerPage.loading}
                        nextDisabled={
                          editContainerPage.page >= totalContainerPages || editContainerPage.loading
                        }
                        onPrevious={() =>
                          void loadEditContainerPage(
                            item.itemKey,
                            Math.max(1, editContainerPage.page - 1),
                            editContainerPage.pageSize
                          )
                        }
                        onNext={() =>
                          void loadEditContainerPage(
                            item.itemKey,
                            Math.min(totalContainerPages, editContainerPage.page + 1),
                            editContainerPage.pageSize
                          )
                        }
                      />
                    </div>
                  </TableCell>
                </TableRow>
                ) : null}
                </Fragment>
              );
            })}
                </TableBody>
              </table>
            </div>

            <div className="border-t bg-muted/20 px-4 py-3">
              <div className="flex flex-wrap items-center justify-end gap-4 text-sm font-medium">
              <div>Total Qty: {totals.totalPlannedQty}</div>
              <div>Total Amount: {totals.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Bank Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Vendor Bank Name</Label>
              <Input
                readOnly
                className="bg-muted/50"
                value={typeof form.vendorBankInformation?.bank_name === "string" ? form.vendorBankInformation.bank_name : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bank Number</Label>
              <Input
                readOnly
                className="bg-muted/50"
                value={typeof form.vendorBankInformation?.bank_code === "string" ? form.vendorBankInformation.bank_code : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input
                readOnly
                className="bg-muted/50"
                value={typeof form.vendorBankInformation?.bank_account_name === "string" ? form.vendorBankInformation.bank_account_name : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Account Number</Label>
              <Input
                readOnly
                className="bg-muted/50"
                value={typeof form.vendorBankInformation?.bank_account_number === "string" ? form.vendorBankInformation.bank_account_number : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label>SWIFT</Label>
              <Input
                readOnly
                className="bg-muted/50"
                value={typeof form.vendorBankInformation?.swift_code === "string" ? form.vendorBankInformation.swift_code : ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settlement Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2 xl:col-span-4">
              <div className="text-sm font-medium">A/P Overview</div>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel required>Payment Mode</RequiredLabel>
              <Select
                value={form.paymentMode ?? "__empty__"}
                onValueChange={(value) => handlePaymentModeChange(value as PurchasePaymentMode)}
                disabled={financeFieldsLocked}
              >
                <SelectTrigger data-testid="purchase-payment-mode-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_PAYMENT_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <RequiredLabel>Due Date</RequiredLabel>
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) => updateForm("dueDate", event.target.value || null)}
                disabled={financeFieldsLocked}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel>Settlement Payment Term</RequiredLabel>
              <Input
                value={form.settlementPaymentTerm ?? ""}
                onChange={(event) => updateForm("settlementPaymentTerm", event.target.value || null)}
                disabled={financeFieldsLocked}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel>Settlement Currency</RequiredLabel>
              <Input
                value={form.settlementCurrency ?? ""}
                onChange={(event) => updateForm("settlementCurrency", event.target.value || null)}
                disabled={financeFieldsLocked}
              />
            </div>
            <div className="space-y-1.5">
              <RequiredLabel>Balance Trigger Event</RequiredLabel>
              <Input
                value={form.settlementBalanceTriggerEvent ?? ""}
                onChange={(event) =>
                  updateForm("settlementBalanceTriggerEvent", event.target.value || null)
                }
                disabled={financeFieldsLocked}
              />
            </div>

            {form.paymentMode === "PREPAYMENT" ? (
              <>
                <div className="space-y-1.5">
                  <RequiredLabel>Prepayment Pool</RequiredLabel>
                  <Select
                    value={form.settlementPrepaymentPool === false ? "NO" : "YES"}
                    onValueChange={(value) => updateForm("settlementPrepaymentPool", value === "YES")}
                    disabled={financeFieldsLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">Yes</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Prepayment Threshold</RequiredLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.settlementPrepaymentThreshold ?? ""}
                    onChange={(event) =>
                      updateForm("settlementPrepaymentThreshold", parseNumberInput(event.target.value))
                    }
                    disabled={financeFieldsLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Current Prepaid Balance</RequiredLabel>
                  <Input
                    readOnly
                    className="bg-muted/50"
                    type="number"
                    step="0.01"
                    value={form.settlementCurrentPrepaidBalance ?? ""}
                  />
                </div>
              </>
            ) : null}

            {form.paymentMode === "ADVANCE_PAYMENT" ? (
              <>
                <div className="space-y-1.5">
                  <RequiredLabel>Advance Payment Percentage</RequiredLabel>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.settlementAdvancePaymentPercentage ?? ""}
                    onChange={(event) =>
                      updateForm(
                        "settlementAdvancePaymentPercentage",
                        parseNumberInput(event.target.value)
                      )
                    }
                    disabled={financeFieldsLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Prepayment Pool</RequiredLabel>
                  <Select
                    value={form.settlementPrepaymentPool ? "YES" : "NO"}
                    onValueChange={(value) => updateForm("settlementPrepaymentPool", value === "YES")}
                    disabled={financeFieldsLocked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YES">Yes</SelectItem>
                      <SelectItem value="NO">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Prepayment Threshold</RequiredLabel>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.settlementPrepaymentThreshold ?? ""}
                    onChange={(event) =>
                      updateForm("settlementPrepaymentThreshold", parseNumberInput(event.target.value))
                    }
                    disabled={financeFieldsLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Current Prepaid Balance</RequiredLabel>
                  <Input
                    readOnly
                    className="bg-muted/50"
                    type="number"
                    step="0.01"
                    value={form.settlementCurrentPrepaidBalance ?? ""}
                  />
                </div>
              </>
            ) : null}

            {form.paymentMode === "CREDIT" ? (
              <>
                <div className="space-y-1.5">
                  <RequiredLabel>Credit Days</RequiredLabel>
                  <Input
                    type="number"
                    min="0"
                    value={form.settlementCreditDays ?? ""}
                    onChange={(event) =>
                      updateForm("settlementCreditDays", parseNumberInput(event.target.value))
                    }
                    disabled={financeFieldsLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Credit Limit</RequiredLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.settlementCreditLimit ?? ""}
                    onChange={(event) =>
                      updateForm("settlementCreditLimit", parseNumberInput(event.target.value))
                    }
                    disabled={financeFieldsLocked}
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>PO Item Attachments</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItemAttachment}
              disabled={itemStructureLocked}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Attachment
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {itemAttachments.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                No attachments added yet.
              </div>
            ) : (
              itemAttachments.map((attachment, index) => (
                <div
                  key={attachment.key}
                  className="rounded-lg border p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">Attachment {index + 1}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemAttachment(attachment.key)}
                      disabled={itemStructureLocked}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1.5">
                      <RequiredLabel required>PO Item</RequiredLabel>
                      <Select
                        value={attachment.purchaseOrderItemId ?? "__empty__"}
                        onValueChange={(value) =>
                          updateItemAttachment(attachment.key, (current) => ({
                            ...current,
                            purchaseOrderItemId: value === "__empty__" ? null : value,
                          }))
                        }
                        disabled={itemStructureLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose PO item" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Choose PO item</SelectItem>
                          {itemAttachmentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <RequiredLabel required>Document Type</RequiredLabel>
                      <Select
                        value={attachment.attachmentType || "__empty__"}
                        onValueChange={(value) =>
                          updateItemAttachment(attachment.key, (current) => ({
                            ...current,
                            attachmentType:
                              value === "__empty__"
                                ? ""
                                : (value as PurchaseOrderItemAttachmentType),
                          }))
                        }
                        disabled={itemStructureLocked}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose document type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__empty__">Choose document type</SelectItem>
                          {PURCHASE_ORDER_ATTACHMENT_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <RequiredLabel required>Attachment URL</RequiredLabel>
                      <Input
                        value={attachment.url}
                        onChange={(event) =>
                          updateItemAttachment(attachment.key, (current) => ({
                            ...current,
                            url: event.target.value,
                          }))
                        }
                        placeholder="https://example.com/vendor-release.pdf"
                        disabled={itemStructureLocked}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
                      <Label>Remark</Label>
                      <Input
                        value={attachment.remark ?? ""}
                        onChange={(event) =>
                          updateItemAttachment(attachment.key, (current) => ({
                            ...current,
                            remark: event.target.value || null,
                          }))
                        }
                        placeholder="Optional remark"
                        disabled={itemStructureLocked}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <PurchaseContainerBulkUpdateModal
          open={Boolean(bulkUpdateItemKey)}
          onOpenChange={(open) => {
            if (!open) setBulkUpdateItemKey(null);
          }}
          itemKey={bulkUpdateItemKey ?? ""}
          allowEstimatedOfflineDate={form.purchaseType === "FACTORY_ORDER"}
          allowedFields={
            fullEditAllowed
              ? [
                  "yom",
                  "estimatedOfflineDate",
                  "offlineDate",
                  "machineType",
                  "tareWeight",
                  "maximumWeight",
                  "cscNumber",
                ]
              : [
                  "estimatedOfflineDate",
                  "offlineDate",
                  "tareWeight",
                  "maximumWeight",
                  "cscNumber",
                ]
          }
          onResolveRows={async (containerNumbers) => {
            if (!bulkUpdateItemKey) return [];
            if (useServerPagedContainerEditing && initialOrder) {
              return getPurchaseOrderEditContainersByNumbers(
                initialOrder.id,
                bulkUpdateItemKey,
                containerNumbers
              );
            }
            const normalizedNumbers = new Set(
              containerNumbers.map((value) => value.trim().toUpperCase()).filter(Boolean)
            );
            return containers
              .filter(
                (row) =>
                  row.itemKey === bulkUpdateItemKey &&
                  normalizedNumbers.has((row.containerNumber ?? "").trim().toUpperCase())
              )
              .map((row) => ({
                id: row.key,
                purchaseOrderId: initialOrder?.id ?? "",
                purchaseOrderItemId: row.itemKey,
                containerNumber: row.containerNumber,
                locationCityId: null,
                depotId: null,
                containerSizeCodeId: null,
                containerTypeCodeId: null,
                containerConditionCodeId: null,
                color: row.color,
                flp: row.flp,
                lbx: row.lbx,
                lockingBarsCount: row.lockingBarsCount,
                ventsCount: row.ventsCount,
                machineType: row.machineType,
                yom: row.yom,
                estimatedOfflineDate: row.estimatedOfflineDate,
                offlineDate: row.offlineDate,
                plannedPod: null,
                tareWeight: row.tareWeight,
                maximumWeight: row.maximumWeight,
                payloadWeight: null,
                cscNumber: row.cscNumber,
                purchasePrice: null,
                financialCost: null,
                containerStatus: null,
                itemStatus: null,
                remark: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));
          }}
          onApply={(patches) => {
            if (useServerPagedContainerEditing) {
              setContainerEditPatches((current) => {
                const next = { ...current };
                for (const patch of patches) {
                  next[patch.id] = {
                    ...(current[patch.id] ?? {}),
                    ...patch,
                  };
                }
                return next;
              });
              return;
            }
            setContainers((current) =>
              current.map((row) => {
                const patch = patches.find((candidate) => candidate.id === row.key);
                if (!patch) return row;
                return {
                  ...row,
                  containerNumber: patch.containerNumber ?? row.containerNumber,
                  machineType: patch.machineType ?? row.machineType,
                  yom: patch.yom ?? row.yom,
                  estimatedOfflineDate: patch.estimatedOfflineDate ?? row.estimatedOfflineDate,
                  offlineDate: patch.offlineDate ?? row.offlineDate,
                  tareWeight: patch.tareWeight ?? row.tareWeight,
                  maximumWeight: patch.maximumWeight ?? row.maximumWeight,
                  cscNumber: patch.cscNumber ?? row.cscNumber,
                };
              })
            );
          }}
        />

        <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-card p-4 shadow-sm">
          <Button asChild variant="outline">
            <Link href={isEditMode && initialOrder ? `/purchase/po-management/${initialOrder.id}` : "/purchase/po-management"}>
              Cancel
            </Link>
          </Button>
          {canSaveDraftLikeChanges || canSavePlannedPodOnly ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleSaveDraft()}
              disabled={saving || submitting}
            >
              {isEditMode ? "Save Changes" : "Save Draft"}
            </Button>
          ) : null}
          {canSubmitChanges ? (
            <Button type="button" onClick={() => void handleSubmitOrder()} disabled={saving || submitting}>
              Submit Order
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
