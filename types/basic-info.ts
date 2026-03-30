export type BasicInfoSectionSlug =
  | "companies"
  | "regions"
  | "cities"
  | "depots"
  | "cost-codes"
  | "revenue-codes"
  | "condition-codes"
  | "type-codes"
  | "operation-prices"
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
    title: "公司信息管理",
    description: "公司主档资料，先覆盖名称、地址、电话、邮箱和位置编码。",
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
    title: "地区代码管理",
    description: "正式地区主数据，供城市和堆场统一引用。",
    tableName: "region_codes",
    fields: ["region_code", "region_name", "description", "status"],
  },
  {
    slug: "cities",
    title: "城市物流信息管理",
    description: "城市/港口标准码与国家、大区映射。",
    tableName: "cities",
    fields: ["city_code", "city_name", "country", "region_id", "remark"],
  },
  {
    slug: "depots",
    title: "堆场代码管理",
    description: "堆场主档，统一城市、地区、类别和状态。",
    tableName: "depots",
    fields: [
      "depot_code",
      "depot_name",
      "city_id",
      "region_id",
      "depot_type",
      "depot_address",
      "contact_person",
      "depot_tel",
      "status",
    ],
  },
  {
    slug: "cost-codes",
    title: "费用代码管理",
    description: "费用类字典，可直接复用现有 code 表。",
    tableName: "cost_codes",
    fields: ["cost_code", "cost_name", "description", "status"],
  },
  {
    slug: "revenue-codes",
    title: "收入代码管理",
    description: "收入类字典，可直接复用现有 code 表。",
    tableName: "revenue_codes",
    fields: ["revenue_code", "revenue_name", "description", "status"],
  },
  {
    slug: "condition-codes",
    title: "箱况代码管理",
    description: "页面中的状态代码管理按箱况代码实现。",
    tableName: "container_condition_codes",
    fields: ["condition_code", "condition_name", "description", "status"],
  },
  {
    slug: "type-codes",
    title: "箱型代码管理",
    description: "箱型和备注字典，可直接复用现有 code 表。",
    tableName: "container_type_codes",
    fields: ["type_code", "remark", "status"],
  },
  {
    slug: "operation-prices",
    title: "运营价格配置",
    description: "按尺寸 + 箱况维护运营加价配置。",
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
    slug: "container-number-rules",
    title: "箱号规则",
    description: "按尺寸维护前缀、流水位数和当前序号。",
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
