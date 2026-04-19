import { notFound } from "next/navigation";

import {
  getVendorBuyerOptions,
  getVendorById,
  getVendorRegionOptions,
} from "@/app/partners/vendors/actions";
import { VendorForm } from "@/components/vendors/vendor-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditVendorPage({ params }: PageProps) {
  const { id } = await params;
  const [vendor, regionOptions, buyerOptions] = await Promise.all([
    getVendorById(id),
    getVendorRegionOptions(),
    getVendorBuyerOptions(),
  ]);

  if (!vendor) notFound();

  return (
    <VendorForm
      key={`${vendor.id}:${vendor.updated_at}`}
      mode="edit"
      initialVendor={vendor}
      regionOptions={regionOptions}
      buyerOptions={buyerOptions}
    />
  );
}
