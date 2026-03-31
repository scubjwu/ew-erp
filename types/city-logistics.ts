export interface RegionOption {
  id: string;
  region_code: string;
  region_name: string;
}

export interface CityLogisticsRow {
  id: string;
  city_code: string;
  city_name: string;
  country: string;
  region_id: string | null;
  region: string | null;
  remark: string | null;
  created_at: string | null;
  updated_at: string | null;
  region_codes?: {
    id: string;
    region_code: string;
    region_name: string;
  } | null;
}
