import { getOneWayPlanFormOptions } from "@/app/dispatch/one-way-planning/actions";
import { OneWayPlanCreateForm } from "@/components/dispatch/one-way-plan-create-form";

export const metadata = {
  title: "New One Way Plan — EW ERP",
};

export const dynamic = "force-dynamic";

export default async function NewOneWayPlanPage() {
  const options = await getOneWayPlanFormOptions();

  return <OneWayPlanCreateForm options={options} />;
}
