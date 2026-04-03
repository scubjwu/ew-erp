import { notFound } from "next/navigation";

import {
  getMaterialVendorBuyerOptions,
  getMaterialVendorById,
} from "@/app/partners/material-vendors/actions";
import { MaterialVendorForm } from "@/components/material-vendors/material-vendor-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

export default async function ViewMaterialVendorPage({ params }: PageProps) {
  const [vendor, picOptions] = await Promise.all([
    getMaterialVendorById(params.id),
    getMaterialVendorBuyerOptions(),
  ]);

  if (!vendor) notFound();

  return (
    <MaterialVendorForm
      key={`${vendor.id}:${vendor.updated_at}`}
      mode="view"
      initialVendor={vendor}
      picOptions={picOptions}
    />
  );
}
