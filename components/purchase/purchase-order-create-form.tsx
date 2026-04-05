"use client";

import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createPurchaseOrderDraft,
  type PurchaseDraftFormOptions,
  type PurchaseDraftMaterialVendorOption,
  type PurchaseDraftSupplierOption,
} from "@/app/purchase/po-management/actions";
import {
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
import type {
  PurchaseBankInformationSnapshot,
  PurchaseDraftMaterialTypeInput,
  PurchaseOrderDraftInput,
  PurchaseOrderDraftItemInput,
  PurchasePaymentMode,
  PurchaseType,
} from "@/types/purchase";

type Props = {
  options: PurchaseDraftFormOptions;
};

type DraftItemRow = PurchaseOrderDraftItemInput & {
  key: string;
  conditionDirty: boolean;
  flpDirty: boolean;
  lbxDirty: boolean;
  lockingBarsDirty: boolean;
  yomDirty: boolean;
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
    | "plannedQty"
    | "unitPrice"
    | "offlineDate";
};

type DraftFormState = Omit<
  PurchaseOrderDraftInput,
  "orderNo" | "items" | "materialTypes" | "vendorBankInformation"
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

function findConditionIdByCode(options: PurchaseDraftFormOptions["conditions"], code: string) {
  return options.find((option) => option.code === code)?.id ?? null;
}

function createEmptyItem(
  purchaseType: PurchaseType,
  conditions: PurchaseDraftFormOptions["conditions"]
): DraftItemRow {
  const defaultYear =
    purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER"
      ? new Date().getFullYear()
      : null;
  const defaultToggle = purchaseType === "FACTORY_ORDER" || purchaseType === "NEW_CONTAINER";
  return {
    key: makeKey(),
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

function companyLabel(option: PurchaseDraftSupplierOption | undefined) {
  if (!option) return "";
  return option.vendorName ?? option.vendorCode ?? option.label;
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

function displayValue(value?: string | number | null, placeholder = "-") {
  if (value == null || value === "") return placeholder;
  return String(value);
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
  { key: "plannedQty", label: "Planned Qty", width: 120 },
  { key: "unitPrice", label: "Unit Price", width: 130 },
  { key: "lineAmount", label: "Line Amount", width: 140 },
  { key: "offlineDate", label: "Offline Date / Release Date", width: 170 },
  { key: "actions", label: "Actions", width: 90 },
] as const;

const PURCHASE_ITEM_TABLE_MIN_WIDTH = PURCHASE_ITEM_COLUMNS.reduce(
  (total, column) => total + column.width,
  0
);

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function CellDisplayButton({
  value,
  placeholder = "-",
  onActivate,
}: {
  value?: string | number | null;
  placeholder?: string;
  onActivate: () => void;
}) {
  const content = displayValue(value, placeholder);
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "flex h-10 w-full items-center justify-center px-2 text-center text-sm",
        "hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-ring"
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
}: {
  active: boolean;
  value: string;
  display: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const EMPTY_SENTINEL = "__empty__";
  if (!active) {
    return <CellDisplayButton value={display} onActivate={onActivate} />;
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
  onChange,
  onActivate,
  onDeactivate,
}: {
  active: boolean;
  value: string;
  display: string;
  type?: "text" | "number" | "date";
  disableSpinner?: boolean;
  onChange: (value: string) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  if (!active) {
    return <CellDisplayButton value={display} onActivate={onActivate} />;
  }

  return (
    <Input
      autoFocus
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onDeactivate}
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
}: {
  active: boolean;
  value: string | null;
  display: string;
  options: { value: string; label: string; searchText?: string }[];
  onCommit: (value: string | null) => void;
  onActivate: () => void;
  onDeactivate: () => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(display);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setQuery(display);
    setOpen(true);
    setHighlightedIndex(0);
  }, [active, display]);

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

  if (!active) {
    return <CellDisplayButton value={display} placeholder={placeholder} onActivate={onActivate} />;
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
        className="z-[120] max-h-52 w-[var(--radix-popover-trigger-width)] overflow-auto rounded-none border border-border bg-popover p-0 shadow-md"
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

export function PurchaseOrderCreateForm({ options }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<DraftFormState>(buildInitialFinanceState);
  const [supplierInput, setSupplierInput] = useState("");
  const [items, setItems] = useState<DraftItemRow[]>([
    createEmptyItem("FACTORY_ORDER", options.conditions),
  ]);
  const [materialTypes, setMaterialTypes] = useState<DraftMaterialTypeRow[]>(
    buildFactoryMaterialTypeRows(options.materialVendors)
  );
  const [editingCell, setEditingCell] = useState<EditableCellKey | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedSupplier = useMemo(
    () => options.suppliers.find((option) => option.id === form.supplierId),
    [form.supplierId, options.suppliers]
  );

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
  }, [form.purchaseDate, options.existingOrderNumbers, selectedSupplier]);

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
    setItems((current) => [...current, createEmptyItem(form.purchaseType, options.conditions)]);
  }

  function removeItem(key: string) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.key !== key)));
  }

  function activateCell(rowKey: string, column: EditableCellKey["column"]) {
    setEditingCell({ rowKey, column });
  }

  function deactivateCell() {
    setEditingCell(null);
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      const payload: PurchaseOrderDraftInput = {
        ...form,
        orderNo: generatedOrderNo,
        items: items.map((item) => ({
          ...item,
          lineAmount: computeLineAmount(item.plannedQty, item.unitPrice),
        })),
        materialTypes,
      };
      const result = await createPurchaseOrderDraft(payload);
      toast({
        title: "Draft saved",
        description: `${result.orderNo} has been created as DRAFT.`,
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Create Purchase Order</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/purchase/po-management">Cancel</Link>
            </Button>
            <Button type="button" onClick={() => void handleSaveDraft()} disabled={saving}>
              Save Draft
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label>PO Number</Label>
              <Input readOnly value={generatedOrderNo} className="bg-muted/50" />
            </div>

            <div className="space-y-1.5">
              <Label>Purchase Type</Label>
              <Select value={form.purchaseType} onValueChange={(value) => handlePurchaseTypeChange(value as PurchaseType)}>
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
              disabled={saving}
            />

            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select
                value={form.ownerId ?? "__empty__"}
                onValueChange={(value) => updateForm("ownerId", value === "__empty__" ? null : value)}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-1.5">
              <Label>Buyer</Label>
              <Select
                value={form.buyerId ?? "__empty__"}
                onValueChange={(value) => updateForm("buyerId", value === "__empty__" ? null : value)}
              >
                <SelectTrigger>
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
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={form.purchaseDate ?? ""}
                onChange={(event) => updateForm("purchaseDate", event.target.value || null)}
              />
            </div>

            {shouldShowEstimatedOfflineTime(form.purchaseType) ? (
              <div className="space-y-1.5">
                <Label>Estimated Offline Time</Label>
                <Input
                  type="datetime-local"
                  value={form.estimatedOfflineTime ?? ""}
                  onChange={(event) => updateForm("estimatedOfflineTime", event.target.value || null)}
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Contract Number</Label>
              <Input
                value={form.contractNumber ?? ""}
                onChange={(event) => updateForm("contractNumber", event.target.value || null)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input
                value={form.invoiceNumber ?? ""}
                onChange={(event) => updateForm("invoiceNumber", event.target.value || null)}
              />
            </div>

            {shouldShowVendorReleaseFields(form.purchaseType) ? (
              <>
                <div className="space-y-1.5">
                  <Label>Freeday</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.freeday ?? ""}
                    onChange={(event) => updateForm("freeday", parseNumberInput(event.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Release Number</Label>
                  <Input
                    value={form.vendorReleaseNumber ?? ""}
                    onChange={(event) => updateForm("vendorReleaseNumber", event.target.value || null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Release Date</Label>
                  <Input
                    type="date"
                    value={form.vendorReleaseDate ?? ""}
                    onChange={(event) => updateForm("vendorReleaseDate", event.target.value || null)}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
              <Label>Remark</Label>
              <Textarea
                value={form.remark ?? ""}
                onChange={(event) => updateForm("remark", event.target.value || null)}
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
                      <SelectTrigger className="h-9">
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
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                        {column.label}
                      </div>
                    ) : (
                      <div
                        key={column.key}
                        className="flex h-12 items-center justify-center px-2 text-center text-sm font-medium text-muted-foreground"
                      >
                        {column.label}
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
                  const filteredDepots = options.depots.filter(
                    (depot) => !item.locationCityId || depot.cityId === item.locationCityId
                  );
                  const isEditing = (column: EditableCellKey["column"]) =>
                    editingCell?.rowKey === item.key && editingCell.column === column;

                  return (
                <TableRow key={item.key}>
                  <TableCell className="h-11 border-b px-1 py-0 align-middle">
                    <EditableAutocompleteCell
                      active={isEditing("location")}
                      value={item.locationCityId}
                      display={displayValue(locationMap.get(item.locationCityId ?? ""))}
                      options={options.locations.map((location) => ({
                        value: location.id,
                        label: location.code,
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
                        label: depot.code,
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
                    <div className="flex h-9 items-center justify-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.key)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
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
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select
                value={form.paymentMode ?? "__empty__"}
                onValueChange={(value) => handlePaymentModeChange(value as PurchasePaymentMode)}
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
              <Label>Due Date</Label>
              <Input
                type="date"
                value={form.dueDate ?? ""}
                onChange={(event) => updateForm("dueDate", event.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Settlement Payment Term</Label>
              <Input
                value={form.settlementPaymentTerm ?? ""}
                onChange={(event) => updateForm("settlementPaymentTerm", event.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Settlement Currency</Label>
              <Input
                value={form.settlementCurrency ?? ""}
                onChange={(event) => updateForm("settlementCurrency", event.target.value || null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Balance Trigger Event</Label>
              <Input
                value={form.settlementBalanceTriggerEvent ?? ""}
                onChange={(event) =>
                  updateForm("settlementBalanceTriggerEvent", event.target.value || null)
                }
              />
            </div>

            {form.paymentMode === "PREPAYMENT" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Prepayment Pool</Label>
                  <Select
                    value={form.settlementPrepaymentPool === false ? "NO" : "YES"}
                    onValueChange={(value) => updateForm("settlementPrepaymentPool", value === "YES")}
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
                  <Label>Prepayment Threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.settlementPrepaymentThreshold ?? ""}
                    onChange={(event) =>
                      updateForm("settlementPrepaymentThreshold", parseNumberInput(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Prepaid Balance</Label>
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
                  <Label>Advance Payment Percentage</Label>
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
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prepayment Pool</Label>
                  <Select
                    value={form.settlementPrepaymentPool ? "YES" : "NO"}
                    onValueChange={(value) => updateForm("settlementPrepaymentPool", value === "YES")}
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
                  <Label>Prepayment Threshold</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.settlementPrepaymentThreshold ?? ""}
                    onChange={(event) =>
                      updateForm("settlementPrepaymentThreshold", parseNumberInput(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Current Prepaid Balance</Label>
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
                  <Label>Credit Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.settlementCreditDays ?? ""}
                    onChange={(event) =>
                      updateForm("settlementCreditDays", parseNumberInput(event.target.value))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Credit Limit</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.settlementCreditLimit ?? ""}
                    onChange={(event) =>
                      updateForm("settlementCreditLimit", parseNumberInput(event.target.value))
                    }
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
