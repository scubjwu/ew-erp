import {
  getMaterialVendorBuyerOptions,
} from "@/app/partners/material-vendors/actions";
import { MaterialVendorForm } from "@/components/material-vendors/material-vendor-form";

export const dynamic = "force-dynamic";

export default async function NewMaterialVendorPage() {
  const picOptions = await getMaterialVendorBuyerOptions();

  return <MaterialVendorForm mode="create" picOptions={picOptions} />;
}
