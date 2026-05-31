import { createBrowserClient } from "@/lib/supabase/client";
import {
  filterInTransitInventoryRows,
  mapInTransitInventoryRows,
} from "@/lib/inventory/in-transit-read-model";
import type { InventoryDateFilters, InventoryRow } from "@/types/inventory";

type InventoryDbRow = {
  id: string;
  unit_number: string | null;
  container_size: string | null;
  container_type: string | null;
  lifecycle_stage: string | null;
  condition: string | null;
  status: string | null;
  cost_price: number | null;
  sold_price: number | null;
  target_price: number | null;
  color: string | null;
  eta: string | null;
  purchase_date: string | null;
  planned_depot_name: string | null;
  actual_depot_id: string | null;
  pol_id: string | null;
  pod_id: string | null;
  container_specs: {
    color_code?: string | null;
    year?: number | string | null;
    engine?: string | null;
    VENT?: string | null;
    flp?: string | null;
    lbx?: string | null;
    locking_bars?: string | null;
  } | null;
  logistics_data: {
    pod?: string | null;
    eta?: string | null;
    carrier?: string | null;
    planned_depot_Name?: string | null;
    planned_depot_Addr?: string | null;
    planned_depot_Tel?: string | null;
    gate_in_ref?: string | null;
    lessee?: string | null;
    pol?: string | null;
    onhire_no?: string | null;
    onhire_date?: string | null;
    arrange_date?: string | null;
  } | null;
  financial_data: {
    customer_order_no?: string | null;
    sales_region?: string | null;
  } | null;
  remarks: {
    remark1?: string | null;
    remark2?: string | null;
  } | null;
  sales_rep?: { full_name?: string | null } | null;
  attached_customer?: { company_name?: string | null } | null;
  actual_depot?: {
    depot_name?: string | null;
    depot_tel?: string | null;
    depot_address?: string | null;
  } | null;
  pol_city?: { city_name?: string | null; city_code?: string | null } | null;
  pod_city?: { city_name?: string | null; city_code?: string | null } | null;
};

export interface InventoryQueryParams {
  pasteUnits: string[];
  textFilters: Record<string, string>;
  dateFilters: InventoryDateFilters;
}

type DirtyCellMap = Record<string, string>;
export type InventoryUpdateSummary = {
  totalRows: number;
  succeeded: number;
  failed: number;
  failures: Array<{ rowId: string; error: string }>;
};

type InventoryEditableField =
  | "sales"
  | "customer_id"
  | "status"
  | "condition"
  | "container_type"
  | "specs"
  | "color"
  | "purchase_date"
  | "actual_depot_id"
  | "pol_id"
  | "pod_id"
  | "year"
  | "yom"
  | "engine"
  | "eta"
  | "pod"
  | "carrier"
  | "transitCompany"
  | "pol"
  | "onhire_no"
  | "onhire_date"
  | "gateInRef"
  | "depotName"
  | "depotAddr"
  | "depotTel"
  | "customerOrderNum"
  | "salesDate"
  | "salesRep"
  | "customer"
  | "price"
  | "remark1"
  | "remark2";

function parseDirtyKey(key: string): { rowId: string; field: InventoryEditableField } | null {
  const [rowId, field] = key.split("::");
  if (!rowId || !field) return null;
  return { rowId, field: field as InventoryEditableField };
}

export async function updateInventoryData(
  dirtyCells: DirtyCellMap
): Promise<InventoryUpdateSummary> {
  const supabase = createBrowserClient();

  // 1. 提取所有需要查找名字的集合
  const grouped = new Map<string, Partial<Record<InventoryEditableField, string>>>();
  const salesNames = new Set<string>();
  const customerNames = new Set<string>();
  const depotNames = new Set<string>();
  const cityCodes = new Set<string>();

  for (const [key, value] of Object.entries(dirtyCells)) {
    const parsed = parseDirtyKey(key);
    if (!parsed) continue;
    const rowPatch = grouped.get(parsed.rowId) ?? {};
    rowPatch[parsed.field] = value;
    grouped.set(parsed.rowId, rowPatch);

    // 收集待查找的名字
    if (parsed.field === "salesRep" && value.trim()) salesNames.add(value.trim());
    if (parsed.field === "customer" && value.trim()) customerNames.add(value.trim());
    if (parsed.field === "depotName" && value.trim()) depotNames.add(value.trim());
    if ((parsed.field === "pol" || parsed.field === "pod") && value.trim()) {
      cityCodes.add(value.trim().toUpperCase());
    }
  }

  // 2. 【核心优化】一次性查询所有相关的 ID 映射
  const salesMap = new Map<string, string>();
  const customerMap = new Map<string, string>();
  const depotMap = new Map<string, string>();
  const cityMap = new Map<string, string>();

  if (salesNames.size > 0) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .in("full_name", Array.from(salesNames));
    data?.forEach(u => {
      if (u.full_name) salesMap.set(u.full_name.toLowerCase(), u.id); // 安全！
    });
  }

  if (customerNames.size > 0) {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name")
      .in("company_name", Array.from(customerNames));
    data?.forEach(c => {
      if (c.company_name) customerMap.set(c.company_name.toLowerCase(), c.id); // 安全！
    });
  }

  if (depotNames.size > 0) {
    const { data } = await supabase
      .from("depots")
      .select("id, depot_name")
      .in("depot_name", Array.from(depotNames));
    data?.forEach(d => {
      if (d.depot_name) depotMap.set(String(d.depot_name).toLowerCase(), d.id);
    });
  }

  if (cityCodes.size > 0) {
    const { data } = await supabase
      .from("cities")
      .select("id, city_code")
      .in("city_code", Array.from(cityCodes));
    data?.forEach(c => {
      if (c.city_code) cityMap.set(String(c.city_code).toUpperCase(), c.id);
    });
  }

  // 3. 执行批量更新
  type UpdateResult = { rowId: string; success: boolean; error?: string };
  const updates = Array.from(grouped.entries()).map(async ([rowId, patch]) => {
    try {
      // 这里的 Fetch 依然保留以确保 JSONB 的 Patch 安全，但 Lookup 压力已经消失了
      const { data: currentRow, error: fetchError } = await supabase
        .from("inventory")
        .select("sales, customer_id, target_price, status, condition, container_size, container_type, color, eta, purchase_date, planned_depot_name, actual_depot_id, pol_id, pod_id, container_specs, logistics_data, financial_data, remarks")
        .eq("id", rowId)
        .single();

      if (fetchError) throw fetchError;

      const updatePayload: Record<string, any> = {};
      const containerSpecs = { ...(currentRow.container_specs ?? {}) };
      const logisticsData = { ...(currentRow.logistics_data ?? {}) };
      const financialData = { ...(currentRow.financial_data ?? {}) };
      const remarks = { ...(currentRow.remarks ?? {}) };

      // Flat columns
      if (patch.sales != null) updatePayload.sales = patch.sales;
      if (patch.customer_id != null) updatePayload.customer_id = patch.customer_id;
      if (patch.status != null) updatePayload.status = patch.status;
      if (patch.condition != null) updatePayload.condition = patch.condition;
      if (patch.specs != null) updatePayload.container_type = patch.specs;
      if (patch.price != null) updatePayload.target_price = Number(patch.price) || 0;
      if (patch.color != null) updatePayload.color = patch.color;
      if (patch.eta != null) updatePayload.eta = patch.eta;
      if (patch.purchase_date != null) updatePayload.purchase_date = patch.purchase_date;
      if (patch.actual_depot_id != null) {
        updatePayload.actual_depot_id = patch.actual_depot_id || null;
      }
      if (patch.pol_id != null) {
        updatePayload.pol_id = patch.pol_id || null;
      }
      if (patch.pod_id != null) {
        updatePayload.pod_id = patch.pod_id || null;
      }

      // 【性能提升】从内存 Map 中读取 ID
      if (patch.salesRep != null) {
        const id = salesMap.get(patch.salesRep.trim().toLowerCase());
        if (id) updatePayload.sales = id;
      }
      if (patch.customer != null) {
        const id = customerMap.get(patch.customer.trim().toLowerCase());
        if (id) updatePayload.customer_id = id;
      }
      if (patch.depotName != null) {
        const depotName = patch.depotName.trim();
        updatePayload.planned_depot_name = depotName;
        const depotId = depotMap.get(depotName.toLowerCase());
        if (depotId) updatePayload.actual_depot_id = depotId;
      }
      if (patch.pol != null) {
        const code = patch.pol.trim().toUpperCase();
        const cityId = cityMap.get(code);
        if (cityId) updatePayload.pol_id = cityId;
      }
      if (patch.pod != null) {
        const code = patch.pod.trim().toUpperCase();
        const cityId = cityMap.get(code);
        if (cityId) updatePayload.pod_id = cityId;
      }

      // JSONB merge 逻辑保持不变...
      if (patch.year != null || patch.yom != null) {
        const yearRaw = (patch.year ?? patch.yom ?? "").trim();
        const yearNum = Number(yearRaw);
        containerSpecs.year = (yearRaw === "" || isNaN(yearNum)) ? null : yearNum;
      }
      if (patch.engine != null) containerSpecs.engine = patch.engine;
      if (patch.color != null) containerSpecs.color_code = patch.color;
      if (patch.eta != null) logisticsData.eta = patch.eta;
      if (patch.carrier != null) logisticsData.carrier = patch.carrier;
      if (patch.transitCompany != null) logisticsData.lessee = patch.transitCompany;
      if (patch.onhire_no != null) logisticsData.onhire_no = patch.onhire_no;
      if (patch.onhire_date != null) logisticsData.onhire_date = patch.onhire_date;
      if (patch.gateInRef != null) logisticsData.gate_in_ref = patch.gateInRef;
      if (patch.salesDate != null) logisticsData.arrange_date = patch.salesDate;
      if (patch.depotName != null) logisticsData.planned_depot_Name = patch.depotName;
      if (patch.depotAddr != null) logisticsData.planned_depot_Addr = patch.depotAddr;
      if (patch.depotTel != null) logisticsData.planned_depot_Tel = patch.depotTel;
      if (patch.pol != null) logisticsData.pol = patch.pol;
      if (patch.pod != null) logisticsData.pod = patch.pod;

      if (patch.customerOrderNum != null) financialData.customer_order_no = patch.customerOrderNum;
      if (patch.remark1 != null) remarks.remark1 = patch.remark1;
      if (patch.remark2 != null) remarks.remark2 = patch.remark2;

      // 组装 Payload
      updatePayload.container_specs = containerSpecs;
      updatePayload.logistics_data = logisticsData;
      updatePayload.financial_data = financialData;
      updatePayload.remarks = remarks;

      const { error: updateError } = await supabase
        .from("inventory")
        .update(updatePayload)
        .eq("id", rowId);

      if (updateError) throw updateError;
      return { rowId, success: true } as UpdateResult;
    } catch (error) {
      return { rowId, success: false, error: (error as any).message } as UpdateResult;
    }
  });

  const results = await Promise.all(updates);
  const failures = results.filter(r => !r.success).map(r => ({ rowId: r.rowId, error: r.error! }));

  return {
    totalRows: results.length,
    succeeded: results.length - failures.length,
    failed: failures.length,
    failures,
  };
}

export async function fetchInventoryData(
  params?: InventoryQueryParams
): Promise<InventoryRow[]> {
  const supabase = createBrowserClient();
  const { data: containerData, error: containerError } = await supabase
    .from("container")
    .select(
      "id, container_number, color, machine_type, yom, vents, flp, lbx, locking_bars, status, lifecycle_stage, current_transfer_id, container_size_code_id, container_type_code_id, container_condition_code_id, purchase_order_container(purchase_price, purchase_order_item_id)"
    )
    .eq("lifecycle_stage", "IN_TRANSIT");

  if (containerError) throw containerError;

  const containers = (containerData ?? []) as Array<{
    id: string;
    container_number: string | null;
    color: string | null;
    machine_type: string | null;
    yom: number | null;
    vents: number | null;
    flp: boolean | null;
    lbx: boolean | null;
    locking_bars: boolean | null;
    status: string | null;
    lifecycle_stage: string | null;
    current_transfer_id: string | null;
    container_size_code_id: string | null;
    container_type_code_id: string | null;
    container_condition_code_id: string | null;
    purchase_order_container:
      | Array<{
          purchase_price: number | null;
          purchase_order_item_id: string | null;
        }>
      | {
          purchase_price: number | null;
          purchase_order_item_id: string | null;
        }
      | null;
  }>;

  const transferOrderIds = Array.from(
    new Set(containers.map((row) => row.current_transfer_id).filter(Boolean))
  ) as string[];
  const containerIds = Array.from(new Set(containers.map((row) => row.id).filter(Boolean))) as string[];
  const sizeCodeIds = Array.from(
    new Set(containers.map((row) => row.container_size_code_id).filter(Boolean))
  ) as string[];
  const typeCodeIds = Array.from(
    new Set(containers.map((row) => row.container_type_code_id).filter(Boolean))
  ) as string[];
  const conditionCodeIds = Array.from(
    new Set(containers.map((row) => row.container_condition_code_id).filter(Boolean))
  ) as string[];

  const [
    transferOrderResult,
    transferItemResult,
    transferCostResult,
    transferRevenueResult,
    sizeCodeResult,
    typeCodeResult,
    conditionCodeResult,
  ] = await Promise.all([
    transferOrderIds.length > 0
      ? supabase
          .from("transfer_order")
          .select("id, dispatch_vendor_id, pol_city_id, pod_city_id, onhire_no, carrier")
          .in("id", transferOrderIds)
      : Promise.resolve({ data: [], error: null }),
    transferOrderIds.length > 0
      ? supabase
          .from("transfer_item")
          .select(
            "transfer_order_id, container_id, delivery_date, eta, gate_in_ref, return_depot_name, return_depot_address, return_depot_tel, arrange_date, customer_order_num, remark1, remark2"
          )
          .in("transfer_order_id", transferOrderIds)
      : Promise.resolve({ data: [], error: null }),
    containerIds.length > 0
      ? supabase
          .from("business_cost")
          .select("container_id, amount")
          .eq("business_type", "TRANSFER")
          .in("container_id", containerIds)
      : Promise.resolve({ data: [], error: null }),
    containerIds.length > 0
      ? supabase
          .from("business_revenue")
          .select("container_id, amount")
          .eq("business_type", "TRANSFER")
          .in("container_id", containerIds)
      : Promise.resolve({ data: [], error: null }),
    sizeCodeIds.length > 0
      ? supabase.from("container_size_codes").select("id, size_code").in("id", sizeCodeIds)
      : Promise.resolve({ data: [], error: null }),
    typeCodeIds.length > 0
      ? supabase.from("container_type_codes").select("id, type_code").in("id", typeCodeIds)
      : Promise.resolve({ data: [], error: null }),
    conditionCodeIds.length > 0
      ? supabase
          .from("container_condition_codes")
          .select("id, condition_code")
          .in("id", conditionCodeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (transferOrderResult.error) throw transferOrderResult.error;
  if (transferItemResult.error) throw transferItemResult.error;
  if (transferCostResult.error) throw transferCostResult.error;
  if (transferRevenueResult.error) throw transferRevenueResult.error;
  if (sizeCodeResult.error) throw sizeCodeResult.error;
  if (typeCodeResult.error) throw typeCodeResult.error;
  if (conditionCodeResult.error) throw conditionCodeResult.error;

  const transferOrders = (transferOrderResult.data ?? []) as Array<{
    id: string;
    dispatch_vendor_id: string | null;
    pol_city_id: string | null;
    pod_city_id: string | null;
    onhire_no: string | null;
    carrier: string | null;
  }>;
  const purchaseOrderItemIds = Array.from(
    new Set(
      containers
        .flatMap((row) =>
          (Array.isArray(row.purchase_order_container)
            ? row.purchase_order_container
            : row.purchase_order_container
              ? [row.purchase_order_container]
              : []
          ).map((purchaseOrderContainer) => purchaseOrderContainer.purchase_order_item_id)
        )
        .filter(Boolean)
    )
  ) as string[];

  const cityIds = Array.from(
    new Set(
      transferOrders.flatMap((row) => [row.pol_city_id, row.pod_city_id]).filter(Boolean)
    )
  ) as string[];
  const lesseeIds = Array.from(
    new Set(transferOrders.map((row) => row.dispatch_vendor_id).filter(Boolean))
  ) as string[];

  const [cityResult, lesseeResult, purchaseOrderItemResult] = await Promise.all([
    cityIds.length > 0
      ? supabase.from("cities").select("id, city_code").in("id", cityIds)
      : Promise.resolve({ data: [], error: null }),
    lesseeIds.length > 0
      ? supabase
          .from("lessees")
          .select("id, company_name, legal_company_name, lessee_code")
          .in("id", lesseeIds)
      : Promise.resolve({ data: [], error: null }),
    purchaseOrderItemIds.length > 0
      ? supabase.from("purchase_order_item").select("id, unit_price").in("id", purchaseOrderItemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (cityResult.error) throw cityResult.error;
  if (lesseeResult.error) throw lesseeResult.error;
  if (purchaseOrderItemResult.error) throw purchaseOrderItemResult.error;

  const rows = mapInTransitInventoryRows({
    containers,
    transferOrders,
    transferItems: (transferItemResult.data ?? []) as Array<{
      transfer_order_id: string | null;
      container_id: string | null;
      delivery_date: string | null;
      eta: string | null;
      gate_in_ref: string | null;
      return_depot_name: string | null;
      return_depot_address: string | null;
      return_depot_tel: string | null;
      arrange_date: string | null;
      customer_order_num: string | null;
      remark1: string | null;
      remark2: string | null;
    }>,
    transferCosts: (transferCostResult.data ?? []) as Array<{
      container_id: string | null;
      amount: number | null;
    }>,
    transferRevenues: (transferRevenueResult.data ?? []) as Array<{
      container_id: string | null;
      amount: number | null;
    }>,
    purchaseOrderItems: (purchaseOrderItemResult.data ?? []) as Array<{
      id: string;
      unit_price: number | null;
    }>,
    sizeCodes: (sizeCodeResult.data ?? []) as Array<{ id: string; size_code: string | null }>,
    typeCodes: (typeCodeResult.data ?? []) as Array<{ id: string; type_code: string | null }>,
    conditionCodes: (conditionCodeResult.data ?? []) as Array<{
      id: string;
      condition_code: string | null;
    }>,
    cities: (cityResult.data ?? []) as Array<{ id: string; city_code: string | null }>,
    lessees: (lesseeResult.data ?? []) as Array<{
      id: string;
      company_name: string | null;
      legal_company_name: string | null;
      lessee_code: string | null;
    }>,
  });

  return filterInTransitInventoryRows(rows, params);
}
