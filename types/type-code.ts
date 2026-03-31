export interface TypeCodeRow {
  id: string;
  code: string;
  typeDescription: string | null;
  remark: string | null;
  status: "ACTIVE" | "INACTIVE";
}

