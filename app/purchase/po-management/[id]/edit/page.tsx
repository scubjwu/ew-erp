import { notFound } from "next/navigation";

import { getPurchaseOrderEditForm } from "@/app/purchase/po-management/actions";
import { PurchaseOrderCreateForm } from "@/components/purchase/purchase-order-create-form";

export const dynamic = "force-dynamic";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const { id } = await params;
    const { options, order, editPermissions } = await getPurchaseOrderEditForm(id);
    return (
      <PurchaseOrderCreateForm
        options={options}
        initialOrder={order}
        mode="edit"
        editPermissions={editPermissions}
      />
    );
  } catch {
    notFound();
  }
}
