import {
  getFinancialExchangeRates,
  type FinancialExchangeRateQuery,
} from "@/app/basic-info/financial-exchange-rates/actions";
import { FinancialExchangeRatesDashboard } from "@/components/basic-info/financial-exchange-rates-dashboard";

export const metadata = {
  title: "Financial Exchange Rates — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function FinancialExchangeRatesPage() {
  const initialParams: FinancialExchangeRateQuery = {
    rateDate: "",
    fromCurrency: "",
    toCurrency: "",
    status: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "rateDate",
    sortDirection: "desc",
  };

  const initial = await getFinancialExchangeRates(initialParams);

  return <FinancialExchangeRatesDashboard initial={initial} pageSize={PAGE_SIZE} />;
}
