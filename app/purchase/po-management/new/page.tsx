import type { Metadata } from "next";

import { getPurchaseDraftFormOptions } from "@/app/purchase/po-management/actions";
import { PurchaseOrderCreateForm } from "@/components/purchase/purchase-order-create-form";

export const metadata: Metadata = {
  title: "Create Purchase Order — EW ERP",
};

export default async function CreatePurchaseOrderPage() {
  const options = await getPurchaseDraftFormOptions();

  return <PurchaseOrderCreateForm options={options} />;
}
