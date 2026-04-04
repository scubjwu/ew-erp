import { notFound } from "next/navigation";

import { getPurchaseOrderItemContainers } from "@/app/purchase/po-management/actions";
import { PurchaseItemContainersView } from "@/components/purchase/purchase-item-containers-view";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderItemContainersPage({
  params,
}: {
  params: { id: string; itemId: string };
}) {
  const data = await getPurchaseOrderItemContainers(params.id, params.itemId);
  if (!data) notFound();

  return <PurchaseItemContainersView data={data} />;
}
