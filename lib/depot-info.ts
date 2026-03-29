import type { DepotRow } from "@/types/customer";

function isDepotRowSemanticallyEmpty(row: DepotRow): boolean {
  return !Object.values(row).some((v) => String(v).trim() !== "");
}

/** Drops depot rows where every field is blank before JSONB serialization. */
export function filterNonemptyDepotRows(depots: DepotRow[]): DepotRow[] {
  return depots.filter((d) => !isDepotRowSemanticallyEmpty(d));
}

function emptyDepotRow(): DepotRow {
  return {
    city_code: "",
    city_name: "",
    contact_person: "",
    email: "",
    phone: "",
    depot_name: "",
    depot_address: "",
    depot_tel: "",
  };
}

/** Shape stored in `depot_info` JSONB */
export function depotsToDepotInfo(depots: DepotRow[]): Record<string, unknown> {
  return {
    depots: depots.map((d) => ({
      city_code: d.city_code.trim(),
      city_name: d.city_name.trim(),
      contact_person: d.contact_person.trim(),
      email: d.email.trim(),
      phone: d.phone.trim(),
      depot_name: d.depot_name.trim(),
      depot_address: d.depot_address.trim(),
      depot_tel: d.depot_tel.trim(),
    })),
  };
}

/**
 * Read depots from JSONB (`{ depots: [...] }`).
 * Migrates legacy `{ region, city, depot_name }` → `city_code` / `city_name` / `depot_name`.
 */
export function depotInfoToDepots(info: unknown): DepotRow[] {
  if (!info || typeof info !== "object") return [];
  const o = info as Record<string, unknown>;
  if (!Array.isArray(o.depots)) return [];
  return o.depots.map((r) => {
    const row = r as Record<string, unknown>;
    const base = emptyDepotRow();
    const legacyRegion = row.region != null ? String(row.region) : "";
    const legacyCity = row.city != null ? String(row.city) : "";

    return {
      ...base,
      city_code: String(row.city_code ?? legacyRegion),
      city_name: String(row.city_name ?? legacyCity),
      contact_person: String(row.contact_person ?? ""),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      depot_name: String(row.depot_name ?? ""),
      depot_address: String(row.depot_address ?? ""),
      depot_tel: String(row.depot_tel ?? ""),
    };
  });
}
