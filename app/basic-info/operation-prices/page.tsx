import {
  DEFAULT_OPERATION_PRICES_SORT,
  getOperationPriceFormOptions,
  getOperationPrices,
  type OperationPricesQuery,
} from "@/app/basic-info/operation-prices/actions";
import { OperationPricesDashboard } from "@/components/basic-info/operation-prices-dashboard";

export const metadata = {
  title: "Operation Price Configs — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function OperationPricesPage() {
  const initialParams: OperationPricesQuery = {
    sizeId: "",
    conditionId: "",
    status: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: DEFAULT_OPERATION_PRICES_SORT.sortBy,
    sortDirection: DEFAULT_OPERATION_PRICES_SORT.sortDirection,
  };

  const [initial, options] = await Promise.all([
    getOperationPrices(initialParams),
    getOperationPriceFormOptions(),
  ]);

  return (
    <OperationPricesDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      sizeOptions={options.sizeOptions}
      conditionOptions={options.conditionOptions}
    />
  );
}
