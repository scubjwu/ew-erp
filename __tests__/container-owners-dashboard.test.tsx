import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { containerOwnersActions, toast, anchorClick } = vi.hoisted(() => ({
  containerOwnersActions: {
    exportContainerOwners: vi.fn(),
    getContainerOwners: vi.fn(),
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
    ArrowUp: Icon,
    ArrowUpDown: Icon,
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

vi.mock("@/app/partners/container-owners/actions", () => containerOwnersActions);

import { ContainerOwnersDashboard } from "@/components/container-owners/container-owners-dashboard";

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

function ownerResult(
  overrides?: Partial<Parameters<typeof ContainerOwnersDashboard>[0]["initial"]>
) {
  return {
    rows: [
      {
        id: "owner-1",
        container_owner_code: "OABCDE",
        legal_company_name: "Owner One",
        company_name: "Owner Alias",
        uses_internal_container_numbering: false,
        primary_contact_person: "David",
        contact_email: "owner@example.com",
        contact_tel: "456789",
        status: "Normal",
        region: { id: "region-1", region_code: "CN", region_name: "China" },
        country: "China",
        pic_user_id: "user-1",
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
        settlement_current_prepaid_balance: 500,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      containerOwnerCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
    },
    sort: {
      sortBy: "containerOwnerCode",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  containerOwnerCodes: [{ value: "OABCDE", label: "OABCDE", secondaryLabel: "Owner One", searchText: "OABCDE Owner One" }],
  legalCompanyNames: [{ value: "Owner One", label: "Owner One", secondaryLabel: "Owner Alias", searchText: "Owner One Owner Alias" }],
  regions: [
    { value: "region-1", label: "CN", secondaryLabel: "China", searchText: "CN China" },
    { value: "region-2", label: "US", secondaryLabel: "United States", searchText: "US United States" },
  ],
};

describe("ContainerOwnersDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses selectedRegionId when a region candidate is chosen and clears it after editing", async () => {
    const user = userEvent.setup();
    containerOwnersActions.getContainerOwners.mockResolvedValueOnce(
      ownerResult({
        filters: {
          containerOwnerCode: "",
          legalCompanyName: "",
          regionQuery: "CN",
          selectedRegionId: "region-1",
        },
      })
    );
    containerOwnersActions.getContainerOwners.mockResolvedValueOnce(
      ownerResult({
        filters: {
          containerOwnerCode: "",
          legalCompanyName: "",
          regionQuery: "Chi",
          selectedRegionId: "",
        },
      })
    );

    render(
      <ContainerOwnersDashboard
        initial={ownerResult()}
        pageSize={10}
        filterOptions={filterOptions}
        regionOptions={[]}
      />
    );

    const regionInput = screen.getByRole("combobox", { name: "Region" });
    await user.click(regionInput);
    await user.type(regionInput, "CN");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(containerOwnersActions.getContainerOwners).toHaveBeenCalledWith({
        containerOwnerCode: "",
        legalCompanyName: "",
        regionQuery: "CN",
        selectedRegionId: "region-1",
        sortBy: "containerOwnerCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.clear(regionInput);
    await user.type(regionInput, "Chi");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(containerOwnersActions.getContainerOwners).toHaveBeenLastCalledWith({
        containerOwnerCode: "",
        legalCompanyName: "",
        regionQuery: "Chi",
        selectedRegionId: "",
        sortBy: "containerOwnerCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("exports with applied sort", async () => {
    const user = userEvent.setup();
    containerOwnersActions.getContainerOwners.mockResolvedValueOnce(
      ownerResult({
        sort: { sortBy: "currentPrepaidBalance", sortDirection: "asc" },
      })
    );
    containerOwnersActions.exportContainerOwners.mockResolvedValue(ownerResult().rows);

    render(
      <ContainerOwnersDashboard
        initial={ownerResult()}
        pageSize={10}
        filterOptions={filterOptions}
        regionOptions={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: /Current Prepaid Balance/i }));
    await waitFor(() =>
      expect(containerOwnersActions.getContainerOwners).toHaveBeenCalledWith({
        containerOwnerCode: "",
        legalCompanyName: "",
        regionQuery: "",
        selectedRegionId: "",
        sortBy: "currentPrepaidBalance",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.click(screen.getByRole("button", { name: /Export CSV/i }));
    await waitFor(() => expect(containerOwnersActions.exportContainerOwners).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });
});
