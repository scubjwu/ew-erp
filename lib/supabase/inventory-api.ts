import { createBrowserClient } from "@/lib/supabase/client";
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

  // Explicitly use DB constraint names for joins.
  let selectBase = `
    *,
    sales_rep:users!rel_inventory_sales(full_name),
    attached_customer:customers!rel_inventory_customer(company_name),
    actual_depot:depots(depot_name, depot_tel, depot_address),
    pol_city:cities!pol_id(city_name, city_code),
    pod_city:cities!pod_id(city_name, city_code)
  `;
  
  if (params) {
    const tf = params.textFilters;
    const hasSalesRep = !!tf.salesRep?.trim();
    const hasCustomer = !!tf.customer?.trim();

    // Use inner joins only when corresponding foreign filters are present.
    if (hasSalesRep && hasCustomer) {
      selectBase = `
        *,
        sales_rep:users!rel_inventory_sales!inner(full_name),
        attached_customer:customers!rel_inventory_customer!inner(company_name),
        actual_depot:depots(depot_name, depot_tel, depot_address),
        pol_city:cities!pol_id(city_name, city_code),
        pod_city:cities!pod_id(city_name, city_code)
      `;
    } else if (hasSalesRep) {
      selectBase = `
        *,
        sales_rep:users!rel_inventory_sales!inner(full_name),
        attached_customer:customers!rel_inventory_customer(company_name),
        actual_depot:depots(depot_name, depot_tel, depot_address),
        pol_city:cities!pol_id(city_name, city_code),
        pod_city:cities!pod_id(city_name, city_code)
      `;
    } else if (hasCustomer) {
      selectBase = `
        *,
        sales_rep:users!rel_inventory_sales(full_name),
        attached_customer:customers!rel_inventory_customer!inner(company_name),
        actual_depot:depots(depot_name, depot_tel, depot_address),
        pol_city:cities!pol_id(city_name, city_code),
        pod_city:cities!pod_id(city_name, city_code)
      `;
    }
  }

  // 后面的 query 构建和 map 逻辑保持 V31.4 的版本不变
  let query: any = supabase
    .from("inventory")
    .select(selectBase)
    .eq("lifecycle_stage", "OW Lease");

  if (params) {
    const { pasteUnits, textFilters: tf, dateFilters: df } = params;

    if (pasteUnits.length > 0) {
      query = query.in("unit_number", pasteUnits);
    }

    if (tf.specs) {
      const specsTrimmed = tf.specs.trim();
      // Regex to extract starting numbers as Size, and the rest as Type
      const match = specsTrimmed.match(/^(\d*)(.*)$/);
      if (match) {
        const sizePart = match[1].trim();
        const typePart = match[2].trim();

        if (sizePart) {
          query = query.ilike("container_size", `%${sizePart}%`);
        }
        if (typePart) {
          query = query.ilike("container_type", `%${typePart}%`);
        }
      }
    }
    if (tf.condition) query = query.ilike("condition", `%${tf.condition.trim()}%`);
    if (tf.status) query = query.ilike("status", `%${tf.status.trim()}%`);

    if (tf.color) query = query.ilike("color", `%${tf.color.trim()}%`);
    if (tf.engine) query = query.ilike("container_specs->>engine", `%${tf.engine.trim()}%`);
    if (tf.pol) query = query.ilike("pol", `%${tf.pol.trim()}%`);
    if (tf.pod) query = query.ilike("pod", `%${tf.pod.trim()}%`);
    if (tf.carrier) query = query.ilike("logistics_data->>carrier", `%${tf.carrier.trim()}%`);
    if (tf.transitCompany) query = query.ilike("logistics_data->>lessee", `%${tf.transitCompany.trim()}%`);
    if (tf.onhire_no) query = query.ilike("logistics_data->>onhire_no", `%${tf.onhire_no.trim()}%`);
    if (tf.customerOrderNum) query = query.ilike("financial_data->>customer_order_no", `%${tf.customerOrderNum.trim()}%`);

    // 使用我们定义的别名进行过滤
    if (tf.salesRep) query = query.ilike("sales_rep.full_name", `%${tf.salesRep.trim()}%`);
    if (tf.customer) query = query.ilike("attached_customer.company_name", `%${tf.customer.trim()}%`);

    if (df.etaFrom) query = query.gte("eta", df.etaFrom);
    if (df.etaTo) query = query.lte("eta", df.etaTo);
    if (df.salesDateFrom) query = query.gte("logistics_data->>arrange_date", df.salesDateFrom);
    if (df.salesDateTo) query = query.lte("logistics_data->>arrange_date", df.salesDateTo);
    if (df.onHireFrom) query = query.gte("logistics_data->>onhire_date", df.onHireFrom);
    if (df.onHireTo) query = query.lte("logistics_data->>onhire_date", df.onHireTo);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Supabase Query Error:", error); // 打印详细错误到控制台
    throw error;
  }

  return ((data ?? []) as InventoryDbRow[]).map((row) => {
    const flp = row.container_specs?.flp || "-";
    const lbx = row.container_specs?.lbx || "-";
    const is3Bars = row.container_specs?.locking_bars === "3 LOCKING BARS";
    const eod = is3Bars ? "EOD" : "-";
    const flpLbEod = `${flp}/${lbx}/${eod}`;

    const size = row.container_size || "";
    const type = row.container_type || "";
    const specs = `${size}${type}`;

    return {
      id: row.id,
      unit: row.unit_number || "",
      size,
      type,
      specs,
      condition: row.condition || "",
      color: row.color || row.container_specs?.color_code || "",
      yom: String(row.container_specs?.year || ""),
      vents: row.container_specs?.VENT || "",
      engine: row.container_specs?.engine || "",
      pod: row.pod_city?.city_code || row.logistics_data?.pod || "",
      eta: row.eta || row.logistics_data?.eta || "",
      carrier: row.logistics_data?.carrier || "",
      status: row.status || "",
      salesDate: row.logistics_data?.arrange_date || "",
      // 读取别名对应的属性
      salesRep: row.sales_rep?.full_name || "",
      customer: row.attached_customer?.company_name || "",
      sales_region: row.financial_data?.sales_region || "",
      price: Number(row.target_price || 0),
      customerOrderNum: row.financial_data?.customer_order_no || "",
      depotName:
        row.actual_depot?.depot_name ||
        row.planned_depot_name ||
        row.logistics_data?.planned_depot_Name ||
        "",
      depotAddr: row.actual_depot?.depot_address || row.logistics_data?.planned_depot_Addr || "",
      depotTel: row.actual_depot?.depot_tel || row.logistics_data?.planned_depot_Tel || "",
      gateInRef: row.logistics_data?.gate_in_ref || "",
      transitCompany: row.logistics_data?.lessee || "",
      pol: row.pol_city?.city_code || row.logistics_data?.pol || "",
      onhire_no: row.logistics_data?.onhire_no || "",
      onhire_date: row.logistics_data?.onhire_date || "",
      cost: Number(row.cost_price || 0),
      remark2: row.remarks?.remark2 || "",
      remark1: row.remarks?.remark1 || "",
      purchase_date: row.purchase_date || "",
      planned_depot_name: row.planned_depot_name || "",
      actual_depot_id: row.actual_depot_id,
      pol_id: row.pol_id,
      pod_id: row.pod_id,
      actual_depot: row.actual_depot
        ? {
            depot_name: row.actual_depot.depot_name || "",
            depot_tel: row.actual_depot.depot_tel || "",
            depot_address: row.actual_depot.depot_address || "",
          }
        : null,
      pol_city: row.pol_city
        ? {
            city_name: row.pol_city.city_name || "",
            city_code: row.pol_city.city_code || "",
          }
        : null,
      pod_city: row.pod_city
        ? {
            city_name: row.pod_city.city_name || "",
            city_code: row.pod_city.city_code || "",
          }
        : null,
      flpLbEod,
      onhireNum: row.logistics_data?.onhire_no || "",
      salesRegion: row.financial_data?.sales_region || "",
      onHireDate: row.logistics_data?.onhire_date || "",
    };
  });
}
