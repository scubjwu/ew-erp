export interface ConditionCodeRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
}

