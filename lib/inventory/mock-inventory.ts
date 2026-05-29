import type {
  InventoryDateFilters,
  InventoryRow,
} from "@/types/inventory";

const SIZES = ["20DV", "40DV", "40HC", "45HC"] as const;
const TYPES = ["Dry", "Reefer", "Open Top"] as const;
const CONDITIONS = ["CW", "IICL", "ASIS", "NEW"] as const;
const COLORS = ["RAL5010", "RAL7035", "Beige", "Green"] as const;
const PODS = ["CNSHA", "VNSGN", "HKHKG", "USLAX", "DEHAM"] as const;
const POLS = ["CNTAO", "CNNGB", "VNHPH", "SGSIN", "USNYC"] as const;
const CARRIERS = ["MSC", "MAERSK", "CMA", "ONE", "HAPAG"] as const;
const TRANSIT_COMPANIES = [
  "中联拖车",
  "港捷物流",
  "环球联运",
  "速达运输",
  "新干线物流",
] as const;
const STATUSES = [
  "Available",
  "Reserved",
  "In-transit",
  "At depot",
  "Sold",
] as const;
const REPS = ["Alex Chen", "Jordan Lee", "Sam Rivera", "Taylor Kim"] as const;
const SALES_REGIONS = [
  "亚太",
  "北美",
  "欧洲",
  "中东非",
  "拉美",
] as const;
const CUSTOMERS = [
  "Globex Trading",
  "Coastal Logistics",
  "Harbor Freight Co",
  "Pacific Box LLC",
  "—",
] as const;
const REMARKS = [
  "Urgent release before weekend",
  "Awaiting gate-in confirmation",
  "Handle with reefer check",
  "Customer requested photo proof",
  "Stack at bay 4 after arrival",
] as const;
const REMARKS2 = [
  "Release with photo ID check",
  "Driver must call before arrival",
  "Keep chassis with unit",
  "Night shift redelivery only",
  "Coordinate with warehouse slot",
] as const;

const UNIT_PREFIXES = ["MSCU", "TEMU", "GESU", "CXDU", "FFAU", "TCLU"] as const;

function pad7(n: number): string {
  return String(n).padStart(7, "0");
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function inDateRange(
  value: string,
  from: string,
  to: string,
  treatEmptyAsNoMatchWhenBounded: boolean
): boolean {
  const f = from.trim();
  const t = to.trim();
  const v = value.trim();
  if (!f && !t) return true;
  if (!v) return treatEmptyAsNoMatchWhenBounded ? false : true;
  const d = v.slice(0, 10);
  if (f && d < f) return false;
  if (t && d > t) return false;
  return true;
}

/** Substring match on row fields (keys must exist on InventoryRow). */
export function rowMatchesFilters(
  row: InventoryRow,
  f: Record<string, string>
): boolean {
  const entries = Object.entries(f) as [keyof InventoryRow | string, string][];
  for (const [key, val] of entries) {
    const t = val.trim();
    if (!t) continue;
    const v = String((row as Record<string, unknown>)[key] ?? "").toLowerCase();
    if (!v.includes(t.toLowerCase())) return false;
  }
  return true;
}

export function filterInventoryRows(
  rows: InventoryRow[],
  text: Record<string, string>,
  dates: InventoryDateFilters
): InventoryRow[] {
  const boundedSales = Boolean(
    dates.salesDateFrom.trim() || dates.salesDateTo.trim()
  );
  return rows.filter((row) => {
    if (!rowMatchesFilters(row, text)) return false;
    if (!inDateRange(row.eta, dates.etaFrom, dates.etaTo, false)) return false;
    if (
      !inDateRange(
        row.salesDate,
        dates.salesDateFrom,
        dates.salesDateTo,
        boundedSales
      )
    ) {
      return false;
    }
    if (
      !inDateRange(
        row.onhire_date,
        dates.onHireFrom,
        dates.onHireTo,
        false
      )
    ) {
      return false;
    }
    return true;
  });
}

/** 180 rows for pagination / export demos */
export function buildMockInventoryRows(): InventoryRow[] {
  const today = new Date();
  const oldEta = new Date(today);
  oldEta.setDate(oldEta.getDate() - 20);
  const recentEta = new Date(today);
  recentEta.setDate(recentEta.getDate() - 3);

  return Array.from({ length: 180 }, (_, i) => {
    const prefix = UNIT_PREFIXES[i % UNIT_PREFIXES.length];
    const unit = `${prefix}${pad7(1000000 + i * 137)}`;
    const inTransitAlert = i % 7 === 0;
    const inTransitOk = i % 11 === 3;

    const status = inTransitAlert
      ? "In-transit"
      : inTransitOk
        ? "In-transit"
        : STATUSES[i % STATUSES.length];

    const etaDate =
      status === "In-transit"
        ? inTransitAlert
          ? isoDate(oldEta)
          : isoDate(recentEta)
        : isoDate(new Date(2025, (i % 12) + 1, 10));

    const size = SIZES[i % SIZES.length];
    const type = TYPES[i % TYPES.length];
    const hire = new Date(2024, i % 12, (i % 28) + 1);
    const depotName = `Depot ${(i % 4) + 1}`;
    const depotAddr = `${100 + i} Container Way, Zone ${(i % 3) + 1}`;
    const depotTel = `+1-555-${String(1000 + i).slice(-4)}`;
    const pol = POLS[i % POLS.length];
    const pod = PODS[i % PODS.length];
    const flp = i % 3 === 0 ? "FLP" : "-";
    const lbx = i % 3 === 0 || i % 3 === 1 ? "LBX" : "-";
    const eod = "EOD";

    return {
      id: `inv-${i + 1}`,
      unit,
      size,
      type,
      condition: CONDITIONS[i % CONDITIONS.length],
      color: COLORS[i % COLORS.length],
      purchase_date: isoDate(new Date(2024, (i + 2) % 12, ((i + 6) % 28) + 1)),
      planned_depot_name: depotName,
      actual_depot_id: `depot-${(i % 4) + 1}`,
      pol_id: `pol-${pol}`,
      pod_id: `pod-${pod}`,
      actual_depot: {
        depot_name: depotName,
        depot_tel: depotTel,
        depot_address: depotAddr,
      },
      pol_city: {
        city_code: pol,
        city_name: pol,
      },
      pod_city: {
        city_code: pod,
        city_name: pod,
      },
      pod,
      pol,
      carrier: CARRIERS[i % CARRIERS.length],
      transitCompany: TRANSIT_COMPANIES[i % TRANSIT_COMPANIES.length],
      onhire_no: `OH-${9000 + i}`,
      onhire_date: isoDate(hire),
      sales_region: SALES_REGIONS[i % SALES_REGIONS.length],
      remark1: REMARKS[i % REMARKS.length],
      remark2: REMARKS2[i % REMARKS2.length],
      onhireNum: `OH-${9000 + i}`,
      status,
      customerOrderNum: i % 4 === 0 ? "" : `SO-${202400 + i}`,
      salesRep: REPS[i % REPS.length],
      salesRegion: SALES_REGIONS[i % SALES_REGIONS.length],
      specs: `${size} ${type} ${CONDITIONS[i % CONDITIONS.length]}`,
      yom: String(2014 + (i % 10)),
      vents: String(i % 5),
      flp,
      lbx,
      eod,
      flpLbEod: `${flp}/${lbx}/${eod}`,
      engine: type === "Reefer" ? "Carrier / TK" : "—",
      eta: etaDate,
      salesDate: i % 5 === 0 ? "" : `2025-${String((i % 9) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
      onHireDate: isoDate(hire),
      customer: CUSTOMERS[i % CUSTOMERS.length],
      price: 1800 + i * 175 + (i % 3) * 50,
      depotName,
      depotAddr,
      depotTel,
      gateInRef: `GI-${2025}${String(i).padStart(4, "0")}`,
      cost: 1200 + i * 120,
    };
  });
}
