import React, { createContext, useContext, type MouseEvent, type ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  regionsActions,
  citiesActions,
  companiesActions,
  depotsActions,
  financialCodesActions,
  conditionCodesActions,
  containerNumberRulesActions,
  operationPricesActions,
  sizeCodesActions,
  typeCodesActions,
  toast,
  anchorClick,
} = vi.hoisted(() => ({
  regionsActions: {
    getRegionCodes: vi.fn(),
    getRegionCodeSuggestions: vi.fn(),
  },
  citiesActions: {
    getCityLogistics: vi.fn(),
    getCitySuggestions: vi.fn(),
  },
  companiesActions: {
    getCompanyProfiles: vi.fn(),
    getCompanyProfileSuggestions: vi.fn(),
  },
  depotsActions: {
    getDepotCodes: vi.fn(),
    getDepotSuggestions: vi.fn(),
  },
  financialCodesActions: {
    getFinancialCodes: vi.fn(),
    getFinancialCodeSuggestions: vi.fn(),
  },
  conditionCodesActions: {
    getConditionCodes: vi.fn(),
    getConditionCodeSuggestions: vi.fn(),
  },
  containerNumberRulesActions: {
    getContainerNumberRules: vi.fn(),
    getContainerNumberRulePrefixSuggestions: vi.fn(),
  },
  operationPricesActions: {
    getOperationPrices: vi.fn(),
  },
  sizeCodesActions: {
    getSizeCodes: vi.fn(),
    getSizeCodeSuggestions: vi.fn(),
  },
  typeCodesActions: {
    getTypeCodes: vi.fn(),
    getTypeCodeSuggestions: vi.fn(),
  },
  toast: vi.fn(),
  anchorClick: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...rest
  }: {
    children: ReactNode;
    href: string;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  } & Record<string, unknown>) => (
    <a href={href} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = (props: { className?: string }) => (
    <span data-testid="lucide-mock-icon" className={props.className} />
  );
  return {
    ArrowDown: Icon,
    ArrowRight: Icon,
    ArrowUp: Icon,
    ArrowUpDown: Icon,
    BadgeDollarSign: Icon,
    Building2: Icon,
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    CircleDollarSign: Icon,
    ClipboardList: Icon,
    Download: Icon,
    Eye: Icon,
    Globe2: Icon,
    Landmark: Icon,
    MapPinned: Icon,
    Package2: Icon,
    Pencil: Icon,
    Plus: Icon,
    RotateCcw: Icon,
    Ruler: Icon,
    Scale: Icon,
    Search: Icon,
    Warehouse: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

const SelectContext = createContext<{ value?: string; onValueChange?: (value: string) => void } | null>(null);

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (value: string) => void }) => (
    <SelectContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => {
    const ctx = useContext(SelectContext);
    return <span>{ctx?.value || placeholder || ""}</span>;
  },
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(SelectContext);
    return (
      <button type="button" onClick={() => ctx?.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
}));

vi.mock("@/components/basic-info/region-code-form-dialog", () => ({ RegionCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/region-code-view-dialog", () => ({ RegionCodeViewDialog: () => null }));
vi.mock("@/components/basic-info/city-logistics-form-dialog", () => ({ CityLogisticsFormDialog: () => null }));
vi.mock("@/components/basic-info/city-logistics-view-dialog", () => ({ CityLogisticsViewDialog: () => null }));
vi.mock("@/components/basic-info/company-profile-form-dialog", () => ({ CompanyProfileFormDialog: () => null }));
vi.mock("@/components/basic-info/company-profile-view-dialog", () => ({ CompanyProfileViewDialog: () => null }));
vi.mock("@/components/basic-info/company-bank-accounts-dialog", () => ({ CompanyBankAccountsDialog: () => null }));
vi.mock("@/components/basic-info/depot-code-form-dialog", () => ({ DepotCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/depot-code-view-dialog", () => ({ DepotCodeViewDialog: () => null }));
vi.mock("@/components/basic-info/financial-code-form-dialog", () => ({ FinancialCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/financial-code-view-dialog", () => ({ FinancialCodeViewDialog: () => null }));
vi.mock("@/components/basic-info/condition-code-form-dialog", () => ({ ConditionCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/condition-code-view-dialog", () => ({ ConditionCodeViewDialog: () => null }));
vi.mock("@/components/basic-info/container-number-rule-form-dialog", () => ({ ContainerNumberRuleFormDialog: () => null }));
vi.mock("@/components/basic-info/container-number-rule-view-dialog", () => ({ ContainerNumberRuleViewDialog: () => null }));
vi.mock("@/components/basic-info/operation-price-form-dialog", () => ({ OperationPriceFormDialog: () => null }));
vi.mock("@/components/basic-info/operation-price-view-dialog", () => ({ OperationPriceViewDialog: () => null }));
vi.mock("@/components/basic-info/size-code-form-dialog", () => ({ SizeCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/size-code-view-dialog", () => ({ SizeCodeViewDialog: () => null }));
vi.mock("@/components/basic-info/type-code-form-dialog", () => ({ TypeCodeFormDialog: () => null }));
vi.mock("@/components/basic-info/type-code-view-dialog", () => ({ TypeCodeViewDialog: () => null }));

vi.mock("@/app/basic-info/regions/actions", () => regionsActions);
vi.mock("@/app/basic-info/cities/actions", () => citiesActions);
vi.mock("@/app/basic-info/companies/actions", () => companiesActions);
vi.mock("@/app/basic-info/depots/actions", () => depotsActions);
vi.mock("@/app/basic-info/financial-codes/actions", () => financialCodesActions);
vi.mock("@/app/basic-info/condition-codes/actions", () => conditionCodesActions);
vi.mock(
  "@/app/basic-info/container-number-rules/actions",
  () => containerNumberRulesActions
);
vi.mock("@/app/basic-info/operation-prices/actions", () => operationPricesActions);
vi.mock("@/app/basic-info/size-codes/actions", () => sizeCodesActions);
vi.mock("@/app/basic-info/type-codes/actions", () => typeCodesActions);

import { BasicInfoDashboard } from "@/components/basic-info/basic-info-dashboard";
import { CityLogisticsDashboard } from "@/components/basic-info/city-logistics-dashboard";
import { CompanyProfilesDashboard } from "@/components/basic-info/company-profiles-dashboard";
import { ConditionCodesDashboard } from "@/components/basic-info/condition-codes-dashboard";
import { ContainerNumberRulesDashboard } from "@/components/basic-info/container-number-rules-dashboard";
import { DepotCodesDashboard } from "@/components/basic-info/depot-codes-dashboard";
import { FinancialCodeDashboard } from "@/components/basic-info/financial-code-dashboard";
import { OperationPricesDashboard } from "@/components/basic-info/operation-prices-dashboard";
import { RegionCodesDashboard } from "@/components/basic-info/region-codes-dashboard";
import { SizeCodesDashboard } from "@/components/basic-info/size-codes-dashboard";
import { TypeCodesDashboard } from "@/components/basic-info/type-codes-dashboard";

function installDownloadMocks() {
  const originalCreateElement = document.createElement.bind(document);
  if (!("createObjectURL" in URL)) {
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:mock"),
    });
  } else {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
  }
  if (!("revokeObjectURL" in URL)) {
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(() => {}),
    });
  } else {
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  }
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === "a") {
      const anchor = originalCreateElement(tagName) as HTMLAnchorElement;
      vi.spyOn(anchor, "click").mockImplementation(() => {
        anchorClick();
      });
      return anchor;
    }
    return originalCreateElement(tagName);
  });
}

function regionResult(overrides?: Partial<Parameters<typeof RegionCodesDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "region-1",
        region_code: "China",
        region_name: "China",
        status: "ACTIVE",
        created_by: "Tester",
        created_at: "2026-04-01T00:00:00Z",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { q: "" },
    ...overrides,
  };
}

function cityResult(overrides?: Partial<Parameters<typeof CityLogisticsDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "city-1",
        city_code: "SHA",
        city_name: "Shanghai",
        region: "China",
        region_id: "region-1",
        region_codes: { id: "region-1", region_code: "China", region_name: "China" },
        country: "China",
        remark: "Major port",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { cityCode: "", cityName: "", regionId: "", country: "" },
    ...overrides,
  };
}

function companyResult(
  overrides?: Partial<Parameters<typeof CompanyProfilesDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "company-1",
        company_name_en: "EW Logistics",
        company_name_cn: "EW物流",
        address_en: "LA Address",
        address_cn: "洛杉矶地址",
        phone: "123456",
        email: "company@example.com",
        location_code: "LAX",
        status: "ACTIVE",
        created_by: "Tester",
        created_at: "2026-04-01T00:00:00Z",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      companyNameCn: "",
      companyNameEn: "",
      address: "",
      phone: "",
      email: "",
    },
    ...overrides,
  };
}

function depotResult(overrides?: Partial<Parameters<typeof DepotCodesDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "depot-1",
        depot_code: "D001",
        depot_name: "Main Depot",
        depot_name_cn: "主堆场",
        depot_type: "CONTRACT",
        is_primary_depot: true,
        status: "NORMAL",
        depot_address: "Depot Address",
        depot_address_cn: "堆场地址",
        contact_person: "Depot PIC",
        gate_email: "gate@example.com",
        contact_email: "owner@example.com",
        depot_tel: "555000",
        fax: null,
        account_email: null,
        gate_in_20_cost: 0,
        gate_out_20_cost: 0,
        lift_in_20_cost: 0,
        lift_out_20_cost: 0,
        gate_in_40_cost: 0,
        gate_out_40_cost: 0,
        lift_in_40_cost: 0,
        lift_out_40_cost: 0,
        storage_rate_20: 0,
        storage_rate_40: 0,
        labour_cost: 0,
        free_days: 0,
        pti_cost: 0,
        inspection_cost: 0,
        survey_cost: 0,
        min_repair_cost: 0,
        est_recovery_fee: 0,
        user_return_surcharge_in: 0,
        user_return_surcharge_out: 0,
        currency: "USD",
        settlement_cycle: null,
        payment_remark: null,
        other_terms_remark: null,
        data_updated_on: "2026-04-01",
        remark: null,
        country_name: "China",
        depot_additional_costs: [],
        cities: {
          id: "city-1",
          city_code: "SHA",
          city_name: "Shanghai",
          region: "China",
          country: "China",
          region_codes: { id: "region-1", region_code: "China", region_name: "China" },
        },
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      depotCode: "",
      depotName: "",
      cityId: "",
      depotType: "",
      status: "",
    },
    ...overrides,
  };
}

function financialResult(
  overrides?: Partial<Parameters<typeof FinancialCodeDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "financial-1",
        category: "EXPENSE",
        code: "C001",
        name: "Lift In",
        description: "Lift in charge",
        status: "ACTIVE",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { category: "EXPENSE", code: "", name: "", enabled: "" },
    ...overrides,
  };
}

function conditionResult(
  overrides?: Partial<Parameters<typeof ConditionCodesDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "condition-1",
        code: "A",
        name: "Cargo Worthy",
        description: "Condition description",
        status: "ACTIVE",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { code: "", name: "" },
    ...overrides,
  };
}

function containerNumberRuleResult(
  overrides?: Partial<Parameters<typeof ContainerNumberRulesDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "rule-1",
        sizeCodeId: "size-1",
        sizeCode: "20GP",
        prefix: "ABC",
        serialLength: 6,
        startSerial: 1,
        endSerial: 999999,
        currentSerial: 10,
        remainingAvailable: 999989,
        exampleContainerNumber: "ABC000010",
        status: "ACTIVE",
        remark: null,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { sizeCodeId: "", prefix: "", status: "" },
    ...overrides,
  };
}

function operationPriceResult(
  overrides?: Partial<Parameters<typeof OperationPricesDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "operation-1",
        size_code_id: "size-1",
        condition_code_id: "condition-1",
        addon_price: 12.5,
        currency: "USD",
        effective_from: "2026-04-01",
        effective_to: null,
        status: "ACTIVE",
        remark: null,
        container_size_codes: { id: "size-1", size_code: "20GP" },
        container_condition_codes: { id: "condition-1", condition_name: "Cargo Worthy" },
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { sizeId: "", conditionId: "", status: "" },
    ...overrides,
  };
}

function sizeResult(overrides?: Partial<Parameters<typeof SizeCodesDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "size-1",
        code: "20GP",
        name: "20 Dry",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { code: "" },
    ...overrides,
  };
}

function typeResult(overrides?: Partial<Parameters<typeof TypeCodesDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "type-1",
        code: "GP",
        typeDescription: "General Purpose",
        remark: null,
        status: "ACTIVE",
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: { code: "" },
    ...overrides,
  };
}

describe("Basic Info dashboard regression workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Basic Info center navigation cards", () => {
    render(
      <BasicInfoDashboard
        sections={[
          {
            slug: "regions",
            title: "Region Codes",
            description: "Manage regions",
            available: true,
            totalCount: 2,
          },
          {
            slug: "depots",
            title: "Depot Codes",
            description: "Manage depots",
            available: true,
            totalCount: 3,
          },
        ]}
      />
    );

    expect(screen.getByText(/system codes center/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /region codes/i })).toHaveAttribute(
      "href",
      "/basic-info/regions"
    );
    expect(screen.getByRole("link", { name: /depot codes/i })).toHaveAttribute(
      "href",
      "/basic-info/depots"
    );
  });

  it("covers region codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    regionsActions.getRegionCodes.mockResolvedValueOnce(
      regionResult({
        rows: [{ ...regionResult().rows[0], id: "region-2", region_code: "USA", region_name: "United States" }],
        filters: { q: "USA" },
      })
    );
    regionsActions.getRegionCodes.mockResolvedValueOnce(regionResult());
    regionsActions.getRegionCodeSuggestions.mockResolvedValue([]);

    render(<RegionCodesDashboard initial={regionResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/fuzzy match region/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match region/i), "USA");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(regionsActions.getRegionCodes).toHaveBeenCalledWith({ q: "USA", page: 1, pageSize: 20 })
    );
    expect(await screen.findByText("United States")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(regionsActions.getRegionCodes).toHaveBeenLastCalledWith({ q: "", page: 1, pageSize: 20 })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers city logistics search, reset, and export controls", async () => {
    const user = userEvent.setup();
    citiesActions.getCityLogistics.mockResolvedValueOnce(
      cityResult({
        rows: [{ ...cityResult().rows[0], id: "city-2", city_code: "LAX", city_name: "Los Angeles" }],
        filters: { cityCode: "LAX", cityName: "", regionId: "", country: "" },
      })
    );
    citiesActions.getCityLogistics.mockResolvedValueOnce(cityResult());
    citiesActions.getCitySuggestions.mockResolvedValue([]);

    render(
      <CityLogisticsDashboard
        initial={cityResult()}
        pageSize={20}
        regionOptions={[{ id: "region-1", region_code: "China", region_name: "China" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/fuzzy match city code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match city code/i), "LAX");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(citiesActions.getCityLogistics).toHaveBeenCalledWith({
        cityCode: "LAX",
        cityName: "",
        regionId: "",
        country: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Los Angeles")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(citiesActions.getCityLogistics).toHaveBeenLastCalledWith({
        cityCode: "",
        cityName: "",
        regionId: "",
        country: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers company profiles search, reset, and export controls", async () => {
    const user = userEvent.setup();
    companiesActions.getCompanyProfiles.mockResolvedValueOnce(
      companyResult({
        rows: [{ ...companyResult().rows[0], id: "company-2", company_name_en: "Filtered Company" }],
        filters: {
          companyNameCn: "",
          companyNameEn: "Filtered",
          address: "",
          phone: "",
          email: "",
        },
      })
    );
    companiesActions.getCompanyProfiles.mockResolvedValueOnce(companyResult());
    companiesActions.getCompanyProfileSuggestions.mockResolvedValue([]);

    render(<CompanyProfilesDashboard initial={companyResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/fuzzy match company name/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match company name/i), "Filtered");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(companiesActions.getCompanyProfiles).toHaveBeenCalledWith({
        companyNameCn: "",
        companyNameEn: "Filtered",
        address: "",
        phone: "",
        email: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Company")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(companiesActions.getCompanyProfiles).toHaveBeenLastCalledWith({
        companyNameCn: "",
        companyNameEn: "",
        address: "",
        phone: "",
        email: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers depot codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    depotsActions.getDepotCodes.mockResolvedValueOnce(
      depotResult({
        rows: [{ ...depotResult().rows[0], id: "depot-2", depot_code: "D999" }],
        filters: {
          depotCode: "D999",
          depotName: "",
          cityId: "",
          depotType: "",
          status: "",
        },
      })
    );
    depotsActions.getDepotCodes.mockResolvedValue(depotResult());
    depotsActions.getDepotSuggestions.mockResolvedValue([]);

    render(
      <DepotCodesDashboard
        initial={depotResult()}
        pageSize={20}
        cityOptions={[{ id: "city-1", city_code: "SHA", city_name: "Shanghai" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/fuzzy match depot code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match depot code/i), "D999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(depotsActions.getDepotCodes).toHaveBeenCalledWith({
        depotCode: "D999",
        depotName: "",
        cityId: "",
        depotType: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("D999")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(depotsActions.getDepotCodes).toHaveBeenLastCalledWith({
        depotCode: "",
        depotName: "",
        cityId: "",
        depotType: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => expect(depotsActions.getDepotCodes).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers financial codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    financialCodesActions.getFinancialCodes.mockResolvedValueOnce(
      financialResult({
        rows: [{ ...financialResult().rows[0], id: "financial-2", code: "C999", name: "Filtered Code" }],
        filters: { category: "EXPENSE", code: "C999", name: "", enabled: "" },
      })
    );
    financialCodesActions.getFinancialCodes.mockResolvedValueOnce(financialResult());
    financialCodesActions.getFinancialCodeSuggestions.mockResolvedValue([]);

    render(
      <FinancialCodeDashboard initial={financialResult()} pageSize={20} defaultCategory="EXPENSE" />
    );

    await user.clear(screen.getByPlaceholderText(/fuzzy match expense code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match expense code/i), "C999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(financialCodesActions.getFinancialCodes).toHaveBeenCalledWith({
        category: "EXPENSE",
        code: "C999",
        name: "",
        enabled: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Code")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(financialCodesActions.getFinancialCodes).toHaveBeenLastCalledWith({
        category: "EXPENSE",
        code: "",
        name: "",
        enabled: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers condition codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    conditionCodesActions.getConditionCodes.mockResolvedValueOnce(
      conditionResult({
        rows: [{ ...conditionResult().rows[0], id: "condition-2", code: "Z", name: "Filtered Condition" }],
        filters: { code: "Z", name: "" },
      })
    );
    conditionCodesActions.getConditionCodes.mockResolvedValueOnce(conditionResult());
    conditionCodesActions.getConditionCodeSuggestions.mockResolvedValue([]);

    render(<ConditionCodesDashboard initial={conditionResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/fuzzy match condition code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match condition code/i), "Z");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(conditionCodesActions.getConditionCodes).toHaveBeenCalledWith({
        code: "Z",
        name: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Condition")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(conditionCodesActions.getConditionCodes).toHaveBeenLastCalledWith({
        code: "",
        name: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers container number rules search, reset, and export controls", async () => {
    const user = userEvent.setup();
    containerNumberRulesActions.getContainerNumberRules.mockResolvedValueOnce(
      containerNumberRuleResult({
        rows: [{ ...containerNumberRuleResult().rows[0], id: "rule-2", prefix: "ZZZ" }],
        filters: { sizeCodeId: "", prefix: "ZZZ", status: "" },
      })
    );
    containerNumberRulesActions.getContainerNumberRules.mockResolvedValueOnce(
      containerNumberRuleResult()
    );
    containerNumberRulesActions.getContainerNumberRulePrefixSuggestions.mockResolvedValue([]);

    render(
      <ContainerNumberRulesDashboard
        initial={containerNumberRuleResult()}
        pageSize={20}
        sizeOptions={[{ id: "size-1", size_code: "20GP", size_name: "20 Dry" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/fuzzy match prefix/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match prefix/i), "ZZZ");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(containerNumberRulesActions.getContainerNumberRules).toHaveBeenCalledWith({
        sizeCodeId: "",
        prefix: "ZZZ",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("ZZZ")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(containerNumberRulesActions.getContainerNumberRules).toHaveBeenLastCalledWith({
        sizeCodeId: "",
        prefix: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers operation prices search, reset, and export controls", async () => {
    const user = userEvent.setup();
    operationPricesActions.getOperationPrices.mockResolvedValueOnce(
      operationPriceResult({
        filters: { sizeId: "", conditionId: "", status: "ACTIVE" },
      })
    );
    operationPricesActions.getOperationPrices.mockResolvedValue(operationPriceResult());

    render(
      <OperationPricesDashboard
        initial={operationPriceResult()}
        pageSize={20}
        sizeOptions={[{ id: "size-1", code: "20GP", label: "20GP" }]}
        conditionOptions={[{ id: "condition-1", code: "A", label: "Cargo Worthy" }]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Enabled" }));
    await user.click(screen.getByRole("button", { name: /search/i }));
    await waitFor(() =>
      expect(operationPricesActions.getOperationPrices).toHaveBeenCalledWith({
        sizeId: "",
        conditionId: "",
        status: "ACTIVE",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(operationPricesActions.getOperationPrices).toHaveBeenLastCalledWith({
        sizeId: "",
        conditionId: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers size codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    sizeCodesActions.getSizeCodes.mockResolvedValueOnce(
      sizeResult({
        rows: [{ ...sizeResult().rows[0], id: "size-2", code: "45HC", name: "45 High Cube" }],
        filters: { code: "45HC" },
      })
    );
    sizeCodesActions.getSizeCodes.mockResolvedValueOnce(sizeResult());
    sizeCodesActions.getSizeCodeSuggestions.mockResolvedValue([]);

    render(<SizeCodesDashboard initial={sizeResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/fuzzy match size code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match size code/i), "45HC");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(sizeCodesActions.getSizeCodes).toHaveBeenCalledWith({
        code: "45HC",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("45HC")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(sizeCodesActions.getSizeCodes).toHaveBeenLastCalledWith({
        code: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers type codes search, reset, and export controls", async () => {
    const user = userEvent.setup();
    typeCodesActions.getTypeCodes.mockResolvedValueOnce(
      typeResult({
        rows: [{ ...typeResult().rows[0], id: "type-2", code: "HC", typeDescription: "High Cube" }],
        filters: { code: "HC" },
      })
    );
    typeCodesActions.getTypeCodes.mockResolvedValueOnce(typeResult());
    typeCodesActions.getTypeCodeSuggestions.mockResolvedValue([]);

    render(<TypeCodesDashboard initial={typeResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/fuzzy match type code/i));
    await user.type(screen.getByPlaceholderText(/fuzzy match type code/i), "HC");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(typeCodesActions.getTypeCodes).toHaveBeenCalledWith({
        code: "HC",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("HC")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(typeCodesActions.getTypeCodes).toHaveBeenLastCalledWith({
        code: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    expect(anchorClick).toHaveBeenCalled();
  });
});
