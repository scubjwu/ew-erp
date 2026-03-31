export interface DepotCityOption {
  id: string;
  city_code: string;
  city_name: string;
  country: string;
  region_id: string | null;
  region_name?: string | null;
}

export interface DepotCodeRow {
  id: string;
  depot_code: string;
  depot_name: string;
  depot_name_cn: string | null;
  depot_type: string | null;
  depot_address: string | null;
  depot_address_cn: string | null;
  contact_person: string | null;
  contact_email: string | null;
  depot_tel: string | null;
  fax: string | null;
  gate_email: string | null;
  account_email: string | null;
  business_contact_person: string | null;
  country_code: string | null;
  country_name: string | null;
  status: string;
  is_primary_depot: boolean;
  working_hour: string | null;
  currency: string | null;
  free_days: number | null;
  gate_in_20_cost: string | number | null;
  gate_out_20_cost: string | number | null;
  gate_in_40_cost: string | number | null;
  gate_out_40_cost: string | number | null;
  lift_in_20_cost: string | number | null;
  lift_out_20_cost: string | number | null;
  lift_in_40_cost: string | number | null;
  lift_out_40_cost: string | number | null;
  storage_rate_20: string | number | null;
  storage_rate_40: string | number | null;
  storage_rate_45: string | number | null;
  storage_rate_53: string | number | null;
  digging_cost: string | number | null;
  pti_cost: string | number | null;
  labour_cost: string | number | null;
  min_repair_cost: string | number | null;
  survey_cost: string | number | null;
  inspection_cost: string | number | null;
  est_recovery_fee: string | number | null;
  user_return_surcharge_in: string | number | null;
  user_return_surcharge_out: string | number | null;
  settlement_cycle: string | null;
  payment_remark: string | null;
  other_terms_remark: string | null;
  data_updated_on: string | null;
  remark: string | null;
  depot_attachment_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  city_id: string | null;
  region_id: string | null;
  depot_additional_costs?: Array<{
    id: string;
    cost_item: string;
    rate: string | number;
    currency: string;
    remark: string | null;
  }> | null;
  depot_attachment_links?: Array<{
    id: string;
    url: string;
  }> | null;
  cities?: {
    id: string;
    city_code: string;
    city_name: string;
    country: string;
    region_id: string | null;
    region: string | null;
    region_codes?: {
      id: string;
      region_code: string;
      region_name: string;
    } | null;
  } | null;
}
