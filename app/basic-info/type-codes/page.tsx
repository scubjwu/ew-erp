import {
  getTypeCodes,
  type TypeCodesQuery,
} from "@/app/basic-info/type-codes/actions";
import { TypeCodesDashboard } from "@/components/basic-info/type-codes-dashboard";

export const metadata = {
  title: "Type Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function TypeCodesPage() {
  const initialParams: TypeCodesQuery = {
    code: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "code",
    sortDirection: "asc",
  };

  const initial = await getTypeCodes(initialParams);

  return <TypeCodesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
