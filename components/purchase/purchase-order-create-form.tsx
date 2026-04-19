"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createPurchaseOrderDraft,
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
  PurchaseOrderEditPermissions,
  PurchaseOrderDetail,
  PurchaseOrderDraftContainerInput,
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
  conditionDirty: boolean;
  flpDirty: boolean;
  lbxDirty: boolean;
  lockingBarsDirty: boolean;
  yomDirty: boolean;
};

type DraftContainerRow = PurchaseOrderDraftContainerInput & {
  key: string;
};

type DraftMaterialTypeRow = PurchaseDraftMaterialTypeInput & {
  key: string;
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
    | "tareWeight"
    | "maximumWeight"
    | "payloadWeight"
    | "cscNumber"
    | "plannedQty"
    | "unitPrice"
    | "offlineDate";
};

type EditableContainerField = "offlineDate" | "tareWeight" | "maximumWeight" | "cscNumber";

const FACTORY_PROGRESS_EDITABLE_COLUMNS = new Set<EditableCellKey["column"]>([
  "offlineDate",
  "tareWeight",
  "maximumWeight",
  "cscNumber",
]);

const FACTORY_PROGRESS_EDITABLE_CONTAINER_COLUMNS = new Set<EditableContainerField>([
  "offlineDate",
  "tareWeight",
  "maximumWeight",
  "cscNumber",
]);

type DraftFormState = Omit<
  PurchaseOrderDraftInput,
  "orderNo" | "items" | "containers" | "materialTypes" | "vendorBankInformation"
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
    offlineDate: null,
    tareWeight: null,
    maximumWeight: null,
    cscNumber: null,
    plannedQty: 0,
    unitPrice: null,
    lineAmount: 0,
    remark: null,
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

function syncContainersWithItems(input: {
  current: DraftContainerRow[];
  items: DraftItemRow[];
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
    for (let index = 0; index < count; index += 1) {
      const base = defaults[index];
      const prior = existing[index];
      next.push(
        prior
          ? {
              ...prior,
              itemKey: item.itemKey,
              offlineDate:
                input.purchaseType === "FACTORY_ORDER"
                  ? prior.offlineDate ?? base.offlineDate
                  : input.vendorReleaseDate ?? null,
            }
          : createDraftContainerRow(base)
      );
    }
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
  { key: "tareWeight", label: "Tare Weight", width: 120 },
  { key: "maximumWeight", label: "Maximum Weight", width: 140 },
  { key: "payloadWeight", label: "Payload Weight", width: 130 },
  { key: "cscNumber", label: "CSC Number", width: 150 },
  { key: "plannedQty", label: "Planned Qty", width: 120 },
  { key: "unitPrice", label: "Unit Price", width: 130 },
  { key: "lineAmount", label: "Line Amount", width: 140 },
  { key: "offlineDate", label: "Offline Date / Release Date", width: 170 },
  { key: "actions", label: "Actions", width: 180 },
] as const;

const PURCHASE_ITEM_TABLE_MIN_WIDTH = PURCHASE_ITEM_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

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
}: {
  value?: string | number | null;
  placeholder?: string;
  onActivate: () => void;
  disabled?: boolean;
}) {
  const content = displayValue(value, placeholder);
  return (
    <button
      type="button"
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
}: {
  active: boolean;
  value: string;
  display: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  disabled?: boolean;
}) {
  const EMPTY_SENTINEL = "__empty__";
  if (!active || disabled) {
    return <CellDisplayButton value={display} onActivate={onActivate} disabled={disabled} />;
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
}) {
  if (!active || disabled) {
    return <CellDisplayButton value={display} onActivate={onActivate} disabled={disabled} />;
  }

  return (
    <Input
      autoFocus
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
    vendorReleaseNumber: null,
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
    vendorReleaseNumber: order.vendorReleaseNumber,
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
    offlineDate: item.offlineDate,
    tareWeight: item.tareWeight,
    maximumWeight: item.maximumWeight,
    cscNumber: item.cscNumber,
    plannedQty: item.plannedQty,
    unitPrice: item.unitPrice,
    lineAmount: item.lineAmount,
    remark: item.remark,
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

export function PurchaseOrderCreateForm({
  options,
  initialOrder = null,
  mode = "create",
  editPermissions,
}: Props) {
  const initialItem = useMemo(
    () =>
      initialOrder
        ? buildDraftItemsFromOrder(initialOrder)[0] ?? createEmptyItem(initialOrder.purchaseType, options.conditions)
        : createEmptyItem("FACTORY_ORDER", options.conditions),
    [initialOrder, options.conditions]
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
    initialOrder ? buildDraftItemsFromOrder(initialOrder) : [initialItem]
  );
  const [containers, setContainers] = useState<DraftContainerRow[]>(() =>
    initialOrder
      ? initialOrder.containers.length > 0
        ? buildDraftContainersFromOrder(initialOrder)
        : syncContainersWithItems({
            current: [],
            items: buildDraftItemsFromOrder(initialOrder),
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
  const [materialTypes, setMaterialTypes] = useState<DraftMaterialTypeRow[]>(() =>
    initialOrder
      ? buildDraftMaterialTypesFromOrder(initialOrder)
      : buildFactoryMaterialTypeRows(options.materialVendors)
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
  const factoryUsesInternalContainerNumbering =
    form.purchaseType === "FACTORY_ORDER" &&
    selectedOwner?.usesInternalContainerNumbering === true;

  useEffect(() => {
    setContainers((current) =>
      syncContainersWithItems({
        current,
        items,
        purchaseType: form.purchaseType,
        vendorReleaseDate: form.vendorReleaseDate,
      })
    );
  }, [form.purchaseType, form.vendorReleaseDate, items]);

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

  function canEditItemColumn(column: EditableCellKey["column"]) {
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
      vendorReleaseNumber: shouldShowVendorReleaseFields(value)
        ? current.vendorReleaseNumber
        : null,
      vendorReleaseDate: shouldShowVendorReleaseFields(value)
        ? current.vendorReleaseDate
        : null,
    }));
    setItems((current) =>
      current.map((item) =>
        ({
          ...item,
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
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));
    setContainers((current) => current.filter((row) => row.itemKey !== key));
    setExpandedItemKey((current) => (current === key ? null : current));
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
    setContainers((current) =>
      current.map((row) => (row.key === key ? updater(row) : row))
    );
  }

  function validateManualContainerNumbers(requireFactoryContainerNumbers = false) {
    if (form.purchaseType === "FACTORY_ORDER" && factoryUsesInternalContainerNumbering) return;
    const invalidContainer = containers.find(
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
      const missingContainer = containers.find((container) => !container.containerNumber?.trim());
      if (missingContainer) {
        throw new Error(
          "Container Number is required for factory orders when the owner uses manual numbering."
        );
      }
    }
  }

  async function handleSaveDraft() {
    if (!canSaveDraftLikeChanges) return;
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
        containers: [],
        materialTypes,
      };
      const result =
        isEditMode && initialOrder
          ? await updatePurchaseOrderDraft(initialOrder.id, payload)
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
        containers: containers.map(({ key, ...container }) => container),
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
                <SelectTrigger>
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
                <SelectTrigger className="[&>span]:flex-1 [&>span]:text-left">
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
                <SelectTrigger className="[&>span]:flex-1 [&>span]:text-left">
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

            {shouldShowEstimatedOfflineTime(form.purchaseType) ? (
              <div className="space-y-1.5">
                <RequiredLabel>Estimated Offline Date</RequiredLabel>
                <Input
                  type="date"
                  value={form.estimatedOfflineTime ?? ""}
                  onChange={(event) => updateForm("estimatedOfflineTime", event.target.value || null)}
                  disabled={headerFieldsLocked}
                />
              </div>
            ) : null}

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
                <div className="space-y-1.5">
                  <RequiredLabel>Vendor Release Number</RequiredLabel>
                  <Input
                    value={form.vendorReleaseNumber ?? ""}
                    onChange={(event) => updateForm("vendorReleaseNumber", event.target.value || null)}
                    disabled={headerFieldsLocked}
                  />
                </div>
                <div className="space-y-1.5">
                  <RequiredLabel>Vendor Release Date</RequiredLabel>
                  <Input
                    type="date"
                    value={form.vendorReleaseDate ?? ""}
                    onChange={(event) => updateForm("vendorReleaseDate", event.target.value || null)}
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
            <div className="border-b bg-muted/20" style={{ minWidth: PURCHASE_ITEM_TABLE_MIN_WIDTH }}>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: PURCHASE_ITEM_COLUMNS.map((column) => `${column.width}px`).join(" "),
                }}
              >
                  {PURCHASE_ITEM_COLUMNS.map((column) =>
                    column.key === "actions" ? (
                      <div
                        key={column.key}
                        className="sticky right-0 z-[80] flex h-12 items-center justify-center border-l bg-card px-2 text-center text-sm font-medium text-muted-foreground shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.18)]"
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
                style={{ minWidth: PURCHASE_ITEM_TABLE_MIN_WIDTH }}
              >
                <colgroup>
                  {PURCHASE_ITEM_COLUMNS.map((column) => (
                    <col key={column.key} style={{ width: column.width }} />
                  ))}
                </colgroup>
                <TableBody>
                {items.map((item, index) => {
                  const selectedSizeType =
                    item.containerSizeCodeId && item.containerTypeCodeId
                      ? `${item.containerSizeCodeId}:${item.containerTypeCodeId}`
                      : null;
                  const itemContainers = containers.filter((row) => row.itemKey === item.itemKey);
                  const containersExpanded = expandedItemKey === item.itemKey;
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

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("tareWeight")}
                      value={item.tareWeight != null ? String(item.tareWeight) : ""}
                      display={displayWeight(item.tareWeight)}
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

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("plannedQty")}
                      value={String(item.plannedQty)}
                      display={displayValue(item.plannedQty)}
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

                  <TableCell className="h-11 border-b px-1 py-0 text-center align-middle">
                    <EditableInputCell
                      active={isEditing("offlineDate")}
                      value={item.offlineDate ?? ""}
                      display={displayValue(item.offlineDate)}
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

                  <TableCell className="sticky right-0 z-[70] h-11 border-b border-l bg-card px-1 py-0 text-center align-middle shadow-[-12px_0_16px_-12px_hsl(var(--foreground)/0.18)]">
                    <div className="flex h-9 items-center justify-center gap-1 px-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() =>
                          setExpandedItemKey((current) =>
                            current === item.itemKey ? null : item.itemKey
                          )
                        }
                      >
                        {containersExpanded ? "Close Containers" : "Edit Containers"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.key)}
                        disabled={itemStructureLocked}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {containersExpanded ? (
                <TableRow>
                  <TableCell colSpan={PURCHASE_ITEM_COLUMNS.length} className="border-b bg-muted/10 px-3 py-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Containers for line {index + 1}: {itemContainers.length}
                      </div>
                      <div className="overflow-x-auto">
                        <div
                          className="grid min-w-[1480px] border border-border bg-background"
                          style={{
                            gridTemplateColumns:
                              "180px 100px 160px 130px 90px 90px 140px 90px 160px 120px 140px 130px 150px",
                          }}
                        >
                          {[
                            "Container Number",
                            "YOM",
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
                              {label}
                            </div>
                          ))}
                          {itemContainers.map((container) => (
                            <Fragment key={container.key}>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2 text-center text-sm last:border-r-0">
                                {form.purchaseType === "FACTORY_ORDER" && factoryUsesInternalContainerNumbering ? (
                                  <span className="text-muted-foreground">
                                    {container.containerNumber || "Auto-generated"}
                                  </span>
                                ) : (
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
                                <Select
                                  value={container.color ?? "__empty__"}
                                  disabled={!fullEditAllowed}
                                  onValueChange={(value) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      color: value === "__empty__" ? null : value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 border-0 px-2 text-center shadow-none">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__empty__">-</SelectItem>
                                    {options.colors.map((color) => (
                                      <SelectItem key={color} value={color}>
                                        {color}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Select
                                  value={container.flp ? "FLP" : "-"}
                                  disabled={!fullEditAllowed}
                                  onValueChange={(value) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      flp: value === "FLP",
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 border-0 px-2 text-center shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="FLP">FLP</SelectItem>
                                    <SelectItem value="-">-</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Select
                                  value={container.lbx ? "LBX" : "-"}
                                  disabled={!fullEditAllowed}
                                  onValueChange={(value) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      lbx: value === "LBX",
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 border-0 px-2 text-center shadow-none">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="LBX">LBX</SelectItem>
                                    <SelectItem value="-">-</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Select
                                  value={container.lockingBarsCount != null ? String(container.lockingBarsCount) : "__empty__"}
                                  disabled={!fullEditAllowed}
                                  onValueChange={(value) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      lockingBarsCount: value === "__empty__" ? null : Number(value),
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-8 border-0 px-2 text-center shadow-none">
                                    <SelectValue placeholder="-" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__empty__">-</SelectItem>
                                    <SelectItem value="3">3 Locking Bars</SelectItem>
                                    <SelectItem value="4">4 Locking Bars</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex min-h-10 items-center justify-center border-b border-r px-2">
                                <Input
                                  type="number"
                                  value={container.ventsCount ?? ""}
                                  disabled={!fullEditAllowed}
                                  onChange={(event) =>
                                    updateContainer(container.key, (current) => ({
                                      ...current,
                                      ventsCount: parseNumberInput(event.target.value),
                                    }))
                                  }
                                  className="[appearance:textfield] h-8 border-0 px-2 text-center shadow-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
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
              <div>Total Planned Qty: {totals.totalPlannedQty}</div>
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
                <SelectTrigger>
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

        <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border bg-card p-4 shadow-sm">
          <Button asChild variant="outline">
            <Link href={isEditMode && initialOrder ? `/purchase/po-management/${initialOrder.id}` : "/purchase/po-management"}>
              Cancel
            </Link>
          </Button>
          {canSaveDraftLikeChanges ? (
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
