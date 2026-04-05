import {
  getCustomerFilterOptions,
  getCustomers,
  type CustomerQuery,
} from "@/app/customers/actions";
import { CustomersDashboard } from "@/components/customers/customers-dashboard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function PartnerCustomersPage() {
  const initialParams: CustomerQuery = {
    customerId: "",
    companyName: "",
    sortBy: "customerId",
    sortDirection: "asc",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const [initial, filterOptions] = await Promise.all([
    getCustomers(initialParams),
    getCustomerFilterOptions(),
  ]);

  return <CustomersDashboard initial={initial} pageSize={PAGE_SIZE} filterOptions={filterOptions} />;
}
