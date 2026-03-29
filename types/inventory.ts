export type InventoryRow = {
  id: string;
  unit: string;
  size: string;
  type: string;
  condition: string;
  color: string;
  /** Port of Discharge */
  pod: string;
  /** Port of Loading */
  pol: string;
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
  depotName: string;
  depotAddr: string;
  depotTel: string;
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
