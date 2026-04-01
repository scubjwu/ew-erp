import { getCustomers } from "@/app/customers/actions";
import { CustomersDashboard } from "@/components/customers/customers-dashboard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function PartnerCustomersPage() {
  const initial = await getCustomers({
    search: "",
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return <CustomersDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
