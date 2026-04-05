import {
  getSizeCodes,
  type SizeCodesQuery,
} from "@/app/basic-info/size-codes/actions";
import { SizeCodesDashboard } from "@/components/basic-info/size-codes-dashboard";

export const metadata = {
  title: "Size Codes — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function SizeCodesPage() {
  const initialParams: SizeCodesQuery = {
    code: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "code",
    sortDirection: "asc",
  };

  const initial = await getSizeCodes(initialParams);

  return <SizeCodesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
