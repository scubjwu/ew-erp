import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  vendorsActions,
  materialVendorsActions,
  lesseesActions,
  containerOwnersActions,
  usersActions,
  toast,
  anchorClick,
} = vi.hoisted(() => ({
  vendorsActions: {
    exportVendors: vi.fn(),
    getVendors: vi.fn(),
  },
  materialVendorsActions: {
    exportMaterialVendors: vi.fn(),
    getMaterialVendors: vi.fn(),
  },
  lesseesActions: {
    exportLessees: vi.fn(),
    getLessees: vi.fn(),
  },
  containerOwnersActions: {
    exportContainerOwners: vi.fn(),
    getContainerOwners: vi.fn(),
  },
  usersActions: {
    exportUsers: vi.fn(),
    getUsers: vi.fn(),
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
    Check: Icon,
    ChevronDown: Icon,
    ChevronUp: Icon,
    Download: Icon,
    Eye: Icon,
    Pencil: Icon,
    Plus: Icon,
    RotateCcw: Icon,
    Search: Icon,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock("@/app/partners/vendors/actions", () => vendorsActions);
vi.mock("@/app/partners/material-vendors/actions", () => materialVendorsActions);
vi.mock("@/app/partners/lessee/actions", () => lesseesActions);
vi.mock("@/app/partners/container-owners/actions", () => containerOwnersActions);
vi.mock("@/app/settings/users/actions", () => usersActions);

import { ContainerOwnersDashboard } from "@/components/container-owners/container-owners-dashboard";
import { LesseesDashboard } from "@/components/lessees/lessees-dashboard";
import { MaterialVendorsDashboard } from "@/components/material-vendors/material-vendors-dashboard";
import { UsersDashboard } from "@/components/settings/users-dashboard";
import { VendorsDashboard } from "@/components/vendors/vendors-dashboard";

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

function vendorResult(overrides?: Partial<Parameters<typeof VendorsDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "vendor-1",
        vendor_code: "SABCDE",
        legal_company_name: "Vendor One",
        company_name: "Vendor Alias",
        primary_contact_person: "Alice",
        contact_email: "vendor@example.com",
        contact_tel: "123456",
        status: "Normal",
        region: { id: "region-1", region_code: "China", region_name: "China" },
        country: "China",
        category: "Container",
        assigned_buyer: { id: "user-1", full_name: "Shiyun Pan" },
        bank_account_name: null,
        bank_account_number: null,
        bank_name: null,
        bank_code: null,
        bank_address: null,
        swift_code: null,
        settlement_payment_term: null,
        settlement_credit_days: 30,
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      vendorCode: "",
      legalCompanyName: "",
      regionId: "",
    },
    ...overrides,
  };
}

function materialVendorResult(
  overrides?: Partial<Parameters<typeof MaterialVendorsDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "material-1",
        vendor_code: "DB0001",
        legal_company_name: "Material Vendor One",
        company_name: "Material Alias",
        primary_contact_person: "Bob",
        material_category: "地板",
        contact_email: "material@example.com",
        contact_tel: "234567",
        is_default_vendor: false,
        status: "Normal",
        pic_user: { id: "user-1", full_name: "Shiyun Pan" },
        address: "Address",
        country: "China",
        bank_account_name: null,
        bank_account_number: null,
        bank_name: null,
        bank_code: null,
        bank_address: null,
        swift_code: null,
        settlement_payment_term: null,
        settlement_calculation_method: null,
        settlement_credit_days: 15,
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      vendorCode: "",
      legalCompanyName: "",
      materialCategory: "",
      isDefaultVendor: "",
    },
    ...overrides,
  };
}

function lesseeResult(overrides?: Partial<Parameters<typeof LesseesDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "lessee-1",
        lessee_code: "BABCDE",
        legal_company_name: "Lessee One",
        company_name: "Lessee Alias",
        primary_contact_person: "Carol",
        contact_email: "lessee@example.com",
        contact_tel: "345678",
        status: "Normal",
        region: { id: "region-1", region_code: "China", region_name: "China" },
        country: "China",
        pic_user: { id: "user-1", full_name: "Shiyun Pan" },
        bank_account_name: null,
        bank_account_number: null,
        bank_name: null,
        bank_code: null,
        bank_address: null,
        swift_code: null,
        settlement_payment_term: null,
        settlement_credit_days: 45,
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      lesseeCode: "",
      legalCompanyName: "",
      regionId: "",
    },
    ...overrides,
  };
}

function containerOwnerResult(
  overrides?: Partial<Parameters<typeof ContainerOwnersDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "owner-1",
        container_owner_code: "OABCDE",
        legal_company_name: "Owner One",
        company_name: "Owner Alias",
        primary_contact_person: "David",
        contact_email: "owner@example.com",
        contact_tel: "456789",
        status: "Normal",
        region: { id: "region-1", region_code: "China", region_name: "China" },
        country: "China",
        pic_user: { id: "user-1", full_name: "Shiyun Pan" },
        bank_account_name: null,
        bank_account_number: null,
        bank_name: null,
        bank_code: null,
        bank_address: null,
        swift_code: null,
        settlement_payment_term: null,
        settlement_credit_days: 20,
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 0,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      containerOwnerCode: "",
      legalCompanyName: "",
      regionId: "",
    },
    ...overrides,
  };
}

function usersResult(overrides?: Partial<Parameters<typeof UsersDashboard>[0]["initial"]>) {
  return {
    rows: [
      {
        id: "user-1",
        user_code: "SP0001",
        full_name: "Shiyun Pan",
        email: "shiyun@example.com",
        role: "Admin",
        status: "Active",
        phone: null,
        department: null,
        job_title: null,
        last_login_at: null,
        created_at: "2026-04-01T00:00:00Z",
        updated_at: "2026-04-01T00:00:00Z",
        remarks: null,
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    filters: {
      userCode: "",
      fullName: "",
      role: "",
      status: "",
    },
    ...overrides,
  };
}

describe("Dashboard regression workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("covers vendors search, reset, and export controls", async () => {
    const user = userEvent.setup();
    vendorsActions.getVendors.mockResolvedValueOnce(
      vendorResult({
        rows: [
          { ...vendorResult().rows[0], id: "vendor-2", vendor_code: "SZZ999", legal_company_name: "Filtered Vendor" },
        ],
        filters: { vendorCode: "SZZ999", legalCompanyName: "", regionId: "" },
      })
    );
    vendorsActions.getVendors.mockResolvedValueOnce(vendorResult());
    vendorsActions.exportVendors.mockResolvedValue(vendorResult().rows);

    render(
      <VendorsDashboard
        initial={vendorResult()}
        pageSize={20}
        regionOptions={[{ id: "region-1", region_code: "China", region_name: "China" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/search vendor code/i));
    await user.type(screen.getByPlaceholderText(/search vendor code/i), "SZZ999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenCalledWith({
        vendorCode: "SZZ999",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Vendor")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(vendorsActions.getVendors).toHaveBeenLastCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search vendor code/i)).toHaveValue("")
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => expect(vendorsActions.exportVendors).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers material vendors search, reset, and export controls", async () => {
    const user = userEvent.setup();
    materialVendorsActions.getMaterialVendors.mockResolvedValueOnce(
      materialVendorResult({
        rows: [
          {
            ...materialVendorResult().rows[0],
            id: "material-2",
            vendor_code: "DB9999",
            legal_company_name: "Filtered Material Vendor",
          },
        ],
        filters: {
          vendorCode: "DB9999",
          legalCompanyName: "",
          materialCategory: "",
          isDefaultVendor: "",
        },
      })
    );
    materialVendorsActions.getMaterialVendors.mockResolvedValueOnce(materialVendorResult());
    materialVendorsActions.exportMaterialVendors.mockResolvedValue(materialVendorResult().rows);

    render(<MaterialVendorsDashboard initial={materialVendorResult()} pageSize={20} />);

    await user.clear(screen.getByPlaceholderText(/search vendor code/i));
    await user.type(screen.getByPlaceholderText(/search vendor code/i), "DB9999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(materialVendorsActions.getMaterialVendors).toHaveBeenCalledWith({
        vendorCode: "DB9999",
        legalCompanyName: "",
        materialCategory: "",
        isDefaultVendor: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Material Vendor")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(materialVendorsActions.getMaterialVendors).toHaveBeenLastCalledWith({
        vendorCode: "",
        legalCompanyName: "",
        materialCategory: "",
        isDefaultVendor: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() =>
      expect(materialVendorsActions.exportMaterialVendors).toHaveBeenCalled()
    );
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers lessees search, reset, and export controls", async () => {
    const user = userEvent.setup();
    lesseesActions.getLessees.mockResolvedValueOnce(
      lesseeResult({
        rows: [
          {
            ...lesseeResult().rows[0],
            id: "lessee-2",
            lessee_code: "BZZ999",
            legal_company_name: "Filtered Lessee",
          },
        ],
        filters: {
          lesseeCode: "BZZ999",
          legalCompanyName: "",
          regionId: "",
        },
      })
    );
    lesseesActions.getLessees.mockResolvedValueOnce(lesseeResult());
    lesseesActions.exportLessees.mockResolvedValue(lesseeResult().rows);

    render(
      <LesseesDashboard
        initial={lesseeResult()}
        pageSize={20}
        regionOptions={[{ id: "region-1", region_code: "China", region_name: "China" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/search lessee code/i));
    await user.type(screen.getByPlaceholderText(/search lessee code/i), "BZZ999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(lesseesActions.getLessees).toHaveBeenCalledWith({
        lesseeCode: "BZZ999",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Lessee")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(lesseesActions.getLessees).toHaveBeenLastCalledWith({
        lesseeCode: "",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => expect(lesseesActions.exportLessees).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers container owners search, reset, and export controls", async () => {
    const user = userEvent.setup();
    containerOwnersActions.getContainerOwners.mockResolvedValueOnce(
      containerOwnerResult({
        rows: [
          {
            ...containerOwnerResult().rows[0],
            id: "owner-2",
            container_owner_code: "OZZ999",
            legal_company_name: "Filtered Owner",
          },
        ],
        filters: {
          containerOwnerCode: "OZZ999",
          legalCompanyName: "",
          regionId: "",
        },
      })
    );
    containerOwnersActions.getContainerOwners.mockResolvedValueOnce(containerOwnerResult());
    containerOwnersActions.exportContainerOwners.mockResolvedValue(
      containerOwnerResult().rows
    );

    render(
      <ContainerOwnersDashboard
        initial={containerOwnerResult()}
        pageSize={20}
        regionOptions={[{ id: "region-1", region_code: "China", region_name: "China" }]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/search owner code/i));
    await user.type(screen.getByPlaceholderText(/search owner code/i), "OZZ999");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(containerOwnersActions.getContainerOwners).toHaveBeenCalledWith({
        containerOwnerCode: "OZZ999",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered Owner")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(containerOwnersActions.getContainerOwners).toHaveBeenLastCalledWith({
        containerOwnerCode: "",
        legalCompanyName: "",
        regionId: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() =>
      expect(containerOwnersActions.exportContainerOwners).toHaveBeenCalled()
    );
    expect(anchorClick).toHaveBeenCalled();
  });

  it("covers user management search, reset, and export controls", async () => {
    const user = userEvent.setup();
    usersActions.getUsers.mockResolvedValueOnce(
      usersResult({
        rows: [
          {
            ...usersResult().rows[0],
            id: "user-2",
            user_code: "QA9999",
            full_name: "Filtered User",
          },
        ],
        filters: {
          userCode: "",
          fullName: "Filtered User",
          role: "",
          status: "",
        },
      })
    );
    usersActions.getUsers.mockResolvedValueOnce(usersResult());
    usersActions.exportUsers.mockResolvedValue(usersResult().rows);

    render(
      <UsersDashboard
        initial={usersResult()}
        pageSize={20}
        roleOptions={["Admin", "Sales", "Operations"]}
        statusOptions={["Active", "Inactive"]}
      />
    );

    await user.clear(screen.getByPlaceholderText(/search full name/i));
    await user.type(screen.getByPlaceholderText(/search full name/i), "Filtered User");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(usersActions.getUsers).toHaveBeenCalledWith({
        userCode: "",
        fullName: "Filtered User",
        role: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );
    expect(await screen.findByText("Filtered User")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() =>
      expect(usersActions.getUsers).toHaveBeenLastCalledWith({
        userCode: "",
        fullName: "",
        role: "",
        status: "",
        page: 1,
        pageSize: 20,
      })
    );

    await user.click(screen.getByRole("button", { name: /export csv/i }));
    await waitFor(() => expect(usersActions.exportUsers).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });
});
