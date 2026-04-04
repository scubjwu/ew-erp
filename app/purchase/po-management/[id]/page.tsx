import Link from "next/link";
import { notFound } from "next/navigation";

import { getPurchaseOrderPreviewById } from "@/app/purchase/po-management/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PurchaseOrderPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getPurchaseOrderPreviewById(params.id);
  if (!order) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 py-6 md:px-6 lg:px-8">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-base">Purchase Order Detail</CardTitle>
              <p className="text-sm text-muted-foreground">
                Milestone 1 provides a safe preview route so PO Management links are live. Full
                detail content will be delivered in Milestone 2.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/purchase/po-management">Back to PO Management</Link>
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                PO Number
              </div>
              <div className="mt-1 text-sm font-medium">{order.order_no}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </div>
              <div className="mt-1 text-sm">{order.order_status}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Order Date
              </div>
              <div className="mt-1 text-sm">{order.purchase_date ?? "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
