import {
  getContainerNumberRuleSizeOptions,
  getContainerNumberRules,
  type ContainerNumberRulesQuery,
} from "@/app/basic-info/container-number-rules/actions";
import { ContainerNumberRulesDashboard } from "@/components/basic-info/container-number-rules-dashboard";

export const metadata = {
  title: "Container Number Rules — EW ERP",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function ContainerNumberRulesPage() {
  const initialParams: ContainerNumberRulesQuery = {
    sizeCodeId: "",
    prefix: "",
    status: "",
    page: 1,
    pageSize: PAGE_SIZE,
    sortBy: "sizeCode",
    sortDirection: "asc",
  };

  const [initial, sizeOptions] = await Promise.all([
    getContainerNumberRules(initialParams),
    getContainerNumberRuleSizeOptions(),
  ]);

  return (
    <ContainerNumberRulesDashboard
      initial={initial}
      pageSize={PAGE_SIZE}
      sizeOptions={sizeOptions}
    />
  );
}
