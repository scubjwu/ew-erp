import { describe, expect, it, vi } from "vitest";

type QueryOp =
  | { table: string; method: "from"; args: unknown[] }
  | { table: string; method: "select"; args: unknown[] }
  | { table: string; method: "order"; args: unknown[] }
  | { table: string; method: "ilike"; args: unknown[] }
  | { table: string; method: "eq"; args: unknown[] }
  | { table: string; method: "or"; args: unknown[] }
  | { table: string; method: "in"; args: unknown[] }
  | { table: string; method: "limit"; args: unknown[] }
  | { table: string; method: "range"; args: unknown[] };

type TableConfig = {
  data?: unknown;
  count?: number | null;
};

function createTableBuilder(table: string, ops: QueryOp[], config: TableConfig = {}) {
  const builder = {
    select: (...args: unknown[]) => {
      ops.push({ table, method: "select", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      ops.push({ table, method: "order", args });
      return builder;
    },
    ilike: (...args: unknown[]) => {
      ops.push({ table, method: "ilike", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      ops.push({ table, method: "eq", args });
      return builder;
    },
    or: (...args: unknown[]) => {
      ops.push({ table, method: "or", args });
      return builder;
    },
    in: (...args: unknown[]) => {
      ops.push({ table, method: "in", args });
      return builder;
    },
    limit: (...args: unknown[]) => {
      ops.push({ table, method: "limit", args });
      return builder;
    },
    range: async (...args: unknown[]) => {
      ops.push({ table, method: "range", args });
      return {
        data: config.data ?? [],
        error: null,
        count: config.count ?? 0,
      };
    },
    then: async (resolve: (value: { data: unknown; error: null; count?: number | null }) => unknown) =>
      resolve({
        data: config.data ?? [],
        error: null,
        count: config.count,
      }),
  };

  return builder;
}

function createSupabaseMock(tables: Record<string, TableConfig> = {}) {
  const ops: QueryOp[] = [];
  const client = {
    from: (table: string) => {
      ops.push({ table, method: "from", args: [table] });
      return createTableBuilder(table, ops, tables[table]);
    },
  };
  return { ops, client };
}

async function loadActionModule<TModule>(
  modulePath: string,
  client: { from: (table: string) => any }
): Promise<TModule> {
  vi.resetModules();
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createServerSupabaseClient: () => client,
  }));
  return import(modulePath) as Promise<TModule>;
}

function findOps(ops: QueryOp[], table: string, method: QueryOp["method"]) {
  return ops.filter((op) => op.table === table && op.method === method);
}

describe("partner actions contracts", () => {
  it("vendors defaults to vendor code sort and selectedRegionId wins over regionQuery", async () => {
    const { ops, client } = createSupabaseMock();
    const { getVendors, exportVendors } =
      await loadActionModule<typeof import("@/app/partners/vendors/actions")>(
        "@/app/partners/vendors/actions",
        client
      );

    const result = await getVendors({
      vendorCode: " V001 ",
      legalCompanyName: " Acme ",
      regionQuery: " China ",
      selectedRegionId: "region-1",
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
      page: 2,
      pageSize: 10,
    });

    expect(result.sort).toEqual({ sortBy: "vendorCode", sortDirection: "asc" });
    expect(findOps(ops, "vendors", "order")).toContainEqual({
      table: "vendors",
      method: "order",
      args: ["vendor_code", { ascending: true }],
    });
    expect(findOps(ops, "vendors", "ilike")).toContainEqual({
      table: "vendors",
      method: "ilike",
      args: ["vendor_code", "%V001%"],
    });
    expect(findOps(ops, "vendors", "or")).toContainEqual({
      table: "vendors",
      method: "or",
      args: ["legal_company_name.ilike.%Acme%,company_name.ilike.%Acme%"],
    });
    expect(findOps(ops, "vendors", "eq")).toContainEqual({
      table: "vendors",
      method: "eq",
      args: ["region_id", "region-1"],
    });
    expect(findOps(ops, "region_codes", "from")).toHaveLength(0);
    expect(findOps(ops, "vendors", "range")).toContainEqual({
      table: "vendors",
      method: "range",
      args: [10, 19],
    });

    const exportMock = createSupabaseMock();
    const exportModule =
      await loadActionModule<typeof import("@/app/partners/vendors/actions")>(
        "@/app/partners/vendors/actions",
        exportMock.client
      );
    await exportModule.exportVendors({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });

    expect(findOps(exportMock.ops, "vendors", "order")).toContainEqual({
      table: "vendors",
      method: "order",
      args: ["settlement_current_prepaid_balance", { ascending: false }],
    });
  });

  it("material vendors trims filters and export follows applied sort", async () => {
    const { ops, client } = createSupabaseMock();
    const { getMaterialVendors, exportMaterialVendors } =
      await loadActionModule<typeof import("@/app/partners/material-vendors/actions")>(
        "@/app/partners/material-vendors/actions",
        client
      );

    const result = await getMaterialVendors({
      vendorCode: " MV001 ",
      legalCompanyName: " Steel ",
      materialCategory: "FRAME",
      isDefaultVendor: "yes",
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
      page: 1,
      pageSize: 10,
    });

    expect(result.sort).toEqual({ sortBy: "vendorCode", sortDirection: "asc" });
    expect(findOps(ops, "material_vendors", "order")).toContainEqual({
      table: "material_vendors",
      method: "order",
      args: ["vendor_code", { ascending: true }],
    });
    expect(findOps(ops, "material_vendors", "eq")).toEqual(
      expect.arrayContaining([
        { table: "material_vendors", method: "eq", args: ["material_category", "FRAME"] },
        { table: "material_vendors", method: "eq", args: ["is_default_vendor", true] },
      ])
    );

    const exportMock = createSupabaseMock();
    const exportModule =
      await loadActionModule<typeof import("@/app/partners/material-vendors/actions")>(
        "@/app/partners/material-vendors/actions",
        exportMock.client
      );
    await exportModule.exportMaterialVendors({
      sortBy: "defaultVendor",
      sortDirection: "desc",
    });
    expect(findOps(exportMock.ops, "material_vendors", "order")).toContainEqual({
      table: "material_vendors",
      method: "order",
      args: ["is_default_vendor", { ascending: false }],
    });
  });

  it("container owners uses regionQuery lookup when no selectedRegionId is provided", async () => {
    const { ops, client } = createSupabaseMock({
      region_codes: { data: [{ id: "region-1" }, { id: "region-2" }] },
    });
    const { getContainerOwners, exportContainerOwners } =
      await loadActionModule<typeof import("@/app/partners/container-owners/actions")>(
        "@/app/partners/container-owners/actions",
        client
      );

    const result = await getContainerOwners({
      containerOwnerCode: " CO1 ",
      legalCompanyName: " Owner ",
      regionQuery: " China ",
      selectedRegionId: "",
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
      page: 1,
      pageSize: 10,
    });

    expect(result.sort).toEqual({ sortBy: "containerOwnerCode", sortDirection: "asc" });
    expect(findOps(ops, "region_codes", "or")).toContainEqual({
      table: "region_codes",
      method: "or",
      args: ["region_code.ilike.%China%,region_name.ilike.%China%"],
    });
    expect(findOps(ops, "container_owners", "in")).toContainEqual({
      table: "container_owners",
      method: "in",
      args: ["region_id", ["region-1", "region-2"]],
    });

    const exportMock = createSupabaseMock();
    const exportModule =
      await loadActionModule<typeof import("@/app/partners/container-owners/actions")>(
        "@/app/partners/container-owners/actions",
        exportMock.client
      );
    await exportModule.exportContainerOwners({
      sortBy: "region",
      sortDirection: "desc",
    });

    expect(findOps(exportMock.ops, "container_owners", "order")).toContainEqual({
      table: "container_owners",
      method: "order",
      args: ["region_code", { ascending: false, foreignTable: "region" }],
    });
  });

  it("lessee uses regionQuery lookup and export follows currentPrepaidBalance sort", async () => {
    const { ops, client } = createSupabaseMock({
      region_codes: { data: [{ id: "region-9" }] },
    });
    const { getLessees, exportLessees } =
      await loadActionModule<typeof import("@/app/partners/lessee/actions")>(
        "@/app/partners/lessee/actions",
        client
      );

    const result = await getLessees({
      lesseeCode: " LS1 ",
      legalCompanyName: " Lease Corp ",
      regionQuery: " USA ",
      selectedRegionId: "",
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
      page: 1,
      pageSize: 10,
    });

    expect(result.sort).toEqual({ sortBy: "lesseeCode", sortDirection: "asc" });
    expect(findOps(ops, "lessees", "in")).toContainEqual({
      table: "lessees",
      method: "in",
      args: ["region_id", ["region-9"]],
    });

    const exportMock = createSupabaseMock();
    const exportModule =
      await loadActionModule<typeof import("@/app/partners/lessee/actions")>(
        "@/app/partners/lessee/actions",
        exportMock.client
      );
    await exportModule.exportLessees({
      sortBy: "currentPrepaidBalance",
      sortDirection: "desc",
    });
    expect(findOps(exportMock.ops, "lessees", "order")).toContainEqual({
      table: "lessees",
      method: "order",
      args: ["settlement_current_prepaid_balance", { ascending: false }],
    });
  });

  it("customers defaults to customer id sort and export follows region sort", async () => {
    const { ops, client } = createSupabaseMock();
    const { getCustomers, exportCustomers } =
      await loadActionModule<typeof import("@/app/customers/actions")>(
        "@/app/customers/actions",
        client
      );

    const result = await getCustomers({
      customerId: " C001 ",
      companyName: " Pacific ",
      sortBy: "invalid" as any,
      sortDirection: "invalid" as any,
      page: 2,
      pageSize: 10,
    });

    expect(result.sort).toEqual({ sortBy: "customerId", sortDirection: "asc" });
    expect(findOps(ops, "customers", "order")).toContainEqual({
      table: "customers",
      method: "order",
      args: ["customer_custom_id", { ascending: true }],
    });
    expect(findOps(ops, "customers", "range")).toContainEqual({
      table: "customers",
      method: "range",
      args: [10, 19],
    });

    const exportMock = createSupabaseMock();
    const exportModule =
      await loadActionModule<typeof import("@/app/customers/actions")>(
        "@/app/customers/actions",
        exportMock.client
      );
    await exportModule.exportCustomers({
      sortBy: "region",
      sortDirection: "desc",
    });
    expect(findOps(exportMock.ops, "customers", "order")).toContainEqual({
      table: "customers",
      method: "order",
      args: ["region_code", { ascending: false, foreignTable: "region" }],
    });
  });
});
