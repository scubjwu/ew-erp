import type {
  PurchaseOrderDraftContainerInput,
  PurchaseDraftMaterialTypeInput,
  PurchaseMaterialType,
  PurchaseOrderDraftItemInput,
  PurchasePaymentMode,
  PurchaseType,
} from "@/types/purchase";

export const PURCHASE_TYPE_OPTIONS: Array<{
  value: PurchaseType;
  label: string;
}> = [
  { value: "FACTORY_ORDER", label: "Factory Order" },
  { value: "USED_CONTAINER", label: "Used Container" },
  { value: "NEW_CONTAINER", label: "New Container" },
];

export const PURCHASE_MATERIAL_TYPE_OPTIONS: PurchaseMaterialType[] = [
  "油漆",
  "密封胶",
  "胶条",
  "地板",
  "贴标",
  "角件",
  "锁杆",
  "底漆",
];

export const PURCHASE_PAYMENT_MODE_OPTIONS: Array<{
  value: PurchasePaymentMode;
  label: string;
}> = [
  { value: "PREPAYMENT", label: "Prepayment" },
  { value: "ADVANCE_PAYMENT", label: "Advance Payment" },
  { value: "CREDIT", label: "Credit" },
];

export function shouldShowEstimatedOfflineTime(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER";
}

export function shouldShowVendorReleaseFields(purchaseType: PurchaseType) {
  return purchaseType === "USED_CONTAINER" || purchaseType === "NEW_CONTAINER";
}

export function shouldShowMaterialTypes(purchaseType: PurchaseType) {
  return purchaseType === "FACTORY_ORDER";
}

export function getDefaultConditionCode(purchaseType: PurchaseType) {
  return purchaseType === "USED_CONTAINER" ? "CW" : "Brand New";
}

export function computeLineAmount(
  plannedQty: number | null | undefined,
  unitPrice: number | null | undefined
) {
  const qty = Number(plannedQty ?? 0);
  const price = Number(unitPrice ?? 0);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return Number((qty * price).toFixed(2));
}

export function computeTotals(items: PurchaseOrderDraftItemInput[]) {
  return items.reduce(
    (acc, item) => {
      const plannedQty = Number(item.plannedQty ?? 0);
      const lineAmount = computeLineAmount(item.plannedQty, item.unitPrice);
      return {
        totalPlannedQty: acc.totalPlannedQty + (Number.isFinite(plannedQty) ? plannedQty : 0),
        totalAmount: Number((acc.totalAmount + lineAmount).toFixed(2)),
      };
    },
    {
      totalPlannedQty: 0,
      totalAmount: 0,
    }
  );
}

export function normalizeSupplierAbbreviation(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "SUP";

  const alphaNumeric = trimmed.replace(/[^A-Za-z0-9\u4e00-\u9fff]/g, "");
  if (!alphaNumeric) return "SUP";

  const asciiOnly = alphaNumeric.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (asciiOnly.length >= 3) return asciiOnly.slice(0, 3);
  if (asciiOnly.length > 0) return asciiOnly.padEnd(3, "X");

  const chineseInitials = Array.from(alphaNumeric)
    .filter((char) => /[\u4e00-\u9fff]/.test(char))
    .map((char) => PINYIN_INITIAL_OVERRIDES[char] ?? "X")
    .join("");

  if (chineseInitials.length >= 3) return chineseInitials.slice(0, 3);
  if (chineseInitials.length > 0) return chineseInitials.padEnd(3, "X");

  return "SUP";
}

export function formatPoNumberDatePart(value: string | null | undefined, sequence = 1) {
  if (!value) return "00001";
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const month = dateOnlyMatch?.[2];
  const day = dateOnlyMatch?.[3];
  if (!month || !day) return "00001";
  const suffix = String(Math.max(1, Math.min(9, sequence)));
  return `${month}${day}${suffix}`;
}

export function generatePurchaseOrderNumber(input: {
  supplierName?: string | null;
  supplierCode?: string | null;
  purchaseDate?: string | null;
  sequence?: number;
}) {
  const abbreviation = normalizeSupplierAbbreviation(
    input.supplierName || input.supplierCode || null
  );
  const datePart = formatPoNumberDatePart(input.purchaseDate, input.sequence ?? 1);
  return `PO${abbreviation}${datePart}`;
}

export function getNextPurchaseOrderSequence(input: {
  existingOrderNumbers: string[];
  supplierName?: string | null;
  supplierCode?: string | null;
  purchaseDate?: string | null;
}) {
  const abbreviation = normalizeSupplierAbbreviation(
    input.supplierName || input.supplierCode || null
  );
  const datePart = formatPoNumberDatePart(input.purchaseDate, 1).slice(0, 4);
  const maxSequence = input.existingOrderNumbers.reduce((currentMax, orderNo) => {
    const matchedPrefix = [`PO${abbreviation}${datePart}`, `PO-${abbreviation}${datePart}`].find(
      (prefix) => orderNo.startsWith(prefix)
    );
    if (!matchedPrefix) return currentMax;
    const suffix = Number(orderNo.slice(matchedPrefix.length, matchedPrefix.length + 1));
    if (!Number.isFinite(suffix) || suffix < 1) return currentMax;
    return Math.max(currentMax, suffix);
  }, 0);
  return Math.min(9, maxSequence + 1 || 1);
}

const PINYIN_INITIAL_OVERRIDES: Record<string, string> = {
  付: "F",
  定: "D",
  金: "J",
  箱: "X",
  厂: "C",
  给: "G",
  额: "E",
  度: "D",
  预: "Y",
  款: "K",
  新: "X",
  华: "H",
  昌: "C",
};

export function sanitizeMaterialTypesForSubmit(
  purchaseType: PurchaseType,
  materialTypes: PurchaseDraftMaterialTypeInput[]
) {
  if (!shouldShowMaterialTypes(purchaseType)) return [];
  return materialTypes.filter((row) => row.materialType);
}

const ISO_6346_LETTER_VALUES: Record<string, number> = {
  A: 10,
  B: 12,
  C: 13,
  D: 14,
  E: 15,
  F: 16,
  G: 17,
  H: 18,
  I: 19,
  J: 20,
  K: 21,
  L: 23,
  M: 24,
  N: 25,
  O: 26,
  P: 27,
  Q: 28,
  R: 29,
  S: 30,
  T: 31,
  U: 32,
  V: 34,
  W: 35,
  X: 36,
  Y: 37,
  Z: 38,
};

function iso6346CharacterValue(char: string) {
  if (/^\d$/.test(char)) return Number(char);
  return ISO_6346_LETTER_VALUES[char] ?? 0;
}

export function computeIso6346CheckDigit(value: string) {
  const normalized = value.trim().toUpperCase();
  let sum = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    sum += iso6346CharacterValue(normalized[index] ?? "") * 2 ** index;
  }
  const remainder = sum % 11;
  return remainder === 10 ? 0 : remainder;
}

export function generateIso6346ContainerNumber(input: {
  prefix: string;
  serial: number;
}) {
  const prefix = input.prefix.trim().toUpperCase();
  const serial = String(input.serial).padStart(6, "0");
  const base = `${prefix}${serial}`;
  return `${base}${computeIso6346CheckDigit(base)}`;
}

export function getDefaultContainerOfflineDate(input: {
  purchaseType: PurchaseType;
  itemOfflineDate: string | null;
  vendorReleaseDate: string | null;
}) {
  if (input.purchaseType === "FACTORY_ORDER") {
    return input.itemOfflineDate ?? null;
  }
  return input.vendorReleaseDate ?? null;
}

export function buildDefaultDraftContainersForItem(input: {
  itemKey: string;
  item: PurchaseOrderDraftItemInput;
  purchaseType: PurchaseType;
  vendorReleaseDate: string | null;
}): PurchaseOrderDraftContainerInput[] {
  const count = Math.max(0, Math.floor(input.item.plannedQty ?? 0));
  return Array.from({ length: count }, () => ({
    itemKey: input.itemKey,
    containerNumber: null,
    color: input.item.color ?? null,
    flp: input.item.flp,
    lbx: input.item.lbx,
    lockingBarsCount: input.item.lockingBarsCount,
    ventsCount: input.item.ventsCount,
    machineType: input.item.machineType ?? null,
    yom: input.item.yom ?? null,
    offlineDate: getDefaultContainerOfflineDate({
      purchaseType: input.purchaseType,
      itemOfflineDate: input.item.offlineDate,
      vendorReleaseDate: input.vendorReleaseDate,
    }),
    tareWeight: input.item.tareWeight ?? null,
    maximumWeight: input.item.maximumWeight ?? null,
    cscNumber: input.item.cscNumber ?? null,
  }));
}
