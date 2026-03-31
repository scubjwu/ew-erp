export type RegionCodeStatus = "ACTIVE" | "INACTIVE";

export interface RegionCode {
  id: string;
  region_code: string;
  region_name: string;
  description: string | null;
  status: RegionCodeStatus;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}
