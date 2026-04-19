import { notFound } from "next/navigation";

import { getPurchaseOrderItemContainers } from "@/app/purchase/po-management/actions";
import { PurchaseItemContainersView } from "@/components/purchase/purchase-item-containers-view";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderItemContainersPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const data = await getPurchaseOrderItemContainers(id, itemId);
  if (!data) notFound();

  return <PurchaseItemContainersView data={data} />;
}
