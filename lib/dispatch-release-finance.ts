import type {
  TransferBusinessCostDraft,
  TransferBusinessRevenueDraft,
  TransferFinanceItemSnapshot,
  TransferFinanceOrderSnapshot,
  TransferInvoiceDraftPackage,
  TransferInvoiceStatus,
  TransferInvoiceType,
  TransferFinancePackage,
  TransferFinanceRecordDraft,
  TransferOverdueRevenueContext,
} from "@/types/dispatch-finance";

const DEFAULT_CURRENCY = "USD";
const TRANSFER_BUSINESS_TYPE = "TRANSFER" as const;
const UNPAID_STATUS = "UNPAID" as const;
const OTHER_COUNTERPARTY = "OTHER" as const;

function resolveHeaderCurrency(transferOrder: TransferFinanceOrderSnapshot) {
  return transferOrder.headerCurrency?.trim() || transferOrder.currency?.trim() || DEFAULT_CURRENCY;
}

function resolveItemCostCurrency(transferOrder: TransferFinanceOrderSnapshot) {
  return transferOrder.itemCostCurrency?.trim() || transferOrder.currency?.trim() || DEFAULT_CURRENCY;
}

function resolveCurrency(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function toNumber(value: number | string | null | undefined) {
  if (value == null || value === "") return 0;
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value).trim() || "0");
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeDateInput(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 10);
}

function requireOccurDate(
  label: string,
  value: string | null | undefined
) {
  const normalized = normalizeDateInput(value);
  if (!normalized) {
    throw new Error(`${label} is required to build transfer finance lines.`);
  }
  return normalized;
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs)) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function buildTransferBusinessCosts(
  transferOrder: TransferFinanceOrderSnapshot,
  transferItems: TransferFinanceItemSnapshot[]
): TransferBusinessCostDraft[] {
  const occurDate = requireOccurDate("Release date", transferOrder.releaseDate);
  const defaultItemCurrency = resolveItemCostCurrency(transferOrder);
  const costs: TransferBusinessCostDraft[] = [];

  const totalItemTruckingCost = roundCurrency(
    transferItems.reduce((sum, item) => sum + roundCurrency(toNumber(item.truckingCost)), 0)
  );
  const legacyHeaderTruckingCost = roundCurrency(toNumber(transferOrder.truckingCost));
  if (legacyHeaderTruckingCost !== 0 && totalItemTruckingCost === 0) {
    costs.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: null,
      costCode: "TRU",
      amount: legacyHeaderTruckingCost,
      baseCurrencyAmount: 0,
      currency: defaultItemCurrency,
      occurDate,
      remark: "Dispatch release trucking cost",
      sourceField: "trucking_cost",
    });
  }

  const handlingFee = roundCurrency(toNumber(transferOrder.handlingFee));
  if (handlingFee !== 0) {
    costs.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: null,
      costCode: "HDL",
      amount: handlingFee,
      baseCurrencyAmount: 0,
      currency: defaultItemCurrency,
      occurDate,
      remark: "Dispatch release handling fee",
      sourceField: "handling_fee",
    });
  }

  for (const item of transferItems) {
    const itemOccurDate =
      normalizeDateInput(item.pickupDate) ??
      normalizeDateInput(transferOrder.releaseDate) ??
      occurDate;
    const itemCurrency = resolveCurrency(item.truckingCostCurrency, defaultItemCurrency);
    const truckingCost = roundCurrency(toNumber(item.truckingCost));
    if (truckingCost !== 0 && item.containerId) {
      costs.push({
        businessType: TRANSFER_BUSINESS_TYPE,
        businessId: transferOrder.id,
        containerId: item.containerId,
        costCode: "TRU",
        amount: truckingCost,
        baseCurrencyAmount: 0,
        currency: itemCurrency,
        occurDate: itemOccurDate,
        remark: "Dispatch release trucking cost",
        sourceField: "trucking_cost",
      });
    }

    const repairCurrency = resolveCurrency(item.repairCostCurrency, defaultItemCurrency);
    const repairCost = roundCurrency(toNumber(item.repairCost));
    if (repairCost === 0 || !item.containerId) continue;
    costs.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: item.containerId,
      costCode: "REP",
      amount: repairCost,
      baseCurrencyAmount: 0,
      currency: repairCurrency,
      occurDate: itemOccurDate,
      remark: "Dispatch release repair cost",
      sourceField: "repair_cost",
    });
  }

  return costs;
}

export function buildTransferOverdueRevenueLines(
  transferOrder: TransferFinanceOrderSnapshot,
  transferItems: TransferFinanceItemSnapshot[],
  overdueContext: TransferOverdueRevenueContext
): TransferBusinessRevenueDraft[] {
  const currency = resolveHeaderCurrency(transferOrder);
  const dailyRent = roundCurrency(toNumber(transferOrder.dailyRent));
  if (dailyRent === 0) return [];

  const freeDays = Math.max(0, Math.trunc(toNumber(transferOrder.freeDays)));
  const revenues: TransferBusinessRevenueDraft[] = [];

  for (const item of transferItems) {
    if (!item.containerId) continue;
    const pickupDate = normalizeDateInput(item.pickupDate);
    if (!pickupDate) continue;
    const endDate = normalizeDateInput(item.returnDate) ?? normalizeDateInput(overdueContext.cutoffDate);
    if (!endDate) continue;
    const occurDate = normalizeDateInput(overdueContext.occurDate) ?? endDate;

    const elapsedDays = daysBetween(pickupDate, endDate);
    const billableDays = Math.max(0, elapsedDays - freeDays);
    if (billableDays <= 0) continue;
    const periodStart = normalizeDateInput(item.returnDate)
      ? pickupDate
      : normalizeDateInput(overdueContext.cutoffDate) ?? pickupDate;
    const periodEnd = endDate;

    revenues.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: item.containerId,
      revenueCode: "DMR",
      revenueType: "OVERDUE_RENT",
      amount: roundCurrency(billableDays * dailyRent),
      baseCurrencyAmount: 0,
      currency,
      occurDate,
      remark: `pickup_date=${pickupDate}; period_start=${periodStart}; period_end=${periodEnd}; billable_days=${billableDays}`,
      sourceField: "daily_rent",
      billableDays,
    });
  }

  return revenues;
}

export function buildTransferBusinessRevenues(
  transferOrder: TransferFinanceOrderSnapshot,
  transferItems: TransferFinanceItemSnapshot[],
  overdueContext?: TransferOverdueRevenueContext
): TransferBusinessRevenueDraft[] {
  const occurDate = requireOccurDate("Release date", transferOrder.releaseDate);
  const headerCurrency = resolveHeaderCurrency(transferOrder);
  const defaultItemCurrency = resolveItemCostCurrency(transferOrder);
  const revenues: TransferBusinessRevenueDraft[] = [];

  const pickupCharge = roundCurrency(toNumber(transferOrder.pickupCharge));
  if (pickupCharge !== 0) {
    revenues.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: null,
      revenueCode: "PUC",
      revenueType: null,
      amount: pickupCharge,
      baseCurrencyAmount: 0,
      currency: headerCurrency,
      occurDate,
      remark: "Dispatch release pick-up charge",
      sourceField: "pickup_charge",
    });
  }

  for (const item of transferItems) {
    const itemOccurDate =
      normalizeDateInput(item.pickupDate) ??
      normalizeDateInput(transferOrder.releaseDate) ??
      occurDate;
    const itemCurrency = resolveCurrency(item.damageClaimCurrency, defaultItemCurrency);
    const damageClaim = roundCurrency(toNumber(item.damageClaim));
    if (damageClaim === 0 || !item.containerId) continue;
    revenues.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      containerId: item.containerId,
      revenueCode: "RPR",
      revenueType: null,
      amount: damageClaim,
      baseCurrencyAmount: 0,
      currency: itemCurrency,
      occurDate: itemOccurDate,
      remark: "Dispatch release damage claim recovery",
      sourceField: "damage_claim",
    });
  }

  if (overdueContext) {
    revenues.push(
      ...buildTransferOverdueRevenueLines(transferOrder, transferItems, overdueContext)
    );
  }

  return revenues;
}

export function buildTransferFinanceRecords(
  costs: TransferBusinessCostDraft[],
  revenues: TransferBusinessRevenueDraft[],
  transferOrder: TransferFinanceOrderSnapshot
): TransferFinanceRecordDraft[] {
  const dueDate = normalizeDateInput(transferOrder.releaseDate);
  const records: TransferFinanceRecordDraft[] = [];

  const payableTotals = new Map<string, number>();
  for (const row of costs) {
    const currency = resolveCurrency(row.currency, resolveItemCostCurrency(transferOrder));
    payableTotals.set(currency, roundCurrency((payableTotals.get(currency) ?? 0) + row.amount));
  }
  for (const [currency, totalCost] of payableTotals.entries()) {
    if (totalCost === 0) continue;
    records.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      recordType: "PAYABLE",
      counterpartyType: OTHER_COUNTERPARTY,
      counterpartyId: transferOrder.dispatchVendorId,
      amount: totalCost,
      baseCurrencyAmount: 0,
      currency,
      status: UNPAID_STATUS,
      dueDate,
      paidAmount: 0,
      remark: `Dispatch release payable summary (${currency})`,
    });
  }

  const receivableTotals = new Map<string, number>();
  for (const row of revenues) {
    const currency = resolveCurrency(row.currency, resolveHeaderCurrency(transferOrder));
    receivableTotals.set(currency, roundCurrency((receivableTotals.get(currency) ?? 0) + row.amount));
  }
  for (const [currency, totalRevenue] of receivableTotals.entries()) {
    if (totalRevenue === 0) continue;
    records.push({
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: transferOrder.id,
      recordType: "RECEIVABLE",
      counterpartyType: OTHER_COUNTERPARTY,
      counterpartyId: transferOrder.dispatchVendorId,
      amount: totalRevenue,
      baseCurrencyAmount: 0,
      currency,
      status: UNPAID_STATUS,
      dueDate,
      paidAmount: 0,
      remark: `Dispatch release receivable summary (${currency})`,
    });
  }

  return records;
}

export function buildTransferFinancePackage(
  transferOrder: TransferFinanceOrderSnapshot,
  transferItems: TransferFinanceItemSnapshot[],
  overdueContext?: TransferOverdueRevenueContext
): TransferFinancePackage {
  const costs = buildTransferBusinessCosts(transferOrder, transferItems);
  const revenues = buildTransferBusinessRevenues(
    transferOrder,
    transferItems,
    overdueContext
  );
  const financeRecords = buildTransferFinanceRecords(costs, revenues, transferOrder);

  return {
    costs,
    revenues,
    financeRecords,
    totalCost: roundCurrency(costs.reduce((sum, row) => sum + row.amount, 0)),
    totalRevenue: roundCurrency(revenues.reduce((sum, row) => sum + row.amount, 0)),
  };
}

export function buildTransferInvoiceDrafts(input: {
  transferOrder: TransferFinanceOrderSnapshot;
  invoiceType: TransferInvoiceType;
  invoiceNo: string;
  invoiceDate?: string | null;
  invoiceStatus?: TransferInvoiceStatus;
  costRows?: Array<TransferBusinessCostDraft & { id: string }>;
  revenueRows?: Array<TransferBusinessRevenueDraft & { id: string }>;
  remark?: string | null;
}): TransferInvoiceDraftPackage {
  const invoiceStatus = input.invoiceStatus ?? "DRAFT";
  const invoiceDate = normalizeDateInput(input.invoiceDate) ?? normalizeDateInput(input.transferOrder.releaseDate);
  const isReceivable = input.invoiceType === "RECEIVABLE";
  const matchedRows = isReceivable ? input.revenueRows ?? [] : input.costRows ?? [];
  const currency =
    matchedRows[0]?.currency ||
    (isReceivable
      ? resolveHeaderCurrency(input.transferOrder)
      : resolveItemCostCurrency(input.transferOrder));

  const items = matchedRows.map((row) => ({
    revenueId: isReceivable ? row.id : null,
    costId: isReceivable ? null : row.id,
    billedAmount: roundCurrency(row.amount),
    remark: row.remark,
  }));

  const amount = roundCurrency(items.reduce((sum, row) => sum + row.billedAmount, 0));

  return {
    invoice: {
      businessType: TRANSFER_BUSINESS_TYPE,
      businessId: input.transferOrder.id,
      invoiceType: input.invoiceType,
      invoiceNo: input.invoiceNo,
      invoiceDate,
      amount,
      currency,
      invoiceStatus,
      remark: input.remark ?? null,
    },
    items,
  };
}
