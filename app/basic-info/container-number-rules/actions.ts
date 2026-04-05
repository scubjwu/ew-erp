"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ContainerNumberRuleRow,
  ContainerNumberRuleSizeOption,
} from "@/types/container-number-rule";

export type ContainerNumberRulesQuery = {
  sizeCodeId?: string;
  prefix?: string;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: ContainerNumberRulesSortBy;
  sortDirection?: ContainerNumberRulesSortDirection;
};

export type ContainerNumberRulesSortBy =
  | "sizeCode"
  | "prefix"
  | "serialLength"
  | "startSerial"
  | "endSerial"
  | "currentSerial"
  | "remainingAvailable"
  | "exampleContainerNumber"
  | "status"
  | "remark";
export type ContainerNumberRulesSortDirection = "asc" | "desc";

export type ContainerNumberRulesPageResult = {
  rows: ContainerNumberRuleRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  filters: {
    sizeCodeId: string;
    prefix: string;
    status: string;
  };
  sort: {
    sortBy: ContainerNumberRulesSortBy;
    sortDirection: ContainerNumberRulesSortDirection;
  };
};

const DEFAULT_CONTAINER_NUMBER_RULES_SORT = {
  sortBy: "sizeCode",
  sortDirection: "asc",
} satisfies {
  sortBy: ContainerNumberRulesSortBy;
  sortDirection: ContainerNumberRulesSortDirection;
};

function normalizeLike(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return `%${trimmed}%`;
}

function resolveContainerNumberRulesSort(
  sortBy?: string,
  sortDirection?: string
): {
  sortBy: ContainerNumberRulesSortBy;
  sortDirection: ContainerNumberRulesSortDirection;
} {
  return {
    sortBy:
      sortBy === "prefix" ||
      sortBy === "serialLength" ||
      sortBy === "startSerial" ||
      sortBy === "endSerial" ||
      sortBy === "currentSerial" ||
      sortBy === "remainingAvailable" ||
      sortBy === "exampleContainerNumber" ||
      sortBy === "status" ||
      sortBy === "remark"
        ? sortBy
        : DEFAULT_CONTAINER_NUMBER_RULES_SORT.sortBy,
    sortDirection:
      sortDirection === "desc" ? "desc" : DEFAULT_CONTAINER_NUMBER_RULES_SORT.sortDirection,
  };
}

function padSerial(serial: number, serialLength: number) {
  return String(Math.max(0, serial)).padStart(serialLength, "0");
}

function mapRows(rows: Array<Record<string, unknown>>): ContainerNumberRuleRow[] {
  return rows.map((row) => {
    const startSerial = Number(row.start_serial ?? 0);
    const endSerial = Number(row.end_serial ?? 0);
    const currentSerial = Number(row.current_serial ?? 0);
    const serialLength = Number(row.serial_length ?? 0);
    const prefix = String(row.prefix ?? "");
    const nextSerial = Math.min(endSerial, currentSerial + 1);
    return {
      id: String(row.id),
      sizeCodeId: String(row.container_size_code_id ?? ""),
      sizeCode: String(row.size_code ?? ""),
      prefix,
      serialLength,
      startSerial,
      endSerial,
      currentSerial,
      remainingAvailable: Math.max(0, endSerial - currentSerial),
      exampleContainerNumber:
        String(row.example_container_number ?? "").trim() ||
        `${prefix}${padSerial(nextSerial, serialLength)}`,
      remark: (row.remark as string | null | undefined) ?? null,
      status: ((row.status as string | null | undefined) ?? "ACTIVE") as
        | "ACTIVE"
        | "INACTIVE",
    };
  });
}

function applyContainerNumberRulesSort(
  query: any,
  sort: {
    sortBy: ContainerNumberRulesSortBy;
    sortDirection: ContainerNumberRulesSortDirection;
  }
) {
  const ascending = sort.sortDirection === "asc";
  if (sort.sortBy === "sizeCode") {
    return query.order("size_code", {
      ascending,
      foreignTable: "container_size_codes",
    });
  }

  const columnMap: Record<Exclude<ContainerNumberRulesSortBy, "sizeCode" | "remainingAvailable">, string> = {
    prefix: "prefix",
    serialLength: "serial_length",
    startSerial: "start_serial",
    endSerial: "end_serial",
    currentSerial: "current_serial",
    exampleContainerNumber: "example_container_number",
    status: "status",
    remark: "remark",
  };

  if (sort.sortBy === "remainingAvailable") {
    return query.order("end_serial", { ascending }).order("current_serial", {
      ascending,
    });
  }

  return query.order(columnMap[sort.sortBy], { ascending });
}

function buildContainerNumberRulesQuery(
  filters: ContainerNumberRulesPageResult["filters"],
  sort: {
    sortBy: ContainerNumberRulesSortBy;
    sortDirection: ContainerNumberRulesSortDirection;
  }
) {
  const prefix = normalizeLike(filters.prefix);

  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("container_number_rules")
    .select(
      "id, prefix, serial_length, start_serial, end_serial, current_serial, status, example_container_number, remark, container_size_code_id, container_size_codes!inner(size_code)",
      { count: "exact" }
    );

  query = applyContainerNumberRulesSort(query, sort);

  if (filters.sizeCodeId) {
    query = query.eq("container_size_code_id", filters.sizeCodeId);
  }
  if (prefix) {
    query = query.ilike("prefix", prefix);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  return query;
}

export async function getContainerNumberRuleSizeOptions(): Promise<
  ContainerNumberRuleSizeOption[]
> {
  noStore();

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_size_codes")
    .select("id, size_code, size_name")
    .eq("status", "ACTIVE")
    .order("size_code", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    code: String(row.size_code ?? ""),
    name: String(row.size_name ?? row.size_code ?? ""),
  }));
}

export async function getContainerNumberRules(
  params: ContainerNumberRulesQuery
): Promise<ContainerNumberRulesPageResult> {
  noStore();

  const page = Math.max(1, Math.floor(params.page));
  const pageSize = Math.min(100, Math.max(1, Math.floor(params.pageSize)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const filters = {
    sizeCodeId: params.sizeCodeId?.trim() ?? "",
    prefix: params.prefix?.trim() ?? "",
    status: params.status?.trim() ?? "",
  };
  const sort = resolveContainerNumberRulesSort(params.sortBy, params.sortDirection);
  const query = buildContainerNumberRulesQuery(filters, sort);

  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    size_code:
      ((row.container_size_codes as Record<string, unknown> | null)?.size_code as
        | string
        | undefined) ?? "",
  }));

  return {
    rows: mapRows(rows),
    totalCount: count ?? 0,
    page,
    pageSize,
    filters,
    sort,
  };
}

export async function exportContainerNumberRules(filters: {
  sizeCodeId?: string;
  prefix?: string;
  status?: string;
  sortBy?: ContainerNumberRulesSortBy;
  sortDirection?: ContainerNumberRulesSortDirection;
}): Promise<ContainerNumberRuleRow[]> {
  noStore();

  const normalizedFilters = {
    sizeCodeId: filters.sizeCodeId?.trim() ?? "",
    prefix: filters.prefix?.trim() ?? "",
    status: filters.status?.trim() ?? "",
  };
  const sort = resolveContainerNumberRulesSort(filters.sortBy, filters.sortDirection);
  const query = buildContainerNumberRulesQuery(normalizedFilters, sort);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    ...row,
    size_code:
      ((row.container_size_codes as Record<string, unknown> | null)?.size_code as
        | string
        | undefined) ?? "",
  }));
  return mapRows(rows);
}

export async function getContainerNumberRulePrefixSuggestions(params: {
  q: string;
  limit?: number;
}): Promise<string[]> {
  noStore();

  const q = params.q.trim();
  if (!q) return [];

  const limit = Math.min(8, Math.max(1, params.limit ?? 6));
  const pattern = `%${q}%`;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("container_number_rules")
    .select("prefix")
    .ilike("prefix", pattern)
    .order("prefix", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  return Array.from(
    new Set(
      (data ?? [])
        .map((row) => row.prefix)
        .filter((value): value is string => Boolean(value?.trim()))
    )
  ).slice(0, limit);
}

export async function revalidateContainerNumberRulePages() {
  revalidatePath("/basic-info/container-number-rules");
  revalidatePath("/basic-info");
}
