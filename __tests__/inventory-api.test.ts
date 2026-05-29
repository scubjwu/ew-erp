import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserClient } from "@/lib/supabase/client";
import { fetchInventoryData } from "@/lib/supabase/inventory-api";

vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: vi.fn(),
}));

type QueryResponse = { data: unknown; error: null } | { data: null; error: Error };

function buildEqQuery(response: QueryResponse) {
  return {
    eq: vi.fn(async () => response),
  };
}

function buildInQuery(response: QueryResponse) {
  return {
    in: vi.fn(async () => response),
  };
}

describe("fetchInventoryData", () => {
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReset();
    vi.mocked(createBrowserClient).mockReturnValue({ from } as never);
  });

  it("maps in-transit inventory from container and transfer tables without reading legacy inventory", async () => {
    const calls: string[] = [];

    from.mockImplementation((table: string) => {
      calls.push(table);

      if (table === "container") {
        return {
          select: vi.fn(() =>
            buildEqQuery({
              data: [
                {
                  id: "container-1",
                  container_number: "TGHU1234567",
                  color: "RAL1000",
                  machine_type: "GENSET",
                  yom: 2024,
                  vents: 4,
                  flp: true,
                  lbx: false,
                  locking_bars: true,
                  status: "AVAILABLE",
                  lifecycle_stage: "IN_TRANSIT",
                  current_transfer_id: "transfer-1",
                  container_size_code_id: "size-1",
                  container_type_code_id: "type-1",
                  container_condition_code_id: "condition-1",
                },
                {
                  id: "container-2",
                  container_number: "MSKU9999999",
                  color: "RAL2000",
                  machine_type: "STD",
                  yom: null,
                  vents: null,
                  flp: false,
                  lbx: true,
                  locking_bars: false,
                  status: "AVAILABLE",
                  lifecycle_stage: "IN_TRANSIT",
                  current_transfer_id: "transfer-missing",
                  container_size_code_id: "size-2",
                  container_type_code_id: "type-2",
                  container_condition_code_id: "condition-2",
                },
                {
                  id: "container-3",
                  container_number: "OOLU0000000",
                  lifecycle_stage: "IN_YARD",
                  current_transfer_id: "transfer-1",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "transfer_order") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  id: "transfer-1",
                  dispatch_vendor_id: "lessee-1",
                  pol_city_id: "city-pol-1",
                  pod_city_id: "city-pod-1",
                  onhire_no: "OH-1001",
                  carrier: "MSC",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "transfer_item") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  transfer_order_id: "transfer-1",
                  container_id: "container-1",
                  delivery_date: "2026-05-20T00:00:00Z",
                  eta: "2026-06-01",
                  gate_in_ref: "GATE-REF-1",
                  return_depot_name: "Return Depot A",
                  return_depot_address: "1 Port Way",
                  return_depot_tel: "555-0101",
                  arrange_date: "2026-05-28",
                  customer_order_num: "CO-1001",
                  remark2: "Handle with care",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "container_size_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [{ id: "size-1", size_code: "40" }, { id: "size-2", size_code: "20" }],
              error: null,
            })
          ),
        };
      }

      if (table === "container_type_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [{ id: "type-1", type_code: "HC" }, { id: "type-2", type_code: "GP" }],
              error: null,
            })
          ),
        };
      }

      if (table === "container_condition_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                { id: "condition-1", condition_code: "IICL" },
                { id: "condition-2", condition_code: "CW" },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "cities") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                { id: "city-pol-1", city_code: "CNSHA" },
                { id: "city-pod-1", city_code: "USLAX" },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "lessees") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  id: "lessee-1",
                  company_name: "CMA CGM",
                  legal_company_name: "CMA CGM SA",
                  lessee_code: "CMA",
                },
              ],
              error: null,
            })
          ),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const rows = await fetchInventoryData({
      pasteUnits: [],
      textFilters: {},
      dateFilters: {
        etaFrom: "",
        etaTo: "",
        salesDateFrom: "",
        salesDateTo: "",
        onHireFrom: "",
        onHireTo: "",
      },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: "container-1",
        unit: "TGHU1234567",
        specs: "40HC",
        condition: "IICL",
        color: "RAL1000",
        engine: "GENSET",
        yom: "2024",
        vents: "4",
        flp: "FLP",
        lbx: "-",
        eod: "EOD",
        status: "AVAILABLE",
        pol: "CNSHA",
        pod: "USLAX",
        transitCompany: "CMA CGM",
        onhire_no: "OH-1001",
        onhire_date: "2026-05-20",
        carrier: "MSC",
        eta: "2026-06-01",
        salesDate: "2026-05-28",
        customerOrderNum: "CO-1001",
        depotName: "Return Depot A",
        depotAddr: "1 Port Way",
        depotTel: "555-0101",
        gateInRef: "GATE-REF-1",
        remark2: "Handle with care",
      }),
    ]);
    expect(calls).toContain("container");
    expect(calls).toContain("transfer_order");
    expect(calls).toContain("transfer_item");
    expect(calls).not.toContain("inventory");
  });

  it("applies client-side filters and falls back transit company labels", async () => {
    from.mockImplementation((table: string) => {
      if (table === "container") {
        return {
          select: vi.fn(() =>
            buildEqQuery({
              data: [
                {
                  id: "container-1",
                  container_number: "TGHU1234567",
                  color: "RAL1000",
                  machine_type: "GENSET",
                  yom: 2024,
                  vents: 4,
                  flp: true,
                  lbx: false,
                  locking_bars: true,
                  status: "AVAILABLE",
                  lifecycle_stage: "IN_TRANSIT",
                  current_transfer_id: "transfer-1",
                  container_size_code_id: "size-1",
                  container_type_code_id: "type-1",
                  container_condition_code_id: "condition-1",
                },
                {
                  id: "container-2",
                  container_number: "MSKU8888888",
                  color: "RAL2000",
                  machine_type: "STD",
                  yom: null,
                  vents: null,
                  flp: false,
                  lbx: false,
                  locking_bars: false,
                  status: "HOLD",
                  lifecycle_stage: "IN_TRANSIT",
                  current_transfer_id: "transfer-2",
                  container_size_code_id: "size-2",
                  container_type_code_id: "type-2",
                  container_condition_code_id: "condition-2",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "transfer_order") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  id: "transfer-1",
                  dispatch_vendor_id: "lessee-1",
                  pol_city_id: "city-pol-1",
                  pod_city_id: "city-pod-1",
                  onhire_no: "OH-1001",
                  carrier: "MSC",
                },
                {
                  id: "transfer-2",
                  dispatch_vendor_id: "lessee-2",
                  pol_city_id: "city-pol-2",
                  pod_city_id: "city-pod-2",
                  onhire_no: "OH-2002",
                  carrier: "MAERSK",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "transfer_item") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  transfer_order_id: "transfer-1",
                  container_id: "container-1",
                  delivery_date: "2026-05-20T00:00:00Z",
                  eta: "2026-06-01",
                  gate_in_ref: null,
                  return_depot_name: null,
                  return_depot_address: null,
                  return_depot_tel: null,
                  arrange_date: "2026-05-26",
                  customer_order_num: null,
                  remark2: null,
                },
                {
                  transfer_order_id: "transfer-2",
                  container_id: "container-2",
                  delivery_date: null,
                  eta: "2026-06-05",
                  gate_in_ref: "GATE-REF-2",
                  return_depot_name: "Return Depot B",
                  return_depot_address: "9 Harbor Road",
                  return_depot_tel: "555-0202",
                  arrange_date: "2026-05-27",
                  customer_order_num: "CO-2002",
                  remark2: "Redeliver after notice",
                },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "container_size_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [{ id: "size-1", size_code: "40" }, { id: "size-2", size_code: "20" }],
              error: null,
            })
          ),
        };
      }

      if (table === "container_type_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [{ id: "type-1", type_code: "HC" }, { id: "type-2", type_code: "GP" }],
              error: null,
            })
          ),
        };
      }

      if (table === "container_condition_codes") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                { id: "condition-1", condition_code: "IICL" },
                { id: "condition-2", condition_code: "CW" },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "cities") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                { id: "city-pol-1", city_code: "CNSHA" },
                { id: "city-pod-1", city_code: "USLAX" },
                { id: "city-pol-2", city_code: "HKHKG" },
                { id: "city-pod-2", city_code: "DEHAM" },
              ],
              error: null,
            })
          ),
        };
      }

      if (table === "lessees") {
        return {
          select: vi.fn(() =>
            buildInQuery({
              data: [
                {
                  id: "lessee-1",
                  company_name: "CMA CGM",
                  legal_company_name: "CMA CGM SA",
                  lessee_code: "CMA",
                },
                {
                  id: "lessee-2",
                  company_name: "",
                  legal_company_name: "Mediterranean Shipping Company",
                  lessee_code: "MSC",
                },
              ],
              error: null,
            })
          ),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const rows = await fetchInventoryData({
      pasteUnits: ["MSKU8888888"],
      textFilters: {
        carrier: "mae",
        transitCompany: "mediterranean",
        pod: "DEH",
      },
      dateFilters: {
        etaFrom: "2026-06-05",
        etaTo: "2026-06-05",
        salesDateFrom: "2026-05-27",
        salesDateTo: "2026-05-27",
        onHireFrom: "",
        onHireTo: "",
      },
    });

    expect(rows).toEqual([
      expect.objectContaining({
        unit: "MSKU8888888",
        eta: "2026-06-05",
        salesDate: "2026-05-27",
        depotName: "Return Depot B",
        depotAddr: "9 Harbor Road",
        depotTel: "555-0202",
        gateInRef: "GATE-REF-2",
        customerOrderNum: "CO-2002",
        remark2: "Redeliver after notice",
        transitCompany: "Mediterranean Shipping Company",
        onhire_date: "-",
        vents: "-",
      }),
    ]);
  });
});
