import { notFound } from "next/navigation";

import { getPurchaseOrderEditForm } from "@/app/purchase/po-management/actions";
import { PurchaseOrderCreateForm } from "@/components/purchase/purchase-order-create-form";

export const dynamic = "force-dynamic";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: { id: string };
}) {
  try {
    const { options, order, editMode } = await getPurchaseOrderEditForm(params.id);
    return (
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={order}
        mode="edit"
        editMode={editMode}
      />
    );
  } catch {
    notFound();
  }
}
