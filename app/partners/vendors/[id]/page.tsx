import { notFound } from "next/navigation";

import {
  getVendorBuyerOptions,
  getVendorById,
  getVendorRegionOptions,
} from "@/app/partners/vendors/actions";
import { VendorForm } from "@/components/vendors/vendor-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ViewVendorPage({ params }: PageProps) {
  const [vendor, regionOptions, buyerOptions] = await Promise.all([
    getVendorById(params.id),
    getVendorRegionOptions(),
    getVendorBuyerOptions(),
  ]);

  if (!vendor) notFound();

  return (
    <VendorForm
      key={`${vendor.id}:${vendor.updated_at}`}
      mode="view"
      initialVendor={vendor}
      regionOptions={regionOptions}
      buyerOptions={buyerOptions}
    />
  );
}
