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

export default async function EditMaterialVendorPage({ params }: PageProps) {
  const [vendor, picOptions] = await Promise.all([
    getMaterialVendorById(params.id),
    getMaterialVendorBuyerOptions(),
  ]);

  if (!vendor) notFound();

  return (
    <MaterialVendorForm
      key={`${vendor.id}:${vendor.updated_at}`}
      mode="edit"
      initialVendor={vendor}
      picOptions={picOptions}
    />
  );
}
