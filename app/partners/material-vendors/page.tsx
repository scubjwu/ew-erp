import {
  getMaterialVendors,
  type MaterialVendorQuery,
} from "@/app/partners/material-vendors/actions";
import { MaterialVendorsDashboard } from "@/components/material-vendors/material-vendors-dashboard";

export const metadata = {
  title: "Material Vendors — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function MaterialVendorsPage() {
  const initialParams: MaterialVendorQuery = {
    vendorCode: "",
    legalCompanyName: "",
    materialCategory: "",
    isDefaultVendor: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const initial = await getMaterialVendors(initialParams);

  return (
    <MaterialVendorsDashboard initial={initial} pageSize={PAGE_SIZE} />
  );
}
