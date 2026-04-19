import { notFound } from "next/navigation";

import { getPurchaseOrderDetail } from "@/app/purchase/po-management/actions";
import { PurchaseOrderDetailView } from "@/components/purchase/purchase-order-detail";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getPurchaseOrderDetail(id);
  if (!order) notFound();

  return <PurchaseOrderDetailView order={order} />;
}
