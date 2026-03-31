import {
  getFinancialCodes,
  type FinancialCodesQuery,
} from "@/app/basic-info/financial-codes/actions";
import { FinancialCodeDashboard } from "@/components/basic-info/financial-code-dashboard";

export const metadata = {
  title: "Expense Code — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function CostCodesPage() {
  const initialParams: FinancialCodesQuery = {
    category: "EXPENSE",
    code: "",
    name: "",
    enabled: "",
    page: 1,
    pageSize: PAGE_SIZE,
  };

  const initial = await getFinancialCodes(initialParams);

  return <FinancialCodeDashboard initial={initial} pageSize={PAGE_SIZE} defaultCategory="EXPENSE" />;
}
