import { notFound } from "next/navigation";

import { getOneWayPlanDetail } from "@/app/dispatch/one-way-planning/actions";
import { OneWayPlanDetailView } from "@/components/dispatch/one-way-plan-detail";

export const dynamic = "force-dynamic";

export default async function OneWayPlanDetailPlaceholderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOneWayPlanDetail(id);
  if (!detail) notFound();

  return <OneWayPlanDetailView detail={detail} />;
}
