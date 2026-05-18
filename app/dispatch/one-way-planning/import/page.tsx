import { OneWayPlanImportDashboard } from "@/components/dispatch/one-way-plan-import-dashboard";

export const metadata = {
  title: "Import CMA Report — EW ERP",
};

export const dynamic = "force-dynamic";

export default function OneWayPlanningImportPage() {
  return <OneWayPlanImportDashboard />;
}
