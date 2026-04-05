import { describe, expect, it, vi } from "vitest";

type PageCase = {
  name: string;
  pagePath: string;
  actionPath: string;
  dashboardPath: string;
  dashboardExport: string;
  getDataExport: string;
  getDataResult?: unknown;
  optionCalls?: Array<{
    exportName: string;
    result: unknown;
  }>;
  expectedParams: Record<string, unknown>;
  expectedDashboardProps: Record<string, unknown>;
};

async function loadPartnerPage(testCase: PageCase) {
  vi.resetModules();

  const getData = vi.fn().mockResolvedValue(testCase.getDataResult ?? { rows: [], totalCount: 0 });
  const optionMocks = new Map<string, ReturnType<typeof vi.fn>>();
  const dashboard = vi.fn(() => null);

  vi.doMock(testCase.actionPath, () => {
    const mockExports: Record<string, unknown> = {
      [testCase.getDataExport]: getData,
    };

    for (const optionCall of testCase.optionCalls ?? []) {
      const mock = vi.fn().mockResolvedValue(optionCall.result);
      optionMocks.set(optionCall.exportName, mock);
      mockExports[optionCall.exportName] = mock;
    }

    return mockExports;
  });

  vi.doMock(testCase.dashboardPath, () => ({
    [testCase.dashboardExport]: dashboard,
  }));

  const pageModule = await import(testCase.pagePath);
  const element = await pageModule.default();

  return { getData, optionMocks, dashboard, element };
}

const pageCases: PageCase[] = [
  {
    name: "vendors page requests default sort and filter options",
    pagePath: "@/app/partners/vendors/page",
    actionPath: "@/app/partners/vendors/actions",
    dashboardPath: "@/components/vendors/vendors-dashboard",
    dashboardExport: "VendorsDashboard",
    getDataExport: "getVendors",
    optionCalls: [{ exportName: "getVendorFilterOptions", result: { vendorCodes: [], legalCompanyNames: [], regions: [] } }],
    expectedParams: {
      vendorCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
      sortBy: "vendorCode",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: {
      pageSize: 10,
      filterOptions: { vendorCodes: [], legalCompanyNames: [], regions: [] },
    },
  },
  {
    name: "material vendors page requests default sort and filter options",
    pagePath: "@/app/partners/material-vendors/page",
    actionPath: "@/app/partners/material-vendors/actions",
    dashboardPath: "@/components/material-vendors/material-vendors-dashboard",
    dashboardExport: "MaterialVendorsDashboard",
    getDataExport: "getMaterialVendors",
    optionCalls: [{ exportName: "getMaterialVendorFilterOptions", result: { vendorCodes: [], legalCompanyNames: [] } }],
    expectedParams: {
      vendorCode: "",
      legalCompanyName: "",
      materialCategory: "",
      isDefaultVendor: "",
      sortBy: "vendorCode",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: {
      pageSize: 10,
      filterOptions: { vendorCodes: [], legalCompanyNames: [] },
    },
  },
  {
    name: "container owners page requests default sort and filter options",
    pagePath: "@/app/partners/container-owners/page",
    actionPath: "@/app/partners/container-owners/actions",
    dashboardPath: "@/components/container-owners/container-owners-dashboard",
    dashboardExport: "ContainerOwnersDashboard",
    getDataExport: "getContainerOwners",
    optionCalls: [
      { exportName: "getContainerOwnerFilterOptions", result: { containerOwnerCodes: [], legalCompanyNames: [], regions: [] } },
      { exportName: "getContainerOwnerRegionOptions", result: [] },
    ],
    expectedParams: {
      containerOwnerCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
      sortBy: "containerOwnerCode",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: {
      pageSize: 10,
      filterOptions: { containerOwnerCodes: [], legalCompanyNames: [], regions: [] },
      regionOptions: [],
    },
  },
  {
    name: "lessee page requests default sort and filter options",
    pagePath: "@/app/partners/lessee/page",
    actionPath: "@/app/partners/lessee/actions",
    dashboardPath: "@/components/lessees/lessees-dashboard",
    dashboardExport: "LesseesDashboard",
    getDataExport: "getLessees",
    optionCalls: [
      { exportName: "getLesseeFilterOptions", result: { lesseeCodes: [], legalCompanyNames: [], regions: [] } },
      { exportName: "getLesseeRegionOptions", result: [] },
    ],
    expectedParams: {
      lesseeCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
      sortBy: "lesseeCode",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: {
      pageSize: 10,
      filterOptions: { lesseeCodes: [], legalCompanyNames: [], regions: [] },
      regionOptions: [],
    },
  },
  {
    name: "partner customers page requests default sort and filter options",
    pagePath: "@/app/partners/customers/page",
    actionPath: "@/app/customers/actions",
    dashboardPath: "@/components/customers/customers-dashboard",
    dashboardExport: "CustomersDashboard",
    getDataExport: "getCustomers",
    optionCalls: [{ exportName: "getCustomerFilterOptions", result: { customerIds: [], legalCompanyNames: [] } }],
    expectedParams: {
      customerId: "",
      companyName: "",
      sortBy: "customerId",
      sortDirection: "asc",
      page: 1,
      pageSize: 10,
    },
    expectedDashboardProps: {
      pageSize: 10,
      filterOptions: { customerIds: [], legalCompanyNames: [] },
    },
  },
];

describe("partner pages", () => {
  for (const testCase of pageCases) {
    it(testCase.name, async () => {
      const { getData, optionMocks, dashboard, element } = await loadPartnerPage(testCase);

      expect(getData).toHaveBeenCalledWith(testCase.expectedParams);
      for (const optionCall of testCase.optionCalls ?? []) {
        expect(optionMocks.get(optionCall.exportName)).toHaveBeenCalledTimes(1);
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
