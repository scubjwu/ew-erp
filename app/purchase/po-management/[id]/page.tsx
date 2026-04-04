import { notFound } from "next/navigation";

import { getPurchaseOrderDetail } from "@/app/purchase/po-management/actions";
import { PurchaseOrderDetailView } from "@/components/purchase/purchase-order-detail";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getPurchaseOrderDetail(params.id);
  if (!order) notFound();

  return <PurchaseOrderDetailView order={order} />;
}
