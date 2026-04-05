import { describe, expect, it, vi } from "vitest";

type QueryOp =
  | { method: "from"; args: unknown[] }
  | { method: "select"; args: unknown[] }
  | { method: "order"; args: unknown[] }
  | { method: "ilike"; args: unknown[] }
  | { method: "eq"; args: unknown[] }
  | { method: "or"; args: unknown[] }
  | { method: "limit"; args: unknown[] }
  | { method: "range"; args: unknown[] };

type QueryRecorder = {
  ops: QueryOp[];
  builder: {
    data: unknown;
    error: unknown;
    count: number | null;
    select: (...args: unknown[]) => any;
    order: (...args: unknown[]) => any;
    ilike: (...args: unknown[]) => any;
    eq: (...args: unknown[]) => any;
    or: (...args: unknown[]) => any;
    limit: (...args: unknown[]) => any;
    range: (...args: unknown[]) => Promise<{ data: unknown; error: unknown; count: number | null }>;
  };
  client: {
    from: (...args: unknown[]) => any;
  };
};

function createQueryRecorder({
  data = [],
  count = 0,
}: {
  data?: unknown;
  count?: number | null;
} = {}): QueryRecorder {
  const ops: QueryOp[] = [];

  const builder = {
    data,
    error: null,
    count,
    select: (...args: unknown[]) => {
      ops.push({ method: "select", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      ops.push({ method: "order", args });
      return builder;
    },
    ilike: (...args: unknown[]) => {
      ops.push({ method: "ilike", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      ops.push({ method: "eq", args });
      return builder;
    },
    or: (...args: unknown[]) => {
      ops.push({ method: "or", args });
      return builder;
    },
    limit: (...args: unknown[]) => {
      ops.push({ method: "limit", args });
      return builder;
    },
    range: async (...args: unknown[]) => {
      ops.push({ method: "range", args });
      return { data: builder.data, error: builder.error, count: builder.count };
    },
  };

  const client = {
    from: (...args: unknown[]) => {
      ops.push({ method: "from", args });
      return builder;
    },
  };

  return { ops, builder, client };
}

async function loadActionModule<TModule>(
  modulePath: string,
  recorder: QueryRecorder
): Promise<TModule> {
  vi.resetModules();
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createServerSupabaseClient: () => recorder.client,
  }));
  return import(modulePath) as Promise<TModule>;
}

function findOps(ops: QueryOp[], method: QueryOp["method"]) {
  return ops.filter((op) => op.method === method);
}

describe("basic info actions contracts", () => {
  it("cities applies default sort, trims filters, and paginates", async () => {
    const recorder = createQueryRecorder({ data: [{ id: "1" }], count: 12 });
    const { getCityLogistics } = await loadActionModule<typeof import("@/app/basic-info/cities/actions")>(
      "@/app/basic-info/cities/actions",
      recorder
    );

    const result = await getCityLogistics({
      cityCode: "  SHA  ",
      cityName: " Pudong ",
      regionId: "region-1",
      country: " CN ",
      page: 2,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(result.filters).toEqual({
      cityCode: "SHA",
      cityName: "Pudong",
      regionId: "region-1",
      country: "CN",
    });
    expect(result.sort).toEqual({ sortBy: "cityCode", sortDirection: "asc" });
    expect(findOps(recorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["city_code", { ascending: true }],
    });
    expect(findOps(recorder.ops, "ilike")).toEqual(
      expect.arrayContaining([
        { method: "ilike", args: ["city_code", "%SHA%"] },
        { method: "ilike", args: ["city_name", "%Pudong%"] },
        { method: "ilike", args: ["country", "%CN%"] },
      ])
    );
    expect(findOps(recorder.ops, "eq")).toContainEqual({
      method: "eq",
      args: ["region_id", "region-1"],
    });
    expect(findOps(recorder.ops, "range")).toContainEqual({
      method: "range",
      args: [10, 19],
    });
  });

  it("companies export follows applied sort and fuzzy address filter", async () => {
    const recorder = createQueryRecorder();
    const { exportCompanyProfiles } =
      await loadActionModule<typeof import("@/app/basic-info/companies/actions")>(
        "@/app/basic-info/companies/actions",
        recorder
      );

    await exportCompanyProfiles({
      companyNameEn: " ACME ",
      address: " Shanghai ",
      sortBy: "createdAt",
      sortDirection: "desc",
    });

    expect(findOps(recorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["created_at", { ascending: false, nullsFirst: false }],
    });
    expect(findOps(recorder.ops, "ilike")).toContainEqual({
      method: "ilike",
      args: ["company_name_en", "%ACME%"],
    });
    expect(findOps(recorder.ops, "or")).toContainEqual({
      method: "or",
      args: ["address_cn.ilike.%Shanghai%,address_en.ilike.%Shanghai%"],
    });
  });

  it("condition codes defaults to code sort and maps export sort overrides", async () => {
    const getRecorder = createQueryRecorder();
    const actionModule =
      await loadActionModule<typeof import("@/app/basic-info/condition-codes/actions")>(
        "@/app/basic-info/condition-codes/actions",
        getRecorder
      );

    const getResult = await actionModule.getConditionCodes({
      code: " CW ",
      name: " Cargo ",
      page: 1,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(getResult.sort).toEqual({ sortBy: "code", sortDirection: "asc" });
    expect(findOps(getRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["condition_code", { ascending: true }],
    });

    const exportRecorder = createQueryRecorder();
    const exportModule =
      await loadActionModule<typeof import("@/app/basic-info/condition-codes/actions")>(
        "@/app/basic-info/condition-codes/actions",
        exportRecorder
      );
    await exportModule.exportConditionCodes({
      code: "CW",
      sortBy: "status",
      sortDirection: "desc",
    });

    expect(findOps(exportRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["status", { ascending: false }],
    });
  });

  it("container number rules uses size-code default sort and export keeps remainingAvailable sort", async () => {
    const getRecorder = createQueryRecorder();
    const actionModule =
      await loadActionModule<typeof import("@/app/basic-info/container-number-rules/actions")>(
        "@/app/basic-info/container-number-rules/actions",
        getRecorder
      );

    const getResult = await actionModule.getContainerNumberRules({
      sizeCodeId: "size-1",
      prefix: " AB ",
      status: "ACTIVE",
      page: 1,
      pageSize: 25,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(getResult.sort).toEqual({ sortBy: "sizeCode", sortDirection: "asc" });
    expect(findOps(getRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["size_code", { ascending: true, foreignTable: "container_size_codes" }],
    });
    expect(findOps(getRecorder.ops, "ilike")).toContainEqual({
      method: "ilike",
      args: ["prefix", "%AB%"],
    });
    expect(findOps(getRecorder.ops, "eq")).toEqual(
      expect.arrayContaining([
        { method: "eq", args: ["container_size_code_id", "size-1"] },
        { method: "eq", args: ["status", "ACTIVE"] },
      ])
    );

    const exportRecorder = createQueryRecorder();
    const exportModule =
      await loadActionModule<typeof import("@/app/basic-info/container-number-rules/actions")>(
        "@/app/basic-info/container-number-rules/actions",
        exportRecorder
      );
    await exportModule.exportContainerNumberRules({
      sortBy: "remainingAvailable",
      sortDirection: "desc",
    });

    expect(findOps(exportRecorder.ops, "order")).toEqual(
      expect.arrayContaining([
        { method: "order", args: ["end_serial", { ascending: false }] },
        { method: "order", args: ["current_serial", { ascending: false }] },
      ])
    );
  });

  it("depots defaults to depot code sort and export supports city foreign sort", async () => {
    const getRecorder = createQueryRecorder();
    const actionModule =
      await loadActionModule<typeof import("@/app/basic-info/depots/actions")>(
        "@/app/basic-info/depots/actions",
        getRecorder
      );

    const getResult = await actionModule.getDepotCodes({
      depotCode: " DP1 ",
      depotName: " Shanghai Depot ",
      cityId: "city-1",
      depotType: "YARD",
      status: "ACTIVE",
      page: 1,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(getResult.sort).toEqual({ sortBy: "depotCode", sortDirection: "asc" });
    expect(findOps(getRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["depot_code", { ascending: true }],
    });
    expect(findOps(getRecorder.ops, "or")).toContainEqual({
      method: "or",
      args: ["depot_name.ilike.%Shanghai Depot%,depot_name_cn.ilike.%Shanghai Depot%"],
    });

    const exportRecorder = createQueryRecorder();
    const exportModule =
      await loadActionModule<typeof import("@/app/basic-info/depots/actions")>(
        "@/app/basic-info/depots/actions",
        exportRecorder
      );
    await exportModule.exportDepotCodes({
      sortBy: "cityCode",
      sortDirection: "desc",
    });

    expect(findOps(exportRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["city_code", { ascending: false, foreignTable: "cities" }],
    });
  });

  it("financial codes maps expense defaults and revenue export sort correctly", async () => {
    const getRecorder = createQueryRecorder();
    const actionModule =
      await loadActionModule<typeof import("@/app/basic-info/financial-codes/actions")>(
        "@/app/basic-info/financial-codes/actions",
        getRecorder
      );

    const getResult = await actionModule.getFinancialCodes({
      category: "EXPENSE",
      code: " C001 ",
      name: " Fuel ",
      enabled: " ENABLED ",
      page: 1,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(getResult.sort).toEqual({ sortBy: "code", sortDirection: "asc" });
    expect(findOps(getRecorder.ops, "from")).toContainEqual({
      method: "from",
      args: ["cost_codes"],
    });
    expect(findOps(getRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["cost_code", { ascending: true }],
    });
    expect(findOps(getRecorder.ops, "eq")).toContainEqual({
      method: "eq",
      args: ["status", "ACTIVE"],
    });

    const exportRecorder = createQueryRecorder();
    const exportModule =
      await loadActionModule<typeof import("@/app/basic-info/financial-codes/actions")>(
        "@/app/basic-info/financial-codes/actions",
        exportRecorder
      );
    await exportModule.exportFinancialCodes({
      category: "INCOME",
      sortBy: "name",
      sortDirection: "desc",
    });

    expect(findOps(exportRecorder.ops, "from")).toContainEqual({
      method: "from",
      args: ["revenue_codes"],
    });
    expect(findOps(exportRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["revenue_name", { ascending: false }],
    });
  });

  it("operation prices defaults to size sort and export honors condition sort", async () => {
    const getRecorder = createQueryRecorder();
    const actionModule =
      await loadActionModule<typeof import("@/app/basic-info/operation-prices/actions")>(
        "@/app/basic-info/operation-prices/actions",
        getRecorder
      );

    const getResult = await actionModule.getOperationPrices({
      sizeId: "size-1",
      conditionId: "cond-1",
      status: "ACTIVE",
      page: 1,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(getResult.sort).toEqual({ sortBy: "size", sortDirection: "asc" });
    expect(findOps(getRecorder.ops, "order")).toEqual(
      expect.arrayContaining([
        { method: "order", args: ["size_code", { ascending: true, foreignTable: "container_size_codes" }] },
        { method: "order", args: ["condition_code", { ascending: true, foreignTable: "container_condition_codes" }] },
        { method: "order", args: ["effective_from", { ascending: false }] },
      ])
    );

    const exportRecorder = createQueryRecorder();
    const exportModule =
      await loadActionModule<typeof import("@/app/basic-info/operation-prices/actions")>(
        "@/app/basic-info/operation-prices/actions",
        exportRecorder
      );
    await exportModule.exportOperationPrices({
      sortBy: "condition",
      sortDirection: "desc",
    });

    expect(findOps(exportRecorder.ops, "order")).toEqual(
      expect.arrayContaining([
        { method: "order", args: ["condition_code", { ascending: false, foreignTable: "container_condition_codes" }] },
        { method: "order", args: ["size_code", { ascending: true, foreignTable: "container_size_codes" }] },
        { method: "order", args: ["effective_from", { ascending: false }] },
      ])
    );
  });

  it("size codes and type codes default to code sort and honor export overrides", async () => {
    const sizeRecorder = createQueryRecorder();
    const sizeModule =
      await loadActionModule<typeof import("@/app/basic-info/size-codes/actions")>(
        "@/app/basic-info/size-codes/actions",
        sizeRecorder
      );

    const sizeResult = await sizeModule.getSizeCodes({
      code: " 20 ",
      page: 1,
      pageSize: 10,
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
    });

    expect(sizeResult.sort).toEqual({ sortBy: "code", sortDirection: "asc" });
    expect(findOps(sizeRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["size_code", { ascending: true }],
    });

    const typeRecorder = createQueryRecorder();
    const typeModule =
      await loadActionModule<typeof import("@/app/basic-info/type-codes/actions")>(
        "@/app/basic-info/type-codes/actions",
        typeRecorder
      );
    await typeModule.exportTypeCodes({
      code: "GP",
      sortBy: "status",
      sortDirection: "desc",
    });

    expect(findOps(typeRecorder.ops, "order")).toContainEqual({
      method: "order",
      args: ["status", { ascending: false }],
    });
    expect(findOps(typeRecorder.ops, "ilike")).toContainEqual({
      method: "ilike",
      args: ["type_code", "%GP%"],
    });
  });
});
