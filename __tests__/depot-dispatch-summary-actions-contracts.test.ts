import { describe, expect, it, vi } from "vitest";

type QueryOp =
  | { method: "from"; args: unknown[] }
  | { method: "select"; args: unknown[] }
  | { method: "order"; args: unknown[] }
  | { method: "ilike"; args: unknown[] }
  | { method: "eq"; args: unknown[] }
  | { method: "or"; args: unknown[] }
  | { method: "in"; args: unknown[] }
  | { method: "gt"; args: unknown[] }
  | { method: "not"; args: unknown[] };

function createBuilder(data: unknown = []) {
  const ops: QueryOp[] = [];
  const builder: any = {
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
    in: (...args: unknown[]) => {
      ops.push({ method: "in", args });
      return builder;
    },
    gt: (...args: unknown[]) => {
      ops.push({ method: "gt", args });
      return builder;
    },
    not: (...args: unknown[]) => {
      ops.push({ method: "not", args });
      return builder;
    },
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve(resolve({ data, error: null })),
  };

  return { builder, ops };
}

describe("depot dispatch summary action contracts", () => {
  it("city filter expands full city labels into usable code and name operands", async () => {
    vi.resetModules();
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
      unstable_noStore: vi.fn(),
    }));
    vi.doMock("next/headers", () => ({
      headers: vi.fn(async () => new Headers()),
    }));

    const purchaseOrderContainerQuery = createBuilder([]);
    const purchaseOrderItemQuery = createBuilder([]);
    const oneWayPlanQuery = createBuilder([]);
    const transferOrderQuery = createBuilder([]);

    vi.doMock("@/lib/supabase/server", () => ({
      createServerSupabaseClient: () => ({
        from: (table: string) => {
          if (table === "purchase_order_container") return purchaseOrderContainerQuery.builder;
          if (table === "purchase_order_item") return purchaseOrderItemQuery.builder;
          if (table === "one_way_plan") return oneWayPlanQuery.builder;
          if (table === "transfer_order") return transferOrderQuery.builder;
          throw new Error(`Unexpected table ${table}`);
        },
      }),
    }));

    const { getDepotDispatchSummary } =
      await import("@/app/depot-inventory/actions");

    await getDepotDispatchSummary({
      region: "",
      city: "CNSHA · Shanghai",
      depot: "",
      owner: "",
      sizeType: "",
      condition: "",
      color: "",
      machineType: "",
      page: 1,
      pageSize: 20,
    });

    expect(purchaseOrderContainerQuery.ops).toContainEqual({
      method: "or",
      args: [
        expect.stringContaining("city_code.ilike.%CNSHA%"),
        { foreignTable: "location" },
      ],
    });
    expect(purchaseOrderContainerQuery.ops).toContainEqual({
      method: "or",
      args: [
        expect.stringContaining("city_name.ilike.%Shanghai%"),
        { foreignTable: "location" },
      ],
    });
    expect(purchaseOrderItemQuery.ops).toContainEqual({
      method: "or",
      args: [
        expect.stringContaining("city_code.ilike.%CNSHA%"),
        { foreignTable: "location" },
      ],
    });
    expect(purchaseOrderItemQuery.ops).toContainEqual({
      method: "or",
      args: [
        expect.stringContaining("city_name.ilike.%Shanghai%"),
        { foreignTable: "location" },
      ],
    });
  });
});
