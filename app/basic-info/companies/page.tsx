import {
  getCompanyProfiles,
  type CompanyProfilesQuery,
} from "@/app/basic-info/companies/actions";
import { CompanyProfilesDashboard } from "@/components/basic-info/company-profiles-dashboard";

export const metadata = {
  title: "Company Information Management — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function CompanyProfilesPage() {
  const initialParams: CompanyProfilesQuery = {
    companyNameCn: "",
    companyNameEn: "",
    address: "",
    phone: "",
    email: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const initial = await getCompanyProfiles(initialParams);

  return <CompanyProfilesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
