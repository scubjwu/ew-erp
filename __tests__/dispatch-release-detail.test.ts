import { describe, expect, it, vi } from "vitest";

type QueryConfig = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

function createTableBuilder(table: string, config: QueryConfig) {
  const result = {
    data: config.data ?? [],
    error: config.error ?? null,
    count: config.count ?? null,
  };

  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    in: () => builder,
    single: async () => result,
    then: async (
      resolve: (value: {
        data: unknown;
        error: unknown;
        count: number | null;
      }) => unknown
    ) => resolve(result),
  };

  return builder;
}

function createSupabaseMock(tables: Record<string, QueryConfig>) {
  return {
    from: (table: string) => createTableBuilder(table, tables[table] ?? {}),
  };
}

async function loadDispatchActions(client: { from: (table: string) => any }) {
  vi.resetModules();
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
    unstable_noStore: vi.fn(),
  }));
  vi.doMock("@/lib/supabase/server", () => ({
    createServerSupabaseClient: () => client,
  }));
  return import("@/app/dispatch/actions");
}

describe("dispatch release detail", () => {
  it("maps per-container revenue, cost, and profit totals onto item lines", async () => {
    const actionModule = await loadDispatchActions(
      createSupabaseMock({
        transfer_order: {
          data: {
            id: "transfer-1",
            order_no: "DNSA000002",
            status: "IN_TRANSIT",
            transfer_type: "DISPATCH_RELEASE",
            release_source: "VENDOR_REF",
            source_purchase_order_id: "po-1",
            source_purchase_order_item_id: "poi-1",
            vendor_release_number: "VR-1",
            dispatch_vendor_id: "lessee-1",
            release_date: "2026-05-25",
            dispatch_plan_no: null,
            carrier_plan_no: null,
            onhire_no: "ONH-1",
            hold_reason: null,
            cancel_reason: null,
            cancelled_at: null,
            carrier: "CMA",
            dispatch_arrange_date: null,
            remark: null,
            box_selection_mode: "SPECIFIED",
            release_qty: 2,
            assigned_qty: 2,
            unassigned_qty: 0,
            pickup_charge: 150,
            dpp: 100,
            free_days: 90,
            rv: 2000,
            daily_rent: 1,
            header_currency: "USD",
            item_cost_currency: "USD",
            trucking_cost: 0,
            handling_fee: 10,
            repair_cost_total: 7,
            damage_claim_total: 3,
            trucking_cost_total_in_header_currency: 0,
            repair_cost_total_in_header_currency: 7,
            damage_claim_total_in_header_currency: 3,
            total_cost: 17,
            total_revenue: 305,
            dispatch_vendor: { company_name: "CMA CGM", legal_company_name: null, lessee_code: "B4M9C1" },
            pol: { city_code: "CNNSA", city_name: "Nansha" },
            pod: { city_code: "USTBA", city_name: "Tampa" },
            from_depot: null,
            self_pickup_depot: { depot_name: "vendor depot", depot_code: "CNNSAVDP" },
            source_item: {
              id: "poi-1",
              color: null,
              machine_type: null,
              location: { city_code: "CNNSA", city_name: "Nansha", region: "South China" },
              depot: { depot_code: "CNNSAVDP", depot_name: "vendor depot" },
              size: { size_code: "40" },
              type: { type_code: "HQ" },
              condition: { condition_code: "CW" },
            },
          },
        },
        transfer_item: {
          data: [
            {
              id: "item-1",
              item_status: "IN_TRANSIT",
              delivery_date: "2026-05-25",
              eta: "2026-06-01",
              trucking_cost: 0,
              trucking_cost_currency: "USD",
              repair_cost: 7,
              repair_cost_currency: "USD",
              damage_claim: 3,
              damage_claim_currency: "USD",
              gate_in_ref: "GATE-123",
              return_depot_name: "LA Return Depot",
              return_depot_address: "1 Port Road",
              return_depot_tel: "555-1000",
              arrange_date: "2026-05-24",
              customer_order_num: "CO-7788",
              remark2: "Secondary remark",
              remark: null,
              container: { id: "container-1", container_number: "BSIU1111111" },
            },
            {
              id: "item-2",
              item_status: "IN_TRANSIT",
              delivery_date: "2026-05-25",
              eta: null,
              trucking_cost: 0,
              trucking_cost_currency: "USD",
              repair_cost: 0,
              repair_cost_currency: "USD",
              damage_claim: 0,
              damage_claim_currency: "USD",
              gate_in_ref: null,
              return_depot_name: null,
              return_depot_address: null,
              return_depot_tel: null,
              arrange_date: null,
              customer_order_num: null,
              remark2: null,
              remark: null,
              container: { id: "container-2", container_number: "BSIU2222222" },
            },
          ],
        },
        transfer_order_attachment_links: { data: [] },
        business_cost: {
          data: [
            {
              id: "cost-1",
              amount: 5,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release handling fee",
              container_id: "container-1",
              cost_codes: { cost_code: "HDL" },
            },
            {
              id: "cost-2",
              amount: 5,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release handling fee",
              container_id: "container-2",
              cost_codes: { cost_code: "HDL" },
            },
            {
              id: "cost-3",
              amount: 7,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release repair cost",
              container_id: "container-1",
              cost_codes: { cost_code: "REP" },
            },
          ],
        },
        business_revenue: {
          data: [
            {
              id: "rev-1",
              amount: 150,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release pick-up charge",
              container_id: "container-1",
              revenue_codes: { revenue_code: "PUC" },
            },
            {
              id: "rev-2",
              amount: 150,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release pick-up charge",
              container_id: "container-2",
              revenue_codes: { revenue_code: "PUC" },
            },
            {
              id: "rev-3",
              amount: 3,
              currency: "USD",
              occur_date: "2026-05-25",
              remark: "Dispatch release damage claim recovery",
              container_id: "container-1",
              revenue_codes: { revenue_code: "RPR" },
            },
            {
              id: "rev-4",
              amount: 2,
              currency: "USD",
              occur_date: "2026-05-30",
              remark: "pickup_date=2026-05-25; period_start=2026-05-30; period_end=2026-05-30; billable_days=2",
              container_id: "container-2",
              revenue_codes: { revenue_code: "DMR" },
            },
          ],
        },
        finance_record: { data: [] },
        container_event: { data: [{ container_id: "container-1" }] },
      })
    );

    const detail = await actionModule.getDispatchReleaseDetail("transfer-1");

    expect(detail.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          containerId: "container-1",
          eta: "2026-06-01",
          gateInRef: "GATE-123",
          returnDepotName: "LA Return Depot",
          returnDepotAddress: "1 Port Road",
          returnDepotTel: "555-1000",
          arrangeDate: "2026-05-24",
          customerOrderNum: "CO-7788",
          remark2: "Secondary remark",
          pickupChargeRevenue: 150,
          dailyRentRevenue: 0,
          damageRecoveryRevenue: 3,
          handlingFeeAllocated: 5,
          revenueTotal: 153,
          costTotal: 12,
          profitTotal: 141,
        }),
        expect.objectContaining({
          containerId: "container-2",
          pickupChargeRevenue: 150,
          dailyRentRevenue: 2,
          damageRecoveryRevenue: 0,
          handlingFeeAllocated: 5,
          revenueTotal: 152,
          costTotal: 5,
          profitTotal: 147,
        }),
      ])
    );
  });
});
