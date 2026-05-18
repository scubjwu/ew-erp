import { notFound } from "next/navigation";

import {
  getOneWayPlanEditDraft,
  getOneWayPlanFormOptions,
} from "@/app/dispatch/one-way-planning/actions";
import { OneWayPlanEditForm } from "@/components/dispatch/one-way-plan-edit-form";

export const dynamic = "force-dynamic";

export default async function EditOneWayPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [draft, options] = await Promise.all([
    getOneWayPlanEditDraft(id),
    getOneWayPlanFormOptions(),
  ]);
  if (!draft) notFound();

  return <OneWayPlanEditForm draft={draft} options={options} />;
}
