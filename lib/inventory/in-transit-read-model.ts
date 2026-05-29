import type { InventoryDateFilters, InventoryRow } from "@/types/inventory";

type ContainerSnapshotRow = {
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
};

type TransferOrderSnapshotRow = {
  id: string;
  dispatch_vendor_id: string | null;
  pol_city_id: string | null;
  pod_city_id: string | null;
  onhire_no: string | null;
  carrier: string | null;
};

type TransferItemSnapshotRow = {
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
  remark2: string | null;
};

type SimpleCodeRow = {
  id: string;
  size_code?: string | null;
  type_code?: string | null;
  condition_code?: string | null;
};

type CityRow = {
  id: string;
  city_code: string | null;
};

type LesseeRow = {
  id: string;
  company_name: string | null;
  legal_company_name: string | null;
  lessee_code: string | null;
};

export type InTransitReadModelInput = {
  containers: ContainerSnapshotRow[];
  transferOrders: TransferOrderSnapshotRow[];
  transferItems: TransferItemSnapshotRow[];
  sizeCodes: SimpleCodeRow[];
  typeCodes: SimpleCodeRow[];
  conditionCodes: SimpleCodeRow[];
  cities: CityRow[];
  lessees: LesseeRow[];
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDateForGrid(value: string | null | undefined): string {
  const normalized = normalizeText(value);
  if (!normalized) return "-";

  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return "-";

  const year = parsed.getUTCFullYear();
  const month = `${parsed.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLookupMap<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row] as const));
}

type TransferItemSnapshot = {
  deliveryDate: string;
  eta: string;
  gateInRef: string;
  returnDepotName: string;
  returnDepotAddress: string;
  returnDepotTel: string;
  arrangeDate: string;
  customerOrderNum: string;
  remark2: string;
};

function buildTransferItemSnapshotMap(rows: TransferItemSnapshotRow[]) {
  const map = new Map<string, TransferItemSnapshot>();

  for (const row of rows) {
    const transferOrderId = normalizeText(row.transfer_order_id);
    const containerId = normalizeText(row.container_id);
    if (!transferOrderId || !containerId) continue;

    const key = `${transferOrderId}::${containerId}`;
    const snapshot: TransferItemSnapshot = {
      deliveryDate: formatDateForGrid(row.delivery_date),
      eta: formatDateForGrid(row.eta),
      gateInRef: normalizeText(row.gate_in_ref),
      returnDepotName: normalizeText(row.return_depot_name),
      returnDepotAddress: normalizeText(row.return_depot_address),
      returnDepotTel: normalizeText(row.return_depot_tel),
      arrangeDate: formatDateForGrid(row.arrange_date),
      customerOrderNum: normalizeText(row.customer_order_num),
      remark2: normalizeText(row.remark2),
    };
    const current = map.get(key);
    if (!current || (current.deliveryDate === "-" && snapshot.deliveryDate !== "-")) {
      map.set(key, snapshot);
    }
  }

  return map;
}

function formatTransitCompany(lessee: LesseeRow | undefined): string {
  if (!lessee) return "-";
  return (
    normalizeText(lessee.company_name) ||
    normalizeText(lessee.legal_company_name) ||
    normalizeText(lessee.lessee_code) ||
    "-"
  );
}

function matchesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.trim().toLowerCase());
}

function dateWithinRange(value: string, from: string, to: string): boolean {
  if (value === "-") return !from && !to;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
}

export function mapInTransitInventoryRows(input: InTransitReadModelInput): InventoryRow[] {
  const transferOrderById = buildLookupMap(input.transferOrders);
  const sizeById = buildLookupMap(input.sizeCodes);
  const typeById = buildLookupMap(input.typeCodes);
  const conditionById = buildLookupMap(input.conditionCodes);
  const cityById = buildLookupMap(input.cities);
  const lesseeById = buildLookupMap(input.lessees);
  const transferItemSnapshotByKey = buildTransferItemSnapshotMap(input.transferItems);

  return input.containers.reduce<InventoryRow[]>((rows, container) => {
    if (normalizeText(container.lifecycle_stage).toUpperCase() !== "IN_TRANSIT") {
      return rows;
    }

      const transferOrderId = normalizeText(container.current_transfer_id);
      const transferOrder = transferOrderById.get(transferOrderId);
      if (!transferOrderId || !transferOrder) return rows;

      const sizeCode =
        normalizeText(sizeById.get(normalizeText(container.container_size_code_id))?.size_code) || "-";
      const typeCode =
        normalizeText(typeById.get(normalizeText(container.container_type_code_id))?.type_code) || "-";
      const conditionCode =
        normalizeText(
          conditionById.get(normalizeText(container.container_condition_code_id))?.condition_code
        ) || "-";

      const specs = `${sizeCode === "-" ? "" : sizeCode}${typeCode === "-" ? "" : typeCode}` || "-";
      const transferItemSnapshot =
        transferItemSnapshotByKey.get(`${transferOrderId}::${container.id}`) ?? null;
      const onhireDate = transferItemSnapshot?.deliveryDate ?? "-";

      const flp = container.flp ? "FLP" : "-";
      const lbx = container.lbx ? "LBX" : "-";
      const eod = container.locking_bars ? "EOD" : "-";

      rows.push({
        id: container.id,
        unit: normalizeText(container.container_number) || "-",
        size: sizeCode === "-" ? "" : sizeCode,
        type: typeCode === "-" ? "" : typeCode,
        specs,
        condition: conditionCode,
        color: normalizeText(container.color) || "-",
        engine: normalizeText(container.machine_type) || "-",
        yom: container.yom == null ? "-" : String(container.yom),
        vents: container.vents == null ? "-" : String(container.vents),
        flp,
        lbx,
        eod,
        flpLbEod: `${flp}/${lbx}/${eod}`,
        status: normalizeText(container.status) || "-",
        pol:
          normalizeText(cityById.get(normalizeText(transferOrder.pol_city_id))?.city_code) || "-",
        pod:
          normalizeText(cityById.get(normalizeText(transferOrder.pod_city_id))?.city_code) || "-",
        transitCompany: formatTransitCompany(
          lesseeById.get(normalizeText(transferOrder.dispatch_vendor_id))
        ),
        onhire_no: normalizeText(transferOrder.onhire_no) || "-",
        onhire_date: onhireDate,
        carrier: normalizeText(transferOrder.carrier) || "-",
        eta: transferItemSnapshot?.eta ?? "-",
        onhireNum: normalizeText(transferOrder.onhire_no) || "-",
        onHireDate: onhireDate,
        sales_region: "",
        salesRegion: "",
        salesRep: "",
        salesDate: transferItemSnapshot?.arrangeDate ?? "-",
        customer: "",
        customerOrderNum: transferItemSnapshot?.customerOrderNum ?? "",
        price: 0,
        depotName: transferItemSnapshot?.returnDepotName ?? "",
        depotAddr: transferItemSnapshot?.returnDepotAddress ?? "",
        depotTel: transferItemSnapshot?.returnDepotTel ?? "",
        gateInRef: transferItemSnapshot?.gateInRef ?? "",
        cost: 0,
        remark1: "",
        remark2: transferItemSnapshot?.remark2 ?? "",
        purchase_date: "",
        planned_depot_name: "",
        actual_depot_id: null,
        pol_id: normalizeText(transferOrder.pol_city_id) || null,
        pod_id: normalizeText(transferOrder.pod_city_id) || null,
        actual_depot: null,
        pol_city: null,
        pod_city: null,
      } satisfies InventoryRow);

      return rows;
    }, []);
}

export function filterInTransitInventoryRows(
  rows: InventoryRow[],
  params?: {
    pasteUnits: string[];
    textFilters: Record<string, string>;
    dateFilters: InventoryDateFilters;
  }
) {
  if (!params) return rows;

  const units = new Set(params.pasteUnits.map((unit) => unit.trim().toUpperCase()).filter(Boolean));
  const textFilters = params.textFilters;
  const dates = params.dateFilters;

  return rows.filter((row) => {
    if (units.size > 0 && !units.has(row.unit.toUpperCase())) return false;
    if (textFilters.specs && !matchesText(row.specs, textFilters.specs)) return false;
    if (textFilters.condition && !matchesText(row.condition, textFilters.condition)) return false;
    if (textFilters.color && !matchesText(row.color, textFilters.color)) return false;
    if (textFilters.engine && !matchesText(row.engine, textFilters.engine)) return false;
    if (textFilters.status && !matchesText(row.status, textFilters.status)) return false;
    if (textFilters.pol && !matchesText(row.pol, textFilters.pol)) return false;
    if (textFilters.pod && !matchesText(row.pod, textFilters.pod)) return false;
    if (textFilters.carrier && !matchesText(row.carrier, textFilters.carrier)) return false;
    if (
      textFilters.transitCompany &&
      !matchesText(row.transitCompany, textFilters.transitCompany)
    ) {
      return false;
    }
    if (textFilters.onhire_no && !matchesText(row.onhire_no, textFilters.onhire_no)) return false;
    if (!dateWithinRange(row.eta, dates.etaFrom, dates.etaTo)) return false;
    if (!dateWithinRange(row.salesDate, dates.salesDateFrom, dates.salesDateTo)) return false;
    if (!dateWithinRange(row.onhire_date, dates.onHireFrom, dates.onHireTo)) return false;
    return true;
  });
}
