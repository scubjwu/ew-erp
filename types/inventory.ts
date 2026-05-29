export type InventoryRow = {
  id: string;
  unit: string;
  size: string;
  type: string;
  specs: string;
  condition: string;
  color: string;
  engine: string;
  yom: string;
  vents: string;
  flp: string;
  lbx: string;
  eod: string;
  flpLbEod: string;
  status: string;
  pol: string;
  pod: string;
  transitCompany: string;
  onhire_no: string;
  onhire_date: string;
  carrier: string;
  eta: string;

  purchase_date: string;
  planned_depot_name: string;
  actual_depot_id: string | null;
  pol_id: string | null;
  pod_id: string | null;
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
  onhireNum: string;
  sales_region: string;
  salesRegion: string;
  salesRep: string;
  salesDate: string;
  onHireDate: string;
  customer: string;
  customerOrderNum: string;
  price: number;
  depotName: string;
  depotAddr: string;
  depotTel: string;
  gateInRef: string;
  cost: number;
  remark1: string;
  remark2: string;
};

export type InventoryDateFilters = {
  etaFrom: string;
  etaTo: string;
  salesDateFrom: string;
  salesDateTo: string;
  onHireFrom: string;
  onHireTo: string;
};
