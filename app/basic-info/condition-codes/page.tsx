import {
  DEFAULT_CONDITION_CODE_SORT,
  getConditionCodes,
  type ConditionCodesQuery,
} from "@/app/basic-info/condition-codes/actions";
import { ConditionCodesDashboard } from "@/components/basic-info/condition-codes-dashboard";

export const metadata = {
  title: "Condition Code — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function ConditionCodesPage() {
  const initialParams: ConditionCodesQuery = {
    code: "",
    name: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: DEFAULT_CONDITION_CODE_SORT.sortBy,
    sortDirection: DEFAULT_CONDITION_CODE_SORT.sortDirection,
  };

  const initial = await getConditionCodes(initialParams);

  return <ConditionCodesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
