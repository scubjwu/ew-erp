import { BasicInfoDashboard } from "@/components/basic-info/basic-info-dashboard";
import { getBasicInfoOverview } from "@/lib/supabase/basic-info-api";

export const metadata = {
  title: "System Codes — EW ERP",
};

export const dynamic = "force-dynamic";

export default async function BasicInfoPage() {
  const sections = await getBasicInfoOverview();

  return <BasicInfoDashboard sections={sections} />;
}
