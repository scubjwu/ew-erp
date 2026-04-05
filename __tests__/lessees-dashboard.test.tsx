import type { MouseEvent, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { lesseesActions, toast, anchorClick } = vi.hoisted(() => ({
  lesseesActions: {
    exportLessees: vi.fn(),
    getLessees: vi.fn(),
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

vi.mock("@/app/partners/lessee/actions", () => lesseesActions);

import { LesseesDashboard } from "@/components/lessees/lessees-dashboard";

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

function lesseeResult(
  overrides?: Partial<Parameters<typeof LesseesDashboard>[0]["initial"]>
) {
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
        settlement_credit_days: 45,
        settlement_advance_payment_percentage: 0,
        settlement_balance_trigger_event: null,
        settlement_currency: "USD",
        settlement_prepayment_pool: false,
        settlement_prepayment_threshold: 0,
        settlement_current_prepaid_balance: 800,
        remark: null,
        attachment_links: [],
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 10,
    filters: {
      lesseeCode: "",
      legalCompanyName: "",
      regionQuery: "",
      selectedRegionId: "",
    },
    sort: {
      sortBy: "lesseeCode",
      sortDirection: "asc",
    },
    ...overrides,
  };
}

const filterOptions = {
  lesseeCodes: [{ value: "BABCDE", label: "BABCDE", secondaryLabel: "Lessee One", searchText: "BABCDE Lessee One" }],
  legalCompanyNames: [{ value: "Lessee One", label: "Lessee One", secondaryLabel: "Lessee Alias", searchText: "Lessee One Lessee Alias" }],
  regions: [
    { value: "region-1", label: "CN", secondaryLabel: "China", searchText: "CN China" },
    { value: "region-2", label: "US", secondaryLabel: "United States", searchText: "US United States" },
  ],
};

describe("LesseesDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installDownloadMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("supports region candidate selection and fuzzy fallback", async () => {
    const user = userEvent.setup();
    lesseesActions.getLessees.mockResolvedValueOnce(
      lesseeResult({
        filters: {
          lesseeCode: "",
          legalCompanyName: "",
          regionQuery: "CN",
          selectedRegionId: "region-1",
        },
      })
    );
    lesseesActions.getLessees.mockResolvedValueOnce(
      lesseeResult({
        filters: {
          lesseeCode: "",
          legalCompanyName: "",
          regionQuery: "Chi",
          selectedRegionId: "",
        },
      })
    );

    render(
      <LesseesDashboard
        initial={lesseeResult()}
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
      expect(lesseesActions.getLessees).toHaveBeenCalledWith({
        lesseeCode: "",
        legalCompanyName: "",
        regionQuery: "CN",
        selectedRegionId: "region-1",
        sortBy: "lesseeCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );

    await user.clear(regionInput);
    await user.type(regionInput, "Chi");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(lesseesActions.getLessees).toHaveBeenLastCalledWith({
        lesseeCode: "",
        legalCompanyName: "",
        regionQuery: "Chi",
        selectedRegionId: "",
        sortBy: "lesseeCode",
        sortDirection: "asc",
        page: 1,
        pageSize: 10,
      })
    );
  });

  it("sorts visible columns and exports with applied sort", async () => {
    const user = userEvent.setup();
    lesseesActions.getLessees.mockResolvedValueOnce(
      lesseeResult({
        sort: { sortBy: "currentPrepaidBalance", sortDirection: "asc" },
      })
    );
    lesseesActions.exportLessees.mockResolvedValue(lesseeResult().rows);

    render(
      <LesseesDashboard
        initial={lesseeResult()}
        pageSize={10}
        filterOptions={filterOptions}
        regionOptions={[]}
      />
    );

    await user.click(screen.getByRole("button", { name: /Current Prepaid Balance/i }));
    await waitFor(() =>
      expect(lesseesActions.getLessees).toHaveBeenCalledWith({
        lesseeCode: "",
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
    await waitFor(() => expect(lesseesActions.exportLessees).toHaveBeenCalled());
    expect(anchorClick).toHaveBeenCalled();
  });
});
