import { PartnersDashboard } from "@/components/partners/partners-dashboard";
import { getPartnersOverview } from "@/lib/supabase/partners-api";

export const metadata = {
  title: "Partners — EW ERP",
};

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const sections = await getPartnersOverview();

  return <PartnersDashboard sections={sections} />;
}
