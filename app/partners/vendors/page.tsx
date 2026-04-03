import {
  getVendorRegionOptions,
  getVendors,
  type VendorQuery,
} from "@/app/partners/vendors/actions";
import { VendorsDashboard } from "@/components/vendors/vendors-dashboard";

export const metadata = {
  title: "Vendors — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function VendorsPage() {
  const initialParams: VendorQuery = {
    vendorCode: "",
    legalCompanyName: "",
    regionId: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, regionOptions] = await Promise.all([
    getVendors(initialParams),
    getVendorRegionOptions(),
  ]);

  return (
    <VendorsDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      regionOptions={regionOptions}
    />
  );
}
