import { escapeIlikePatternFragment } from "@/lib/customers/search-or";

/** Columns allowed in advanced `key:value` syntax (must match DB column names). */
export const CUSTOMER_SEARCH_KEYS = [
  "company_name",
  "customer_custom_id",
  "status",
  "assigned_sales",
  "contact_phone",
  "customer_grade",
] as const;

export type CustomerSearchColumn = (typeof CUSTOMER_SEARCH_KEYS)[number];

const KEY_SET = new Set<string>(CUSTOMER_SEARCH_KEYS);

/** Short aliases for advanced syntax (UI guide + faster typing). */
const KEY_ALIASES: Record<string, CustomerSearchColumn> = {
  company: "company_name",
  customer_id: "customer_custom_id",
  customerid: "customer_custom_id",
  id: "customer_custom_id",
  sales: "assigned_sales",
  phone: "contact_phone",
  grade: "customer_grade",
};

export type ParsedCustomerSearch =
  | { mode: "simple"; companyPattern: string }
  | { mode: "advanced"; filters: Partial<Record<CustomerSearchColumn, string>> };

function normalizeSearchKey(raw: string): CustomerSearchColumn | null {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (!k) return null;
  if (KEY_ALIASES[k]) return KEY_ALIASES[k];
  if (!KEY_SET.has(k)) return null;
  return k as CustomerSearchColumn;
}

/**
 * Parse the dashboard search box.
 *
 * - **Simple:** no `:` in the trimmed input → fuzzy match on `company_name` only.
 * - **Advanced:** `key:value; key:value` → AND of `ilike` on each known key. Unknown keys
 *   and empty values are skipped. If nothing valid remains, falls back to simple mode
 *   on the full string.
 */
export function parseCustomerSearch(raw: string): ParsedCustomerSearch {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { mode: "simple", companyPattern: "" };
  }

  if (!trimmed.includes(":")) {
    return { mode: "simple", companyPattern: trimmed };
  }

  const filters: Partial<Record<CustomerSearchColumn, string>> = {};
  const segments = trimmed.split(";");

  for (const segment of segments) {
    const part = segment.trim();
    if (!part) continue;
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const keyRaw = part.slice(0, colon);
    const value = part.slice(colon + 1).trim();
    if (!value) continue;
    const key = normalizeSearchKey(keyRaw);
    if (!key) continue;
    filters[key] = value;
  }

  if (Object.keys(filters).length === 0) {
    return { mode: "simple", companyPattern: trimmed };
  }

  return { mode: "advanced", filters };
}

/** Wrap user fragment for `ilike` `%...%` with LIKE metacharacters escaped. */
export function ilikeContainsPattern(fragment: string): string {
  const escaped = escapeIlikePatternFragment(fragment.trim());
  return `%${escaped}%`;
}
