export type BasicInfoSectionSlug =
  | "companies"
  | "regions"
  | "cities"
  | "depots"
  | "cost-codes"
  | "revenue-codes"
  | "condition-codes"
  | "size-codes"
  | "type-codes"
  | "operation-prices"
  | "financial-exchange-rates"
  | "container-number-rules";

export type BasicInfoSectionMeta = {
  slug: BasicInfoSectionSlug;
  title: string;
  description: string;
  tableName: string;
  fields: string[];
};

export type BasicInfoSectionOverview = BasicInfoSectionMeta & {
  totalCount: number | null;
  available: boolean;
  errorMessage?: string;
};

export const BASIC_INFO_SECTIONS: readonly BasicInfoSectionMeta[] = [
  {
    slug: "companies",
    title: "Company Information Management",
    description:
      "Maintain company master data including names, addresses, contact details, and location codes.",
    tableName: "company_profiles",
    fields: [
      "company_name_cn",
      "company_name_en",
      "address_cn",
      "address_en",
      "phone",
      "email",
      "location_code",
      "status",
    ],
  },
  {
    slug: "regions",
    title: "Region Codes",
    description:
      "Maintain region master data used consistently across cities and depots.",
    tableName: "region_codes",
    fields: ["region_code", "region_name", "description", "status"],
  },
  {
    slug: "cities",
    title: "City Codes",
    description:
      "Maintain city and port master data with country and region mapping.",
    tableName: "cities",
    fields: ["city_code", "city_name", "country", "region_id", "remark"],
  },
  {
    slug: "depots",
    title: "Depot Codes",
    description:
      "Maintain depot master profiles across city, region, type, and status.",
    tableName: "depots",
    fields: [
      "city_id",
      "depot_code",
      "depot_name",
      "depot_name_cn",
      "depot_type",
      "depot_address",
      "depot_address_cn",
      "contact_person",
      "contact_email",
      "depot_tel",
      "status",
    ],
  },
  {
    slug: "cost-codes",
    title: "Expense Codes",
    description:
      "Maintain expense code dictionaries for operating and transactional charges.",
    tableName: "cost_codes",
    fields: ["cost_code", "cost_name", "description", "status"],
  },
  {
    slug: "revenue-codes",
    title: "Revenue Codes",
    description:
      "Maintain revenue code dictionaries for billing and income classification.",
    tableName: "revenue_codes",
    fields: ["revenue_code", "revenue_name", "description", "status"],
  },
  {
    slug: "condition-codes",
    title: "Condition Codes",
    description:
      "Maintain container condition codes used across operational pricing and inventory logic.",
    tableName: "container_condition_codes",
    fields: ["condition_code", "condition_name", "description", "status"],
  },
  {
    slug: "size-codes",
    title: "Size Codes",
    description:
      "Maintain standard container size codes and their display names.",
    tableName: "container_size_codes",
    fields: ["size_code", "size_name", "status"],
  },
  {
    slug: "type-codes",
    title: "Type Codes",
    description:
      "Maintain container type codes, descriptions, and remarks.",
    tableName: "container_type_codes",
    fields: ["type_code", "remark", "status"],
  },
  {
    slug: "operation-prices",
    title: "Operation Price Configs",
    description:
      "Maintain additional operating price configurations by size and condition.",
    tableName: "operation_price_configs",
    fields: [
      "container_size_code_id",
      "container_condition_code_id",
      "addon_price",
      "currency",
      "effective_from",
      "effective_to",
      "status",
    ],
  },
  {
    slug: "financial-exchange-rates",
    title: "Financial Exchange Rates",
    description:
      "Maintain effective-from financial exchange rates by currency pair for dispatch cost and revenue conversions.",
    tableName: "financial_exchange_rate",
    fields: [
      "rate_date",
      "from_currency",
      "to_currency",
      "exchange_rate",
      "is_active",
      "remark",
    ],
  },
  {
    slug: "container-number-rules",
    title: "Container Number Rules",
    description:
      "Maintain prefix and serial rules used to generate container numbers automatically.",
    tableName: "container_number_rules",
    fields: [
      "container_size_code_id",
      "prefix",
      "serial_length",
      "start_serial",
      "end_serial",
      "current_serial",
      "status",
    ],
  },
] as const;

export function getBasicInfoSection(
  slug: string
): BasicInfoSectionMeta | undefined {
  return BASIC_INFO_SECTIONS.find((section) => section.slug === slug);
}
