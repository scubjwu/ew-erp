export type InventoryRow = {
  id: string;
  unit: string;
  size: string;
  type: string;
  condition: string;
  color: string;
  /** New normalized planning snapshot from DB (snake_case returned as-is). */
  purchase_date: string;
  /** Snapshot of planned depot name at planning time (snake_case returned as-is). */
  planned_depot_name: string;
  /** FK fields from normalized DB schema (snake_case returned as-is). */
  actual_depot_id: string | null;
  pol_id: string | null;
  pod_id: string | null;
  /** Joined relational objects from FK lookups. */
  actual_depot?:
    | {
        depot_name: string;
        depot_tel: string;
        depot_address: string;
      }
    | null;
  pol_city?:
    | {
        city_name: string;
        city_code: string;
      }
    | null;
  pod_city?:
    | {
        city_name: string;
        city_code: string;
      }
    | null;
  /** Legacy field - to be replaced by relational data. */
  pod?: string;
  /** Legacy field - to be replaced by relational data. */
  pol?: string;
  /** Ocean / line carrier */
  carrier: string;
  /** 调运公司 — inland / dispatch transport (distinct from carrier) */
  transitCompany: string;
  /** OnHire# (snake_case for finalized column spec) */
  onhire_no: string;
  /** OnHireDate (snake_case for finalized column spec) */
  onhire_date: string;
  /** Sales Region (snake_case for finalized column spec) */
  sales_region: string;
  /** Operational Remark */
  remark1: string;
  /** Other Redelivery Instruction */
  remark2: string;

  /** legacy aliases kept for backward compatibility in filters/actions */
  onhireNum: string;
  status: string;
  customerOrderNum: string;
  salesRep: string;
  salesRegion: string;
  specs: string;
  yom: string;
  flpLbEod: string;
  vents?: string;
  engine: string;
  eta: string;
  salesDate: string;
  onHireDate: string;
  customer: string;
  price: number;
  /** Legacy field - to be replaced by relational data. */
  depotName?: string;
  /** Legacy field - to be replaced by relational data. */
  depotAddr?: string;
  /** Legacy field - to be replaced by relational data. */
  depotTel?: string;
  gateInRef: string;
  cost: number;
};

export type InventoryDateFilters = {
  etaFrom: string;
  etaTo: string;
  salesDateFrom: string;
  salesDateTo: string;
  onHireFrom: string;
  onHireTo: string;
};
