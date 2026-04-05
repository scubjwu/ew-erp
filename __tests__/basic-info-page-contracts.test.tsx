import { describe, expect, it, vi } from "vitest";

type PageCase = {
  name: string;
  pagePath: string;
  actionPath: string;
  dashboardPath: string;
  dashboardExport: string;
  getDataExport: string;
  getDataResult?: unknown;
  getOptionsExport?: string;
  optionsResult?: unknown;
  expectedParams: Record<string, unknown>;
  expectedDashboardProps: Record<string, unknown>;
};

async function loadBasicInfoPage(testCase: PageCase) {
  vi.resetModules();

  const getData = vi.fn().mockResolvedValue(testCase.getDataResult ?? { rows: [], totalCount: 0 });
  const getOptions = testCase.getOptionsExport
    ? vi.fn().mockResolvedValue(testCase.optionsResult ?? [])
    : null;
  const dashboard = vi.fn(() => null);

  vi.doMock(testCase.actionPath, () => {
    const mockExports: Record<string, unknown> = {
      [testCase.getDataExport]: getData,
    };

    if (testCase.getOptionsExport && getOptions) {
      mockExports[testCase.getOptionsExport] = getOptions;
    }

    return mockExports;
  });

  vi.doMock(testCase.dashboardPath, () => ({
    [testCase.dashboardExport]: dashboard,
  }));

  const pageModule = await import(testCase.pagePath);
  const element = await pageModule.default();

  return { getData, getOptions, dashboard, element };
}

const pageCases: PageCase[] = [
  {
    name: "regions page requests default sort and filter options",
    pagePath: "@/app/basic-info/regions/page",
    actionPath: "@/app/basic-info/regions/actions",
    dashboardPath: "@/components/basic-info/region-codes-dashboard",
    dashboardExport: "RegionCodesDashboard",
    getDataExport: "getRegionCodes",
    getOptionsExport: "getRegionFilterOptions",
    optionsResult: { regions: [] },
    expectedParams: {
      q: "",
      sortBy: "regionCode",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: { pageSize: 10, filterOptions: { regions: [] } },
  },
  {
    name: "cities page requests default sort and region options",
    pagePath: "@/app/basic-info/cities/page",
    actionPath: "@/app/basic-info/cities/actions",
    dashboardPath: "@/components/basic-info/city-logistics-dashboard",
    dashboardExport: "CityLogisticsDashboard",
    getDataExport: "getCityLogistics",
    getOptionsExport: "getRegionOptions",
    optionsResult: [],
    expectedParams: {
      cityCode: "",
      cityName: "",
      regionId: "",
      country: "",
      page: 1,
      pageSize: 10,
      sortBy: "cityCode",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, regionOptions: [] },
  },
  {
    name: "companies page requests default sort",
    pagePath: "@/app/basic-info/companies/page",
    actionPath: "@/app/basic-info/companies/actions",
    dashboardPath: "@/components/basic-info/company-profiles-dashboard",
    dashboardExport: "CompanyProfilesDashboard",
    getDataExport: "getCompanyProfiles",
    expectedParams: {
      companyNameCn: "",
      companyNameEn: "",
      address: "",
      phone: "",
      email: "",
      page: 1,
      pageSize: 10,
      sortBy: "companyNameEn",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10 },
  },
  {
    name: "condition codes page requests default sort",
    pagePath: "@/app/basic-info/condition-codes/page",
    actionPath: "@/app/basic-info/condition-codes/actions",
    dashboardPath: "@/components/basic-info/condition-codes-dashboard",
    dashboardExport: "ConditionCodesDashboard",
    getDataExport: "getConditionCodes",
    expectedParams: {
      code: "",
      name: "",
      page: 1,
      pageSize: 10,
      sortBy: "code",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10 },
  },
  {
    name: "container number rules page requests default sort and size options",
    pagePath: "@/app/basic-info/container-number-rules/page",
    actionPath: "@/app/basic-info/container-number-rules/actions",
    dashboardPath: "@/components/basic-info/container-number-rules-dashboard",
    dashboardExport: "ContainerNumberRulesDashboard",
    getDataExport: "getContainerNumberRules",
    getOptionsExport: "getContainerNumberRuleSizeOptions",
    optionsResult: [],
    expectedParams: {
      sizeCodeId: "",
      prefix: "",
      status: "",
      page: 1,
      pageSize: 10,
      sortBy: "sizeCode",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, sizeOptions: [] },
  },
  {
    name: "cost codes page requests expense defaults",
    pagePath: "@/app/basic-info/cost-codes/page",
    actionPath: "@/app/basic-info/financial-codes/actions",
    dashboardPath: "@/components/basic-info/financial-code-dashboard",
    dashboardExport: "FinancialCodeDashboard",
    getDataExport: "getFinancialCodes",
    expectedParams: {
      category: "EXPENSE",
      code: "",
      name: "",
      enabled: "",
      page: 1,
      pageSize: 10,
      sortBy: "code",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, defaultCategory: "EXPENSE" },
  },
  {
    name: "revenue codes page requests income defaults",
    pagePath: "@/app/basic-info/revenue-codes/page",
    actionPath: "@/app/basic-info/financial-codes/actions",
    dashboardPath: "@/components/basic-info/financial-code-dashboard",
    dashboardExport: "FinancialCodeDashboard",
    getDataExport: "getFinancialCodes",
    expectedParams: {
      category: "INCOME",
      code: "",
      name: "",
      enabled: "",
      page: 1,
      pageSize: 10,
      sortBy: "code",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, defaultCategory: "INCOME" },
  },
  {
    name: "depots page requests default sort and city options",
    pagePath: "@/app/basic-info/depots/page",
    actionPath: "@/app/basic-info/depots/actions",
    dashboardPath: "@/components/basic-info/depot-codes-dashboard",
    dashboardExport: "DepotCodesDashboard",
    getDataExport: "getDepotCodes",
    getOptionsExport: "getDepotCityOptions",
    optionsResult: [],
    expectedParams: {
      depotCode: "",
      depotName: "",
      cityId: "",
      depotType: "",
      status: "",
      page: 1,
      pageSize: 10,
      sortBy: "depotCode",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, cityOptions: [] },
  },
  {
    name: "operation prices page requests default sort and options",
    pagePath: "@/app/basic-info/operation-prices/page",
    actionPath: "@/app/basic-info/operation-prices/actions",
    dashboardPath: "@/components/basic-info/operation-prices-dashboard",
    dashboardExport: "OperationPricesDashboard",
    getDataExport: "getOperationPrices",
    getOptionsExport: "getOperationPriceFormOptions",
    optionsResult: { sizeOptions: [], conditionOptions: [] },
    expectedParams: {
      sizeId: "",
      conditionId: "",
      status: "",
      page: 1,
      pageSize: 10,
      sortBy: "size",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10, sizeOptions: [], conditionOptions: [] },
  },
  {
    name: "size codes page requests default sort",
    pagePath: "@/app/basic-info/size-codes/page",
    actionPath: "@/app/basic-info/size-codes/actions",
    dashboardPath: "@/components/basic-info/size-codes-dashboard",
    dashboardExport: "SizeCodesDashboard",
    getDataExport: "getSizeCodes",
    expectedParams: {
      code: "",
      page: 1,
      pageSize: 10,
      sortBy: "code",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10 },
  },
  {
    name: "type codes page requests default sort",
    pagePath: "@/app/basic-info/type-codes/page",
    actionPath: "@/app/basic-info/type-codes/actions",
    dashboardPath: "@/components/basic-info/type-codes-dashboard",
    dashboardExport: "TypeCodesDashboard",
    getDataExport: "getTypeCodes",
    expectedParams: {
      code: "",
      page: 1,
      pageSize: 10,
      sortBy: "code",
      sortDirection: "asc",
    },
    expectedDashboardProps: { pageSize: 10 },
  },
];

describe("basic info pages", () => {
  for (const testCase of pageCases) {
    it(testCase.name, async () => {
      const { getData, getOptions, dashboard, element } = await loadBasicInfoPage(testCase);

      expect(getData).toHaveBeenCalledWith(testCase.expectedParams);
      if (testCase.getOptionsExport) {
        expect(getOptions).toHaveBeenCalledTimes(1);
      }
      expect(dashboard).not.toHaveBeenCalled();
      expect(element.type).toBe(dashboard);
      expect(element.props).toMatchObject({
        initial: { rows: [], totalCount: 0 },
        ...testCase.expectedDashboardProps,
      });
    });
  }
});
