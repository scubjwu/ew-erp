import { notFound } from "next/navigation";

import { getPurchaseOrderItemContainers } from "@/app/purchase/po-management/actions";
import { PurchaseItemContainersView } from "@/components/purchase/purchase-item-containers-view";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderItemContainersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; itemId: string }>;
  searchParams?: Promise<{ page?: string; pageSize?: string }>;
}) {
  const { id, itemId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const page = Number(resolvedSearchParams?.page ?? "1");
  const pageSize = Number(resolvedSearchParams?.pageSize ?? "20");
  const data = await getPurchaseOrderItemContainers(id, itemId, page, pageSize);
  if (!data) notFound();

  return <PurchaseItemContainersView data={data} />;
}
