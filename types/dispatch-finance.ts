export type TransferFinanceCounterpartyType = "OTHER";

export const FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS = [
  "USD",
  "CNY",
  "HKD",
  "EUR",
  "JPY",
  "SGD",
  "AUD",
  "CAD",
  "GBP",
  "RUB",
] as const;

export type FinancialExchangeRateCurrency =
  (typeof FINANCIAL_EXCHANGE_RATE_CURRENCY_OPTIONS)[number];

export type FinancialExchangeRateRow = {
  id: string;
  rateDate: string;
  fromCurrency: FinancialExchangeRateCurrency;
  toCurrency: FinancialExchangeRateCurrency;
  exchangeRate: number;
  isActive: boolean;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialExchangeRateInput = {
  rateDate: string;
  fromCurrency: FinancialExchangeRateCurrency;
  toCurrency: FinancialExchangeRateCurrency;
  exchangeRate: number;
  isActive?: boolean;
  remark?: string | null;
};

export type TransferFinanceOrderSnapshot = {
  id: string;
  dispatchVendorId: string | null;
  releaseDate: string | null;
  pickupCharge: number | string | null;
  dpp: number | string | null;
  freeDays: number | string | null;
  rv: number | string | null;
  dailyRent: number | string | null;
  truckingCost: number | string | null;
  handlingFee: number | string | null;
  headerCurrency?: string | null;
  itemCostCurrency?: string | null;
  currency?: string | null;
};

export type TransferFinanceItemSnapshot = {
  id: string;
  containerId: string | null;
  truckingCost?: number | string | null;
  truckingCostCurrency?: string | null;
  repairCost: number | string | null;
  repairCostCurrency?: string | null;
  damageClaim: number | string | null;
  damageClaimCurrency?: string | null;
  pickupDate?: string | null;
  returnDate?: string | null;
};

export type TransferBusinessCostDraft = {
  businessType: "TRANSFER";
  businessId: string;
  containerId: string | null;
  costCode: "TRU" | "HDL" | "REP";
  amount: number;
  baseCurrencyAmount: number;
  currency: string;
  occurDate: string;
  remark: string | null;
  sourceField: "trucking_cost" | "handling_fee" | "repair_cost";
};

export type TransferBusinessRevenueDraft = {
  businessType: "TRANSFER";
  businessId: string;
  containerId: string | null;
  revenueCode: "PUC" | "RPR" | "DMR";
  revenueType?: "OVERDUE_RENT" | null;
  amount: number;
  baseCurrencyAmount: number;
  currency: string;
  occurDate: string;
  remark: string | null;
  sourceField: "pickup_charge" | "damage_claim" | "daily_rent";
  billableDays?: number;
};

export type TransferFinanceRecordDraft = {
  businessType: "TRANSFER";
  businessId: string;
  recordType: "PAYABLE" | "RECEIVABLE";
  counterpartyType: TransferFinanceCounterpartyType;
  counterpartyId: string | null;
  amount: number;
  baseCurrencyAmount: number;
  currency: string;
  status: "UNPAID";
  dueDate: string | null;
  paidAmount: number;
  remark: string | null;
};

export type TransferOverdueRevenueContext = {
  cutoffDate?: string | null;
  occurDate?: string | null;
};

export type TransferInvoiceType = "PAYABLE" | "RECEIVABLE";
export type TransferInvoiceStatus = "DRAFT" | "ISSUED";

export type TransferInvoiceDraft = {
  businessType: "TRANSFER";
  businessId: string;
  invoiceType: TransferInvoiceType;
  invoiceNo: string;
  invoiceDate: string | null;
  amount: number;
  currency: string;
  invoiceStatus: TransferInvoiceStatus;
  remark: string | null;
};

export type TransferInvoiceItemDraft = {
  revenueId: string | null;
  costId: string | null;
  billedAmount: number;
  remark: string | null;
};

export type TransferInvoiceDraftPackage = {
  invoice: TransferInvoiceDraft;
  items: TransferInvoiceItemDraft[];
};

export type TransferFinancePackage = {
  costs: TransferBusinessCostDraft[];
  revenues: TransferBusinessRevenueDraft[];
  financeRecords: TransferFinanceRecordDraft[];
  totalCost: number;
  totalRevenue: number;
};
