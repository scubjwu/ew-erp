import {
  getVendorBuyerOptions,
  getVendorRegionOptions,
} from "@/app/partners/vendors/actions";
import { VendorForm } from "@/components/vendors/vendor-form";

export const dynamic = "force-dynamic";

export default async function NewVendorPage() {
  const [regionOptions, buyerOptions] = await Promise.all([
    getVendorRegionOptions(),
    getVendorBuyerOptions(),
  ]);

  return (
    <VendorForm
      mode="create"
      regionOptions={regionOptions}
      buyerOptions={buyerOptions}
    />
  );
}
