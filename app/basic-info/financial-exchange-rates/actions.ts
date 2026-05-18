"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  FinancialExchangeRateCurrency,
  FinancialExchangeRateInput,
  FinancialExchangeRateRow,
} from "@/types/dispatch-finance";

export type FinancialExchangeRateSortBy =
  | "rateDate"
  | "fromCurrency"
  | "toCurrency"
  | "exchangeRate"
  | "status"
  | "remark";

export type FinancialExchangeRateSortDirection = "asc" | "desc";

export type FinancialExchangeRateQuery = {
  rateDate?: string;
  fromCurrency?: string;
  toCurrency?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: FinancialExchangeRateSortBy;
  sortDirection?: FinancialExchangeRateSortDirection;
};

export type FinancialExchangeRatePageResult = {
  rows: FinancialExchangeRateRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    rateDate: string;
    fromCurrency: string;
    toCurrency: string;
    status: string;
  };
  sort: {
    sortBy: FinancialExchangeRateSortBy;
    sortDirection: FinancialExchangeRateSortDirection;
  };
};

const DEFAULT_SORT = {
  sortBy: "rateDate",
  sortDirection: "desc",
} satisfies {
  sortBy: FinancialExchangeRateSortBy;
  sortDirection: FinancialExchangeRateSortDirection;
};

function mapRow(row: Record<string, unknown>): FinancialExchangeRateRow {
  return {
    id: String(row.id),
    rateDate: String(row.rate_date ?? ""),
    fromCurrency: String(row.from_currency ?? "USD") as FinancialExchangeRateCurrency,
    toCurrency: String(row.to_currency ?? "USD") as FinancialExchangeRateCurrency,
    exchangeRate: Number(row.exchange_rate ?? 0),
    isActive: Boolean(row.is_active ?? true),
    remark: (row.remark as string | null | undefined) ?? null,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function resolveSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: FinancialExchangeRateSortBy;
  sortDirection: FinancialExchangeRateSortDirection;
} {
  return {
    sortBy:
      sortBy === "fromCurrency" ||
      sortBy === "toCurrency" ||
      sortBy === "exchangeRate" ||
      sortBy === "status" ||
      sortBy === "remark"
        ? sortBy
        : DEFAULT_SORT.sortBy,
    sortDirection: sortDirection === "asc" ? "asc" : DEFAULT_SORT.sortDirection,
  };
}

function applySort(
  query: any,
  sort: {
    sortBy: FinancialExchangeRateSortBy;
    sortDirection: FinancialExchangeRateSortDirection;
  }
) {
  const ascending = sort.sortDirection === "asc";
  const columnMap: Record<FinancialExchangeRateSortBy, string> = {
    rateDate: "rate_date",
    fromCurrency: "from_currency",
    toCurrency: "to_currency",
    exchangeRate: "exchange_rate",
    status: "is_active",
    remark: "remark",
  };

  return query
    .order(columnMap[sort.sortBy], { ascending })
    .order("from_currency", { ascending: true })
    .order("to_currency", { ascending: true });
}

function buildQuery(
  filters: FinancialExchangeRatePageResult["filters"],
  sort: {
    sortBy: FinancialExchangeRateSortBy;
    sortDirection: FinancialExchangeRateSortDirection;
  }
) {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("financial_exchange_rate")
    .select(
      "id, rate_date, from_currency, to_currency, exchange_rate, is_active, remark, created_at, updated_at",
      { count: "exact" }
    );

  query = applySort(query, sort);

  if (filters.rateDate) {
    query = query.eq("rate_date", filters.rateDate);
  }
  if (filters.fromCurrency) {
    query = query.eq("from_currency", filters.fromCurrency);
  }
  if (filters.toCurrency) {
    query = query.eq("to_currency", filters.toCurrency);
  }
  if (filters.status === "ACTIVE") {
    query = query.eq("is_active", true);
  }
  if (filters.status === "INACTIVE") {
    query = query.eq("is_active", false);
  }

  return query;
}

export async function getFinancialExchangeRates(
  params: FinancialExchangeRateQuery
): Promise<FinancialExchangeRatePageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    rateDate: params.rateDate?.trim() ?? "",
    fromCurrency: params.fromCurrency?.trim() ?? "",
    toCurrency: params.toCurrency?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };
  const sort = resolveSort(params.sortBy, params.sortDirection);
  const query = buildQuery(filters, sort);
  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRow),
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function createFinancialExchangeRate(input: FinancialExchangeRateInput) {
  const supabase = createServerSupabaseClient();
  const payload = {
    rate_date: input.rateDate,
    from_currency: input.fromCurrency,
    to_currency: input.toCurrency,
    exchange_rate: input.exchangeRate,
    is_active: input.isActive ?? true,
    remark: input.remark?.trim() || null,
  };

  const { error } = await supabase.from("financial_exchange_rate").insert(payload);
  if (error) throw new Error(error.message);

  await revalidateFinancialExchangeRatePages();
}

export async function updateFinancialExchangeRate(
  id: string,
  input: FinancialExchangeRateInput
) {
  const supabase = createServerSupabaseClient();
  const payload = {
    rate_date: input.rateDate,
    from_currency: input.fromCurrency,
    to_currency: input.toCurrency,
    exchange_rate: input.exchangeRate,
    is_active: input.isActive ?? true,
    remark: input.remark?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("financial_exchange_rate")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);

  await revalidateFinancialExchangeRatePages();
}

export async function setFinancialExchangeRateStatus(id: string, isActive: boolean) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("financial_exchange_rate")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await revalidateFinancialExchangeRatePages();
}

export async function revalidateFinancialExchangeRatePages() {
  revalidatePath("/basic-info");
  revalidatePath("/basic-info/financial-exchange-rates");
}
